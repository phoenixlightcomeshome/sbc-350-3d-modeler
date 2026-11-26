/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ValidationSeverity = 'FAIL' | 'DISCREPANCY';

export interface ValidationIssue {
  table: string;
  field: string;
  expected: string;
  actual: string;
  severity: ValidationSeverity;
  message: string;
  requiresRayRuling?: boolean;
}

export interface DisplacementCheckResult {
  boreIn: number | null;
  strokeIn: number | null;
  cylinders: number | null;
  recomputedCid: number | null;
  reportedCid: number | null;
  toleranceCid: number;
  withinTolerance: boolean;
}

export interface BaseTqDiscrepancyRecord {
  table: string;
  field: string;
  valueFound: number;
  referenceValue: number;
  note: string;
}

export interface ValidationReport {
  passed: boolean;
  totalIssues: number;
  failureCount: number;
  discrepancyCount: number;
  displacement: DisplacementCheckResult;
  baseTqDiscrepancies: BaseTqDiscrepancyRecord[];
  issues: ValidationIssue[];
}

export interface SourcedRecordLike {
  id?: string;
  label?: string;
  source?: string;
  sourceRef?: string;
  confidence?: string;
  statusFlag?: string;
  notes?: string;
  additionalNotes?: string;
  isEstimate?: boolean;
  needsMeasurement?: boolean;
  values?: Record<string, unknown>;
}

export interface EngineDataTableInput {
  tableName?: string;
  boreIn?: number;
  strokeIn?: number;
  cylinders?: number;
  displacementCid?: number;
  carbHp?: number;
  carbTq?: number;
  baseTq?: number;
  mpfiHp?: number;
  mpfiTq?: number;
  source?: string;
  sourceRef?: string;
  records?: SourcedRecordLike[];
}

export interface ManufacturingMatrixTableInput {
  tableName?: string;
  source?: string;
  sourceRef?: string;
  baseTq?: number;
  carbHp?: number;
  carbTq?: number;
  mpfiHp?: number;
  mpfiTq?: number;
  rows?: SourcedRecordLike[];
}

export interface TechDrawingsCatalogTableInput {
  tableName?: string;
  source?: string;
  sourceRef?: string;
  baseTq?: number;
  carbHp?: number;
  carbTq?: number;
  mpfiHp?: number;
  mpfiTq?: number;
  sheets?: SourcedRecordLike[];
  callouts?: SourcedRecordLike[];
}

export interface AerospaceMatrixTableInput {
  tableName?: string;
  source?: string;
  sourceRef?: string;
  materials?: SourcedRecordLike[];
  processes?: SourcedRecordLike[];
  standards?: SourcedRecordLike[];
  flags?: SourcedRecordLike[];
}

export interface ValidationTablesInput {
  displacementToleranceCid?: number;
  engineData?: EngineDataTableInput;
  manufacturingMatrix?: ManufacturingMatrixTableInput;
  techDrawingsCatalog?: TechDrawingsCatalogTableInput;
  aerospaceMatrix?: AerospaceMatrixTableInput;
}

export const BASELINE_CONSTANTS = {
  expectedBoreIn: 4.0,
  expectedStrokeIn: 3.48,
  expectedCylinders: 8,
  expectedDisplacementCid: 349.85,
  defaultDisplacementToleranceCid: 0.05,
  expectedCarbHp: 385,
  expectedCarbTq: 414,
  expectedMpfiHp: 408,
  expectedMpfiTq: 431
} as const;

const FLAG_PATTERNS: RegExp[] = [
  /\[ESTIMATE\]/i,
  /\[EST\]/i,
  /\bESTIMATE\b/i,
  /NEEDS\s+RAY'?S?\s+MEASUREMENT/i,
  /\[NEEDS_MEASUREMENT\]/i,
  /\[VENDOR_CLAIM\]/i,
  /\bVENDOR_CLAIM\b/i
];

function hasNonEmptyCitation(rec: { source?: unknown; sourceRef?: unknown }): boolean {
  const s1 = typeof rec.source === 'string' ? rec.source.trim() : '';
  const s2 = typeof rec.sourceRef === 'string' ? rec.sourceRef.trim() : '';
  return s1.length > 0 || s2.length > 0;
}

function textContainsAccuracyFlag(text: string): boolean {
  return FLAG_PATTERNS.some((re) => re.test(text));
}

function collectTextBlob(rec: SourcedRecordLike): string {
  const parts: string[] = [];
  if (typeof rec.confidence === 'string') parts.push(rec.confidence);
  if (typeof rec.statusFlag === 'string') parts.push(rec.statusFlag);
  if (typeof rec.notes === 'string') parts.push(rec.notes);
  if (typeof rec.additionalNotes === 'string') parts.push(rec.additionalNotes);
  if (rec.values && typeof rec.values === 'object') {
    for (const v of Object.values(rec.values)) {
      if (v !== undefined && v !== null) parts.push(String(v));
    }
  }
  return parts.join(' | ');
}

function checkRecordCitationsAndFlags(
  table: string,
  records: SourcedRecordLike[] | undefined,
  prefix: string,
  issues: ValidationIssue[]
): void {
  if (!Array.isArray(records)) return;
  records.forEach((rec, idx) => {
    const recId = rec.id ?? rec.label ?? `${prefix}[${idx}]`;
    if (!hasNonEmptyCitation(rec)) {
      issues.push({
        table,
        field: `${recId}.sourceRef`,
        expected: 'Non-empty source or sourceRef citation',
        actual: 'Missing or blank citation',
        severity: 'FAIL',
        message: `Record "${recId}" in ${table} lacks a source/sourceRef citation.`
      });
    }

    const blob = collectTextBlob(rec);
    const explicitlyMarkedEstimate =
      rec.isEstimate === true ||
      rec.needsMeasurement === true ||
      /\b(est|estimate|estimated|vendor|claim|approx|typical|unverified)\b/i.test(blob);

    if (explicitlyMarkedEstimate && !textContainsAccuracyFlag(blob)) {
      issues.push({
        table,
        field: `${recId}.flag`,
        expected: '[ESTIMATE], [VENDOR_CLAIM], or NEEDING RAY\'S MEASUREMENT flag',
        actual: blob || 'Unflagged estimate/unverified value',
        severity: 'FAIL',
        message: `Record "${recId}" in ${table} contains estimate/unverified language without an explicit [ESTIMATE], [VENDOR_CLAIM], or NEEDING RAY'S MEASUREMENT flag.`
      });
    }
  });
}

function checkBaselineHpTqAndBaseTq(
  table: string,
  obj:
    | {
        carbHp?: number;
        carbTq?: number;
        baseTq?: number;
        mpfiHp?: number;
        mpfiTq?: number;
      }
    | undefined,
  issues: ValidationIssue[],
  baseTqDiscrepancies: BaseTqDiscrepancyRecord[]
): void {
  if (!obj) return;

  if (obj.carbHp !== undefined) {
    if (obj.carbHp !== BASELINE_CONSTANTS.expectedCarbHp) {
      issues.push({
        table,
        field: 'carbHp',
        expected: String(BASELINE_CONSTANTS.expectedCarbHp),
        actual: String(obj.carbHp),
        severity: 'FAIL',
        message: `${table} carbHp is ${obj.carbHp}; expected baseline ${BASELINE_CONSTANTS.expectedCarbHp} HP.`
      });
    }
  }

  if (obj.carbTq !== undefined) {
    if (obj.carbTq === 415) {
      const note =
        'baseTq/carbTq value is 415 vs baseline 414; recorded as a DISCREPANCY for Ray to rule — value was NOT altered.';
      baseTqDiscrepancies.push({
        table,
        field: 'carbTq',
        valueFound: 415,
        referenceValue: BASELINE_CONSTANTS.expectedCarbTq,
        note
      });
      issues.push({
        table,
        field: 'carbTq',
        expected: String(BASELINE_CONSTANTS.expectedCarbTq),
        actual: '415',
        severity: 'DISCREPANCY',
        requiresRayRuling: true,
        message: `${table}.carbTq has 415 vs baseline 414 — flagged for Ray's ruling without silent correction.`
      });
    } else if (obj.carbTq !== BASELINE_CONSTANTS.expectedCarbTq) {
      issues.push({
        table,
        field: 'carbTq',
        expected: String(BASELINE_CONSTANTS.expectedCarbTq),
        actual: String(obj.carbTq),
        severity: 'FAIL',
        message: `${table} carbTq is ${obj.carbTq}; expected baseline ${BASELINE_CONSTANTS.expectedCarbTq} TQ.`
      });
    }
  }

  if (obj.baseTq !== undefined) {
    if (obj.baseTq === 415) {
      const note =
        'baseTq is 415 vs baseline 414; recorded as a DISCREPANCY for Ray to rule — value was NOT altered.';
      baseTqDiscrepancies.push({
        table,
        field: 'baseTq',
        valueFound: 415,
        referenceValue: BASELINE_CONSTANTS.expectedCarbTq,
        note
      });
      issues.push({
        table,
        field: 'baseTq',
        expected: String(BASELINE_CONSTANTS.expectedCarbTq),
        actual: '415',
        severity: 'DISCREPANCY',
        requiresRayRuling: true,
        message: `${table}.baseTq is 415 vs baseline 414 — flagged for Ray's ruling without silent correction.`
      });
    } else if (obj.baseTq !== BASELINE_CONSTANTS.expectedCarbTq) {
      issues.push({
        table,
        field: 'baseTq',
        expected: String(BASELINE_CONSTANTS.expectedCarbTq),
        actual: String(obj.baseTq),
        severity: 'FAIL',
        message: `${table} baseTq is ${obj.baseTq}; expected ${BASELINE_CONSTANTS.expectedCarbTq}.`
      });
    }
  }

  if (obj.mpfiHp !== undefined && obj.mpfiHp !== BASELINE_CONSTANTS.expectedMpfiHp) {
    issues.push({
      table,
      field: 'mpfiHp',
      expected: String(BASELINE_CONSTANTS.expectedMpfiHp),
      actual: String(obj.mpfiHp),
      severity: 'FAIL',
      message: `${table} mpfiHp is ${obj.mpfiHp}; expected baseline ${BASELINE_CONSTANTS.expectedMpfiHp} HP.`
    });
  }

  if (obj.mpfiTq !== undefined && obj.mpfiTq !== BASELINE_CONSTANTS.expectedMpfiTq) {
    issues.push({
      table,
      field: 'mpfiTq',
      expected: String(BASELINE_CONSTANTS.expectedMpfiTq),
      actual: String(obj.mpfiTq),
      severity: 'FAIL',
      message: `${table} mpfiTq is ${obj.mpfiTq}; expected baseline ${BASELINE_CONSTANTS.expectedMpfiTq} TQ.`
    });
  }
}

export function computeDisplacementCid(
  boreIn: number,
  strokeIn: number,
  cylinders: number
): number {
  const raw = (Math.PI / 4) * boreIn * boreIn * strokeIn * cylinders;
  return Number(raw.toFixed(2));
}

export function validateEngineData(
  engineData: EngineDataTableInput | undefined,
  toleranceCid: number = BASELINE_CONSTANTS.defaultDisplacementToleranceCid
): {
  issues: ValidationIssue[];
  displacement: DisplacementCheckResult;
  baseTqDiscrepancies: BaseTqDiscrepancyRecord[];
} {
  const table = engineData?.tableName ?? 'engineData';
  const issues: ValidationIssue[] = [];
  const baseTqDiscrepancies: BaseTqDiscrepancyRecord[] = [];

  if (!engineData) {
    issues.push({
      table,
      field: 'engineData',
      expected: 'Present engineData table',
      actual: 'Missing',
      severity: 'FAIL',
      message: 'engineData table is missing; no default values invented.'
    });
    return {
      issues,
      displacement: {
        boreIn: null,
        strokeIn: null,
        cylinders: null,
        recomputedCid: null,
        reportedCid: null,
        toleranceCid,
        withinTolerance: false
      },
      baseTqDiscrepancies
    };
  }

  if (!hasNonEmptyCitation(engineData)) {
    issues.push({
      table,
      field: 'sourceRef',
      expected: 'Non-empty table source or sourceRef',
      actual: 'Missing',
      severity: 'FAIL',
      message: `${table} is missing a top-level source/sourceRef citation.`
    });
  }

  const boreIn = typeof engineData.boreIn === 'number' ? engineData.boreIn : null;
  const strokeIn = typeof engineData.strokeIn === 'number' ? engineData.strokeIn : null;
  const cylinders = typeof engineData.cylinders === 'number' ? engineData.cylinders : null;
  const reportedCid =
    typeof engineData.displacementCid === 'number' ? engineData.displacementCid : null;

  let recomputedCid: number | null = null;
  let withinTolerance = false;

  if (boreIn === null || strokeIn === null || cylinders === null) {
    issues.push({
      table,
      field: 'displacementInputs',
      expected: `boreIn (${BASELINE_CONSTANTS.expectedBoreIn}), strokeIn (${BASELINE_CONSTANTS.expectedStrokeIn}), cylinders (${BASELINE_CONSTANTS.expectedCylinders})`,
      actual: `boreIn=${boreIn}, strokeIn=${strokeIn}, cylinders=${cylinders}`,
      severity: 'FAIL',
      message: `${table} is missing bore, stroke, or cylinder count required to recompute CID.`
    });
  } else {
    recomputedCid = computeDisplacementCid(boreIn, strokeIn, cylinders);
    if (reportedCid === null) {
      issues.push({
        table,
        field: 'displacementCid',
        expected: `${recomputedCid.toFixed(2)} CID`,
        actual: 'Missing',
        severity: 'FAIL',
        message: `${table} is missing reported displacementCid (recomputed: ${recomputedCid.toFixed(2)} CID).`
      });
    } else {
      const diff = Math.abs(recomputedCid - reportedCid);
      withinTolerance = diff <= toleranceCid;
      if (!withinTolerance) {
        issues.push({
          table,
          field: 'displacementCid',
          expected: `${recomputedCid.toFixed(2)} CID (±${toleranceCid} CID tolerance; reference ${BASELINE_CONSTANTS.expectedDisplacementCid.toFixed(2)} CID)`,
          actual: `${reportedCid.toFixed(2)} CID (diff ${diff.toFixed(4)} CID)`,
          severity: 'FAIL',
          message: `${table} displacementCid ${reportedCid} differs from recomputed ${recomputedCid.toFixed(2)} CID beyond ${toleranceCid} CID tolerance.`
        });
      }
    }
  }

  checkBaselineHpTqAndBaseTq(table, engineData, issues, baseTqDiscrepancies);
  checkRecordCitationsAndFlags(table, engineData.records, 'record', issues);

  return {
    issues,
    displacement: {
      boreIn,
      strokeIn,
      cylinders,
      recomputedCid,
      reportedCid,
      toleranceCid,
      withinTolerance
    },
    baseTqDiscrepancies
  };
}

export function validateManufacturingMatrix(
  matrix: ManufacturingMatrixTableInput | undefined,
  issuesOut: ValidationIssue[],
  discrepanciesOut: BaseTqDiscrepancyRecord[]
): void {
  const table = matrix?.tableName ?? 'manufacturingMatrix';
  if (!matrix) {
    issuesOut.push({
      table,
      field: 'manufacturingMatrix',
      expected: 'Present manufacturingMatrix table',
      actual: 'Missing',
      severity: 'FAIL',
      message: 'manufacturingMatrix table is missing; no default values invented.'
    });
    return;
  }

  if (!hasNonEmptyCitation(matrix)) {
    issuesOut.push({
      table,
      field: 'sourceRef',
      expected: 'Non-empty table source or sourceRef',
      actual: 'Missing',
      severity: 'FAIL',
      message: `${table} is missing a top-level source/sourceRef citation.`
    });
  }

  checkBaselineHpTqAndBaseTq(table, matrix, issuesOut, discrepanciesOut);
  checkRecordCitationsAndFlags(table, matrix.rows, 'row', issuesOut);
}

export function validateTechDrawingsCatalog(
  catalog: TechDrawingsCatalogTableInput | undefined,
  issuesOut: ValidationIssue[],
  discrepanciesOut: BaseTqDiscrepancyRecord[]
): void {
  const table = catalog?.tableName ?? 'techDrawingsCatalog';
  if (!catalog) {
    issuesOut.push({
      table,
      field: 'techDrawingsCatalog',
      expected: 'Present techDrawingsCatalog table',
      actual: 'Missing',
      severity: 'FAIL',
      message: 'techDrawingsCatalog table is missing; no default values invented.'
    });
    return;
  }

  if (!hasNonEmptyCitation(catalog)) {
    issuesOut.push({
      table,
      field: 'sourceRef',
      expected: 'Non-empty table source or sourceRef',
      actual: 'Missing',
      severity: 'FAIL',
      message: `${table} is missing a top-level source/sourceRef citation.`
    });
  }

  checkBaselineHpTqAndBaseTq(table, catalog, issuesOut, discrepanciesOut);
  checkRecordCitationsAndFlags(table, catalog.sheets, 'sheet', issuesOut);
  checkRecordCitationsAndFlags(table, catalog.callouts, 'callout', issuesOut);
}

export function validateAerospaceMatrix(
  aero: AerospaceMatrixTableInput | undefined,
  issuesOut: ValidationIssue[]
): void {
  const table = aero?.tableName ?? 'aerospaceMatrix';
  if (!aero) {
    issuesOut.push({
      table,
      field: 'aerospaceMatrix',
      expected: 'Present aerospaceMatrix table',
      actual: 'Missing',
      severity: 'FAIL',
      message: 'aerospaceMatrix table is missing; no default values invented.'
    });
    return;
  }

  if (!hasNonEmptyCitation(aero)) {
    issuesOut.push({
      table,
      field: 'sourceRef',
      expected: 'Non-empty table source or sourceRef',
      actual: 'Missing',
      severity: 'FAIL',
      message: `${table} is missing a top-level source/sourceRef citation.`
    });
  }

  checkRecordCitationsAndFlags(table, aero.materials, 'material', issuesOut);
  checkRecordCitationsAndFlags(table, aero.processes, 'process', issuesOut);
  checkRecordCitationsAndFlags(table, aero.standards, 'standard', issuesOut);
  checkRecordCitationsAndFlags(table, aero.flags, 'flag', issuesOut);
}

export function validateAll(tables: ValidationTablesInput): ValidationReport {
  const toleranceCid =
    typeof tables.displacementToleranceCid === 'number' &&
    Number.isFinite(tables.displacementToleranceCid) &&
    tables.displacementToleranceCid >= 0
      ? tables.displacementToleranceCid
      : BASELINE_CONSTANTS.defaultDisplacementToleranceCid;

  const issues: ValidationIssue[] = [];
  const baseTqDiscrepancies: BaseTqDiscrepancyRecord[] = [];

  const engineResult = validateEngineData(tables.engineData, toleranceCid);
  issues.push(...engineResult.issues);
  baseTqDiscrepancies.push(...engineResult.baseTqDiscrepancies);

  validateManufacturingMatrix(tables.manufacturingMatrix, issues, baseTqDiscrepancies);
  validateTechDrawingsCatalog(tables.techDrawingsCatalog, issues, baseTqDiscrepancies);
  validateAerospaceMatrix(tables.aerospaceMatrix, issues);

  const failureCount = issues.filter((i) => i.severity === 'FAIL').length;
  const discrepancyCount = issues.filter((i) => i.severity === 'DISCREPANCY').length;

  return {
    passed: failureCount === 0 && discrepancyCount === 0,
    totalIssues: issues.length,
    failureCount,
    discrepancyCount,
    displacement: engineResult.displacement,
    baseTqDiscrepancies,
    issues
  };
}

export function formatValidationReport(report: ValidationReport): string {
  const lines: string[] = [
    `Status: ${report.passed ? 'PASS' : 'FAIL / ACTION REQUIRED'}`,
    `Summary: totalIssues=${report.totalIssues}, failures=${report.failureCount}, discrepancies=${report.discrepancyCount}`,
    `Displacement: recomputed=${report.displacement.recomputedCid ?? 'N/A'} CID, reported=${report.displacement.reportedCid ?? 'N/A'} CID, tolerance=±${report.displacement.toleranceCid} CID, withinTolerance=${report.displacement.withinTolerance}`
  ];

  if (report.baseTqDiscrepancies.length > 0) {
    lines.push('BaseTq Discrepancies (Ray ruling required — values not altered):');
    for (const d of report.baseTqDiscrepancies) {
      lines.push(
        `  - [${d.table}.${d.field}] found=${d.valueFound} vs reference=${d.referenceValue} — ${d.note}`
      );
    }
  }

  if (report.issues.length > 0) {
    lines.push('Issues:');
    for (const item of report.issues) {
      const rulingTag = item.requiresRayRuling ? ' [RAY RULING REQUIRED]' : '';
      lines.push(
        `  - [${item.severity}]${rulingTag} ${item.table}.${item.field}: expected="${item.expected}", actual="${item.actual}" — ${item.message}`
      );
    }
  } else {
    lines.push('Issues: none');
  }

  return lines.join('\n');
}