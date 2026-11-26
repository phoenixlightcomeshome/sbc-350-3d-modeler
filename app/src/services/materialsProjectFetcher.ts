/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type ScreeningConfidence = 'ESTIMATE';

export interface DerivedElasticity {
  bulkModulusGpa: number | null;
  shearModulusGpa: number | null;
  poissonsRatio: number | null;
  poissonsRatioDerived: boolean;
  youngsModulusGpa: number | null;
  youngsModulusDerived: boolean;
  derivationNote: string;
}

export interface ScreenedMaterialRecord {
  material_id: string;
  formulaPretty: string | null;
  densityGCm3: number | null;
  elasticity: DerivedElasticity;
  confidence: ScreeningConfidence;
  screeningDisclaimer: string;
  source: string;
  retrievedAt: string;
}

export interface MaterialsProjectFetcherOptions {
  /** Environment variable name holding the key from the Secure Vault (default: MATERIALS_PROJECT_API_KEY) */
  apiKeyEnvVar?: string;
  /** Endpoint URL for batch summary queries (default: https://api.materialsproject.org/materials/summary/) */
  endpointUrl?: string;
  /** Maximum material IDs per batch request (default: 50) */
  batchSize?: number;
  /** Cache time-to-live in milliseconds (default: 24 hours) */
  cacheTtlMs?: number;
  /** Optional local JSON file path for persistent server-side caching */
  cacheFilePath?: string;
  /** Optional custom fetch implementation for server/test environments */
  fetchFn?: typeof fetch;
}

export interface FetchMaterialsResult {
  records: ScreenedMaterialRecord[];
  servedFromCache: boolean;
  staleCacheUsed: boolean;
  warnings: string[];
}

interface CacheEntry {
  record: ScreenedMaterialRecord;
  cachedAtMs: number;
}

export class VaultKeyMissingError extends Error {
  constructor(envVar: string) {
    super(
      `Missing Secure Vault API key in environment variable "${envVar}". ` +
        'Load the key via the Secure Vault into the server environment; never hardcode or expose it to the browser.'
    );
    this.name = 'VaultKeyMissingError';
  }
}

export class BrowserExecutionForbiddenError extends Error {
  constructor() {
    super(
      'materialsProjectFetcher.ts is server-side only and cannot execute in a browser context where window/document exist or API keys could be exposed.'
    );
    this.name = 'BrowserExecutionForbiddenError';
  }
}

export class MaterialsProjectAuthError extends Error {
  readonly status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = 'MaterialsProjectAuthError';
    this.status = status;
  }
}

export class MaterialsProjectRateLimitError extends Error {
  readonly retryAfterSeconds: number | null;
  readonly retryAfterGuidance: string;

  constructor(retryAfterSeconds: number | null, detail: string) {
    const guidance =
      retryAfterSeconds !== null
        ? `Rate limited (HTTP 429). Wait at least ${retryAfterSeconds}s per Retry-After header before retrying, batch IDs, and serve cached data.`
        : 'Rate limited (HTTP 429). Back off with exponential delay, batch IDs, and serve cached data; no cached entry was available.';
    super(`${detail} ${guidance}`);
    this.name = 'MaterialsProjectRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
    this.retryAfterGuidance = guidance;
  }
}

export class MaterialsProjectNetworkError extends Error {
  readonly causeDetail: string;
  constructor(causeDetail: string) {
    super(`Network or transport error while querying Materials Project API: ${causeDetail}`);
    this.name = 'MaterialsProjectNetworkError';
    this.causeDetail = causeDetail;
  }
}

const DEFAULT_ENDPOINT = 'https://api.materialsproject.org/materials/summary/';
const DEFAULT_ENV_VAR = 'MATERIALS_PROJECT_API_KEY';
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const SCREENING_DISCLAIMER =
  '[ESTIMATE] Computed/DFT screening data from Materials Project — NOT a certified aerospace or automotive design allowable. Verify against controlled physical test data, AMS/ASTM/SAE standards, and MMPDS.';

function assertServerOnlyRuntime(): void {
  const hasWindow = typeof (globalThis as { window?: unknown }).window !== 'undefined';
  const hasDocument = typeof (globalThis as { document?: unknown }).document !== 'undefined';
  if (hasWindow || hasDocument) {
    throw new BrowserExecutionForbiddenError();
  }
}

function parseRetryAfterSeconds(headerVal: string | null): number | null {
  if (!headerVal) return null;
  const trimmed = headerVal.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  const parsedDateMs = Date.parse(trimmed);
  if (!Number.isNaN(parsedDateMs)) {
    const deltaSec = Math.ceil((parsedDateMs - Date.now()) / 1000);
    return Math.max(0, deltaSec);
  }
  return null;
}

function isFinitePositiveNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val > 0;
}

function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Derives Young's modulus E and (when absent) Poisson's ratio nu from bulk (K) and shear (G) moduli.
 * Formulas:
 *   nu = (3K - 2G) / (2(3K + G))
 *   E  = 9KG / (3K + G)
 * Note: Materials Project summary elasticity fields contain VRH bulk/shear moduli (such as k_vrh / g_vrh);
 * k_vrh is bulk modulus, NOT Young's modulus. Exact schema field names should be confirmed against
 * https://docs.materialsproject.org/ when integrating.
 */
export function deriveElasticityFromBulkAndShear(
  bulkModulusGpa: number | null,
  shearModulusGpa: number | null,
  suppliedPoissonsRatio: number | null
): DerivedElasticity {
  const kValid = isFinitePositiveNumber(bulkModulusGpa);
  const gValid = isFinitePositiveNumber(shearModulusGpa);

  if (!kValid || !gValid) {
    return {
      bulkModulusGpa: kValid ? bulkModulusGpa : null,
      shearModulusGpa: gValid ? shearModulusGpa : null,
      poissonsRatio: isFiniteNumber(suppliedPoissonsRatio) ? suppliedPoissonsRatio : null,
      poissonsRatioDerived: false,
      youngsModulusGpa: null,
      youngsModulusDerived: false,
      derivationNote:
        'Young\'s modulus not derived: valid positive bulk (K) and shear (G) moduli were not both available in response [ESTIMATE screening only; verify against https://docs.materialsproject.org/].'
    };
  }

  const denom = 3 * bulkModulusGpa + shearModulusGpa;
  const derivedNu = (3 * bulkModulusGpa - 2 * shearModulusGpa) / (2 * denom);
  const hasSuppliedNu = isFiniteNumber(suppliedPoissonsRatio);
  const effectiveNu = hasSuppliedNu ? suppliedPoissonsRatio : derivedNu;
  const youngsModulusGpa = (9 * bulkModulusGpa * shearModulusGpa) / denom;

  return {
    bulkModulusGpa,
    shearModulusGpa,
    poissonsRatio: isFiniteNumber(effectiveNu) ? Number(effectiveNu.toFixed(6)) : null,
    poissonsRatioDerived: !hasSuppliedNu && isFiniteNumber(derivedNu),
    youngsModulusGpa: Number(youngsModulusGpa.toFixed(4)),
    youngsModulusDerived: true,
    derivationNote: hasSuppliedNu
      ? 'Young\'s modulus E derived from K and G via E = 9KG / (3K + G) using supplied Poisson\'s ratio [ESTIMATE screening only; k_vrh is bulk modulus, not Young\'s modulus].'
      : 'Young\'s modulus E = 9KG / (3K + G) and Poisson\'s ratio nu = (3K - 2G) / (2(3K + G)) derived from K and G [ESTIMATE screening only; verify exact schema on https://docs.materialsproject.org/].'
  };
}

function extractNumber(obj: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!obj) return null;
  for (const key of keys) {
    const val = obj[key];
    if (isFiniteNumber(val)) return val;
  }
  return null;
}

function normalizeSummaryDoc(raw: unknown, retrievedAt: string): ScreenedMaterialRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const doc = raw as Record<string, unknown>;
  const materialId = typeof doc.material_id === 'string' ? doc.material_id : null;
  if (!materialId) return null;

  const formulaPretty = typeof doc.formula_pretty === 'string' ? doc.formula_pretty : null;
  const densityGCm3 = isFiniteNumber(doc.density) ? doc.density : null;

  // Defensive extraction across possible elasticity sub-object shapes; confirm exact schema in MP docs.
  const elasticityObj =
    doc.elasticity && typeof doc.elasticity === 'object'
      ? (doc.elasticity as Record<string, unknown>)
      : undefined;
  const kVrhObj =
    elasticityObj?.k_vrh && typeof elasticityObj.k_vrh === 'object'
      ? (elasticityObj.k_vrh as Record<string, unknown>)
      : undefined;
  const gVrhObj =
    elasticityObj?.g_vrh && typeof elasticityObj.g_vrh === 'object'
      ? (elasticityObj.g_vrh as Record<string, unknown>)
      : undefined;

  const bulkK =
    extractNumber(kVrhObj, ['value', 'mean', 'k_vrh']) ??
    extractNumber(elasticityObj, ['k_vrh', 'bulk_modulus']);
  const shearG =
    extractNumber(gVrhObj, ['value', 'mean', 'g_vrh']) ??
    extractNumber(elasticityObj, ['g_vrh', 'shear_modulus']);
  const suppliedNu = extractNumber(elasticityObj, [
    'homogeneous_poisson',
    'poisson_ratio',
    'nu'
  ]);

  return {
    material_id: materialId,
    formulaPretty,
    densityGCm3,
    elasticity: deriveElasticityFromBulkAndShear(bulkK, shearG, suppliedNu),
    confidence: 'ESTIMATE',
    screeningDisclaimer: SCREENING_DISCLAIMER,
    source: 'Materials Project API (/materials/summary/ — computed/DFT screening data; https://docs.materialsproject.org/)',
    retrievedAt
  };
}

export class MaterialsProjectFetcher {
  private readonly apiKeyEnvVar: string;
  private readonly endpointUrl: string;
  private readonly batchSize: number;
  private readonly cacheTtlMs: number;
  private readonly cacheFilePath: string | undefined;
  private readonly fetchFn: typeof fetch;
  private readonly memoryCache = new Map<string, CacheEntry>();

  constructor(options: MaterialsProjectFetcherOptions = {}) {
    assertServerOnlyRuntime();

    this.apiKeyEnvVar = options.apiKeyEnvVar ?? DEFAULT_ENV_VAR;
    this.endpointUrl = options.endpointUrl ?? DEFAULT_ENDPOINT;
    this.batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);
    this.cacheTtlMs = Math.max(0, options.cacheTtlMs ?? DEFAULT_TTL_MS);
    this.cacheFilePath = options.cacheFilePath;
    this.fetchFn = options.fetchFn ?? fetch;

    if (this.cacheFilePath) {
      this.loadDiskCacheIntoMemory();
    }
  }

  private getVaultApiKey(): string {
    assertServerOnlyRuntime();
    const envMap = typeof process !== 'undefined' ? process.env : undefined;
    const key = envMap ? envMap[this.apiKeyEnvVar] : undefined;
    if (!key || key.trim().length === 0) {
      throw new VaultKeyMissingError(this.apiKeyEnvVar);
    }
    return key.trim();
  }

  private loadDiskCacheIntoMemory(): void {
    if (!this.cacheFilePath || !existsSync(this.cacheFilePath)) return;
    try {
      const raw = readFileSync(this.cacheFilePath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      for (const [matId, entry] of Object.entries(parsed)) {
        if (entry && entry.record && typeof entry.cachedAtMs === 'number') {
          this.memoryCache.set(matId, entry);
        }
      }
    } catch {
      // Ignore unreadable/corrupt cache file and rebuild cleanly on subsequent writes
    }
  }

  private persistMemoryCacheToDisk(): void {
    if (!this.cacheFilePath) return;
    const dir = dirname(this.cacheFilePath);
    if (dir && dir !== '.' && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const obj: Record<string, CacheEntry> = {};
    for (const [matId, entry] of this.memoryCache.entries()) {
      obj[matId] = entry;
    }
    writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf8');
  }

  private isFresh(entry: CacheEntry, nowMs: number): boolean {
    return nowMs - entry.cachedAtMs <= this.cacheTtlMs;
  }

  private chunkIds(ids: string[]): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += this.batchSize) {
      chunks.push(ids.slice(i, i + this.batchSize));
    }
    return chunks;
  }

  private async fetchBatchPost(batchIds: string[], apiKey: string): Promise<ScreenedMaterialRecord[]> {
    let response: Response;
    try {
      // Batches material_ids in one POST request; verify exact POST body schema against https://docs.materialsproject.org/
      response = await this.fetchFn(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-KEY': apiKey
        },
        body: JSON.stringify({
          material_ids: batchIds,
          fields: ['material_id', 'formula_pretty', 'density', 'elasticity']
        })
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new MaterialsProjectNetworkError(detail);
    }

    if (response.status === 401 || response.status === 403) {
      throw new MaterialsProjectAuthError(
        response.status,
        `Materials Project authentication/authorization failed (HTTP ${response.status}). Verify the key stored in "${this.apiKeyEnvVar}" in the Secure Vault.`
      );
    }

    if (response.status === 429) {
      const retryAfterSec = parseRetryAfterSeconds(response.headers.get('Retry-After'));
      throw new MaterialsProjectRateLimitError(
        retryAfterSec,
        'Materials Project API rate limit exceeded.'
      );
    }

    if (!response.ok) {
      throw new MaterialsProjectNetworkError(
        `Unexpected HTTP ${response.status} (${response.statusText}) from Materials Project API.`
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new MaterialsProjectNetworkError(`Invalid JSON in Materials Project response: ${detail}`);
    }

    const docs =
      payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: unknown[] }).data
        : [];

    const retrievedAt = new Date().toISOString();
    const normalized: ScreenedMaterialRecord[] = [];
    for (const doc of docs) {
      const rec = normalizeSummaryDoc(doc, retrievedAt);
      if (rec) normalized.push(rec);
    }
    return normalized;
  }

  /**
   * Retrieves screening records for requested material IDs using cache-first logic,
   * batching missing/expired IDs into POST /materials/summary requests.
   * On HTTP 429, serves cached entries (even if stale) whenever available; otherwise throws
   * MaterialsProjectRateLimitError with Retry-After guidance.
   */
  async getMaterials(materialIds: string[]): Promise<FetchMaterialsResult> {
    assertServerOnlyRuntime();

    const uniqueIds = Array.from(
      new Set(materialIds.map((id) => id.trim()).filter((id) => id.length > 0))
    );
    if (uniqueIds.length === 0) {
      return {
        records: [],
        servedFromCache: false,
        staleCacheUsed: false,
        warnings: []
      };
    }

    const nowMs = Date.now();
    const cachedRecords = new Map<string, ScreenedMaterialRecord>();
    const idsToFetch: string[] = [];
    let staleCacheUsed = false;

    for (const id of uniqueIds) {
      const existing = this.memoryCache.get(id);
      if (existing && this.isFresh(existing, nowMs)) {
        cachedRecords.set(id, existing.record);
      } else {
        idsToFetch.push(id);
      }
    }

    const warnings: string[] = [];

    if (idsToFetch.length > 0) {
      const apiKey = this.getVaultApiKey();
      const batches = this.chunkIds(idsToFetch);

      for (const batch of batches) {
        try {
          const fetched = await this.fetchBatchPost(batch, apiKey);
          const fetchTimeMs = Date.now();
          for (const rec of fetched) {
            this.memoryCache.set(rec.material_id, { record: rec, cachedAtMs: fetchTimeMs });
            cachedRecords.set(rec.material_id, rec);
          }
          this.persistMemoryCacheToDisk();
        } catch (err) {
          if (err instanceof MaterialsProjectRateLimitError) {
            const fallbackAvailable = batch.some((id) => this.memoryCache.has(id));
            if (fallbackAvailable) {
              staleCacheUsed = true;
              warnings.push(`${err.message} Serving cached entries for available IDs.`);
              for (const id of batch) {
                const fallbackEntry = this.memoryCache.get(id);
                if (fallbackEntry && !cachedRecords.has(id)) {
                  cachedRecords.set(id, fallbackEntry.record);
                }
              }
              continue;
            }
            throw err;
          }
          throw err;
        }
      }
    }

    const orderedRecords: ScreenedMaterialRecord[] = [];
    for (const id of uniqueIds) {
      const rec = cachedRecords.get(id);
      if (rec) orderedRecords.push(rec);
    }

    return {
      records: orderedRecords,
      servedFromCache: idsToFetch.length === 0 || staleCacheUsed,
      staleCacheUsed,
      warnings
    };
  }
}