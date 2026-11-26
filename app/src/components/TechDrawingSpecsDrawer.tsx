/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { TechDrawingSheet, TechDrawingCallout } from '../types/engine';
import { TRANSMISSIONS_DB } from '../data/engineData';
import {
  getTransmissionDrawingSheet,
  A500_42RE_REFERENCE_IMAGE
} from '../data/techDrawingsCatalog';
import {
  FileSpreadsheet,
  Search,
  Upload,
  CheckCircle2,
  ExternalLink,
  X,
  Loader2,
  AlertTriangle,
  Crosshair,
  Image as ImageIcon,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface TechDrawingSpecsDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  domain: 'engine' | 'transmission';
  activeSheet: TechDrawingSheet;
  defaultQuery: string;
  contextSpecs?: Record<string, unknown>;
  onApplySheetTo3D: (sheet: TechDrawingSheet) => void;
  onFocusCalloutIn3D: (callout: TechDrawingCallout, sheet: TechDrawingSheet) => void;
  onResetCustomSheet?: () => void;
  hasCustomApplied?: boolean;
  inlinePanel?: boolean;
}

async function parseApiJson<T>(res: Response, endpointLabel: string): Promise<T> {
  const rawText = await res.text();
  const contentType = res.headers.get('content-type') || '';
  const trimmed = rawText.trim();
  const looksJson =
    contentType.toLowerCase().includes('application/json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[');

  if (!looksJson) {
    throw new Error(
      `Server-only feature (${endpointLabel}) is unavailable in this static build (HTTP ${res.status}). Built-in verified CAD & BOM sheets remain fully functional.`
    );
  }

  let parsed: T & { error?: string };
  try {
    parsed = JSON.parse(rawText) as T & { error?: string };
  } catch {
    throw new Error(
      `Invalid response from ${endpointLabel} (HTTP ${res.status}). Built-in CAD specs remain available.`
    );
  }

  if (!res.ok) {
    throw new Error(parsed.error || `${endpointLabel} failed (${res.status}).`);
  }

  return parsed;
}

export const TechDrawingSpecsDrawer: React.FC<TechDrawingSpecsDrawerProps> = ({
  isOpen = true,
  onClose,
  domain,
  activeSheet,
  defaultQuery,
  contextSpecs,
  onApplySheetTo3D,
  onFocusCalloutIn3D,
  onResetCustomSheet,
  hasCustomApplied = false,
  inlinePanel = false
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(defaultQuery);
  const [rowFilter, setRowFilter] = useState<string>('ALL');
  const [calloutFilter, setCalloutFilter] = useState<string>('');
  const [stagedSheet, setStagedSheet] = useState<TechDrawingSheet | null>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [isParsingDiagram, setIsParsingDiagram] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [previewLightboxUrl, setPreviewLightboxUrl] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState<boolean>(false);
  const [selectedIndexCode, setSelectedIndexCode] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevDomainRef = useRef(domain);
  const prevDrawingNumberRef = useRef(activeSheet.drawingNumber);
  const justCommittedRef = useRef(false);

  // Sync default search query when domain or unit context changes
  useEffect(() => {
    setSearchQuery(defaultQuery);
  }, [defaultQuery]);

  // Reset transient drawer state when switching domain or active sheet externally
  useEffect(() => {
    const domainChanged = prevDomainRef.current !== domain;
    const sheetChanged = prevDrawingNumberRef.current !== activeSheet.drawingNumber;

    if (domainChanged) {
      setStagedSheet(null);
      setRowFilter('ALL');
      setCalloutFilter('');
      setSelectedIndexCode(null);
      setErrorMsg(null);
      setStatusNotice(null);
      setImageLoadFailed(false);
    } else if (sheetChanged) {
      setRowFilter('ALL');
      setCalloutFilter('');
      setSelectedIndexCode(null);
      setImageLoadFailed(false);
      if (justCommittedRef.current) {
        justCommittedRef.current = false;
      } else {
        setStagedSheet(null);
        setErrorMsg(null);
        setStatusNotice(null);
      }
    } else {
      justCommittedRef.current = false;
    }

    prevDomainRef.current = domain;
    prevDrawingNumberRef.current = activeSheet.drawingNumber;
  }, [domain, activeSheet.drawingNumber]);

  // Close lightbox or overlay drawer on Escape key
  useEffect(() => {
    if (!inlinePanel && !isOpen && !previewLightboxUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (previewLightboxUrl) {
        setPreviewLightboxUrl(null);
      } else if (!inlinePanel && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inlinePanel, isOpen, onClose, previewLightboxUrl]);

  const displayedSheet =
    stagedSheet && stagedSheet.domain === domain ? stagedSheet : activeSheet;

  useEffect(() => {
    setImageLoadFailed(false);
  }, [displayedSheet.referenceImageUrl]);

  const rowsAvailable = useMemo(() => {
    const set = new Set<string>();
    displayedSheet.callouts.forEach((c) => {
      if (c.row) set.add(c.row.toUpperCase());
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [displayedSheet]);

  const effectiveRowFilter = rowsAvailable.includes(rowFilter) ? rowFilter : 'ALL';

  const filteredCallouts = useMemo(() => {
    const q = calloutFilter.trim().toLowerCase();
    return displayedSheet.callouts.filter((c) => {
      const matchesRow =
        effectiveRowFilter === 'ALL' || (c.row || '').toUpperCase() === effectiveRowFilter;
      if (!q) return matchesRow;
      return (
        matchesRow &&
        (c.partName.toLowerCase().includes(q) ||
          c.indexCode.toLowerCase().includes(q) ||
          (c.partNumber || '').toLowerCase().includes(q) ||
          (c.clearanceSpec || '').toLowerCase().includes(q) ||
          (c.torqueSpec || '').toLowerCase().includes(q) ||
          (c.material || '').toLowerCase().includes(q) ||
          c.targetSubassembly.toLowerCase().includes(q))
      );
    });
  }, [displayedSheet, effectiveRowFilter, calloutFilter]);

  // Early return MUST appear after all React hooks so opening/closing the drawer never violates hook ordering
  if (!inlinePanel && !isOpen) return null;

  const handleOnlineLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim() || defaultQuery || displayedSheet.title;
    if (!q) return;

    setIsLookingUp(true);
    setErrorMsg(null);
    setStatusNotice(null);

    try {
      const res = await fetch('/api/specs/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          query: q,
          unitName: activeSheet.title,
          contextSpecs
        })
      });

      const payload = await parseApiJson<{ sheet?: TechDrawingSheet; error?: string }>(
        res,
        '/api/specs/lookup'
      );

      if (!payload.sheet || !Array.isArray(payload.sheet.callouts)) {
        throw new Error(payload.error || `Lookup returned incomplete sheet data (${res.status}).`);
      }

      const normalizedSheet: TechDrawingSheet = {
        ...payload.sheet,
        domain: payload.sheet.domain || domain
      };

      setStagedSheet(normalizedSheet);
      setRowFilter('ALL');
      setSelectedIndexCode(null);
      setStatusNotice(
        `Pulled ${normalizedSheet.callouts.length} real-world callouts & specs from online sources. Click "Apply Pulled Specs to 3D Model" to push into the live 3D assembly.`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof TypeError
          ? 'Online spec lookup (/api/specs/lookup) could not reach the backend API server. Built-in verified CAD & BOM sheets remain fully functional.'
          : err instanceof Error
          ? err.message
          : 'Unable to fetch online specifications.';
      setErrorMsg(msg);
    } finally {
      setIsLookingUp(false);
    }
  };

  const parseDiagramDataUrl = async (dataUrl: string, mimeType: string, label: string) => {
    setIsParsingDiagram(true);
    setErrorMsg(null);
    setStatusNotice(null);

    try {
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const res = await fetch('/api/specs/parse-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          imageBase64: base64,
          mimeType,
          unitHint: label
        })
      });

      const payload = await parseApiJson<{ sheet?: TechDrawingSheet; error?: string }>(
        res,
        '/api/specs/parse-diagram'
      );

      if (!payload.sheet || !Array.isArray(payload.sheet.callouts)) {
        throw new Error(payload.error || `Diagram extraction failed (${res.status}).`);
      }

      const sheetWithPreview: TechDrawingSheet = {
        ...payload.sheet,
        domain: payload.sheet.domain || domain,
        referenceImageUrl: dataUrl
      };
      setStagedSheet(sheetWithPreview);
      setRowFilter('ALL');
      setSelectedIndexCode(null);
      setImageLoadFailed(false);
      setStatusNotice(
        `Extracted ${sheetWithPreview.callouts.length} exploded BOM items from "${label}". Click "Apply Pulled Specs to 3D Model" to bind them to the 3D scene.`
      );
    } catch (err: unknown) {
      // Static-site graceful fallback: preserve uploaded visual diagram locally while clearly explaining server-only AI extraction
      const baseForPreview = displayedSheet;
      const localPreviewSheet: TechDrawingSheet = {
        ...baseForPreview,
        domain,
        referenceImageUrl: dataUrl,
        sourceLabel: `${baseForPreview.sourceLabel} · Uploaded Image (${label})`
      };
      setStagedSheet(localPreviewSheet);
      setRowFilter('ALL');
      setImageLoadFailed(false);
      const reason =
        err instanceof TypeError
          ? 'Server-only AI diagram parsing (/api/specs/parse-diagram) could not reach the backend server.'
          : err instanceof Error
          ? err.message
          : 'Failed to parse uploaded technical drawing.';
      setErrorMsg(
        `${reason} Your uploaded image "${label}" is attached locally for visual inspection alongside existing BOM callouts.`
      );
    } finally {
      setIsParsingDiagram(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP, or GIF) to attach a technical drawing.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        void parseDiagramDataUrl(reader.result, file.type || 'image/jpeg', file.name);
      }
    };
    reader.onerror = () => {
      setErrorMsg(`Unable to read "${file.name}". Please verify the image file and try again.`);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadA500Sample = async () => {
    setIsParsingDiagram(true);
    setErrorMsg(null);
    setStatusNotice(null);

    const a500Trans = TRANSMISSIONS_DB.mopar_a500_42re;
    const builtInA500Sheet: TechDrawingSheet = a500Trans
      ? {
          ...getTransmissionDrawingSheet(a500Trans),
          referenceImageUrl:
            getTransmissionDrawingSheet(a500Trans).referenceImageUrl || A500_42RE_REFERENCE_IMAGE
        }
      : {
          ...activeSheet,
          domain: 'transmission',
          drawingNumber: 'CHRYSLER-A500-42RE',
          title: 'Chrysler 40RH / 42RH / 42RE / 44RE (A500)',
          referenceImageUrl: A500_42RE_REFERENCE_IMAGE
        };

    try {
      const resp = await fetch(A500_42RE_REFERENCE_IMAGE);
      if (!resp.ok) {
        throw new Error(`Reference blueprint fetch returned HTTP ${resp.status}.`);
      }
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read sample blueprint image.'));
        reader.readAsDataURL(blob);
      });

      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const apiRes = await fetch('/api/specs/parse-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'transmission',
          imageBase64: base64,
          mimeType: blob.type || 'image/jpeg',
          unitHint: 'Chrysler 40RH/42RH/42RE/44RE (A500)'
        })
      });

      const payload = await parseApiJson<{ sheet?: TechDrawingSheet; error?: string }>(
        apiRes,
        '/api/specs/parse-diagram'
      );

      if (!payload.sheet || !Array.isArray(payload.sheet.callouts)) {
        throw new Error(payload.error || 'A500 diagram extraction returned incomplete data.');
      }

      setStagedSheet({
        ...payload.sheet,
        domain: 'transmission',
        referenceImageUrl: dataUrl
      });
      setRowFilter('ALL');
      setSelectedIndexCode(null);
      setImageLoadFailed(false);
      setStatusNotice(
        `Scanned ${payload.sheet.callouts.length} callouts from the Chrysler A500 / 42RE Reference Sheet. Click "Apply Pulled Specs to 3D Model" to commit.`
      );
    } catch {
      // Fall back cleanly to the built-in verified A500 / 42RE sheet & diagram on static hosting
      setStagedSheet(builtInA500Sheet);
      setRowFilter('ALL');
      setSelectedIndexCode(null);
      setImageLoadFailed(false);
      setStatusNotice(
        `Loaded built-in Chrysler A500 / 42RE Reference Sheet & ${builtInA500Sheet.callouts.length} verified BOM callouts (static mode — live server OCR unavailable). Click "Apply Pulled Specs to 3D Model" or zoom the blueprint below.`
      );
    } finally {
      setIsParsingDiagram(false);
    }
  };

  const handleCommitTo3D = () => {
    const wasStaged = Boolean(stagedSheet && stagedSheet.domain === domain);
    justCommittedRef.current = true;
    onApplySheetTo3D(displayedSheet);
    setStagedSheet(null);
    setStatusNotice(
      wasStaged
        ? `Applied "${displayedSheet.title}" (${displayedSheet.callouts.length} callouts) directly onto the 3D ${domain} assembly.`
        : `Synced "${displayedSheet.title}" (${displayedSheet.callouts.length} callouts) with the live 3D ${domain} assembly.`
    );
  };

  const handleDiscardStaged = () => {
    setStagedSheet(null);
    setRowFilter('ALL');
    setCalloutFilter('');
    setSelectedIndexCode(null);
    setErrorMsg(null);
    setStatusNotice('Discarded staged changes and restored the active drawing sheet.');
  };

  const containerClasses = inlinePanel
    ? 'bg-[#12161c] border border-slate-800 rounded-xl overflow-hidden text-xs text-slate-200 font-mono'
    : 'absolute top-3 bottom-3 left-3 z-40 w-[min(94vw,620px)] bg-[#12161c] border border-cyan-500/50 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-slate-200 font-mono';

  const isStagedActive = Boolean(stagedSheet && stagedSheet.domain === domain);

  return (
    <>
      <div className={containerClasses}>
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#0d1014] border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-bold text-white font-sans truncate">
                Technical Drawing &amp; Real-World Spec Sheet
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                {displayedSheet.drawingNumber}
              </span>
              {isStagedActive && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-bold">
                  STAGED FOR 3D
                </span>
              )}
              {!isStagedActive && hasCustomApplied && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                  APPLIED TO 3D
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate font-sans mt-0.5">
              {displayedSheet.title} — {displayedSheet.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isStagedActive && (
              <button
                type="button"
                onClick={handleDiscardStaged}
                className="px-2 py-1 rounded border border-amber-500/40 text-amber-300 hover:text-white hover:border-amber-400 text-[10px] flex items-center gap-1"
                title="Discard staged preview sheet"
              >
                <X className="w-3 h-3" />
                <span>Discard</span>
              </button>
            )}
            {hasCustomApplied && onResetCustomSheet && (
              <button
                type="button"
                onClick={() => {
                  setStagedSheet(null);
                  setErrorMsg(null);
                  setStatusNotice('Restored built-in baseline drawing sheet.');
                  onResetCustomSheet();
                }}
                className="px-2 py-1 rounded border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-[10px] flex items-center gap-1"
                title="Restore built-in baseline drawing sheet"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Close Technical Drawing Sheet"
                aria-label="Close Technical Drawing Sheet"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Online Spec Search & Diagram Upload Controls */}
        <div className="p-3 bg-[#151a22] border-b border-slate-800 space-y-2.5 shrink-0">
          <form onSubmit={handleOnlineLookup} className="flex flex-wrap sm:flex-nowrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  domain === 'transmission'
                    ? 'Pull online specs (e.g. Chrysler A500 42RE, TH400, Tremec T56)...'
                    : 'Pull online specs (e.g. 1996 Chevy 350 L31, LS3, AFR 195 heads)...'
                }
                className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-md pl-8 pr-3 py-1.5 text-[11px] text-white outline-none font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={isLookingUp || isParsingDiagram}
              className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition whitespace-nowrap"
            >
              {isLookingUp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isLookingUp ? 'Pulling Specs...' : 'Pull Online Specs'}</span>
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={isLookingUp || isParsingDiagram}
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-md bg-[#0d1014] border border-slate-700 hover:border-orange-400 disabled:opacity-50 text-slate-200 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition"
              >
                {isParsingDiagram ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-orange-400" />
                )}
                <span>{isParsingDiagram ? 'Extracting Diagram...' : 'Upload Drawing Image to 3D'}</span>
              </button>

              {domain === 'transmission' && (
                <button
                  type="button"
                  disabled={isLookingUp || isParsingDiagram}
                  onClick={handleLoadA500Sample}
                  className="px-2.5 py-1.5 rounded-md bg-[#0d1014] border border-slate-700 hover:border-cyan-400 disabled:opacity-50 text-cyan-300 text-[11px] font-medium flex items-center gap-1.5 transition"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Scan A500 / 42RE Reference Sheet</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCommitTo3D}
              className={`px-3 py-1.5 rounded-md font-bold text-[11px] flex items-center gap-1.5 transition ${
                isStagedActive
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg'
                  : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isStagedActive ? 'Apply Pulled Specs to 3D Model' : 'Sync Sheet to 3D Model'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-2 rounded-md bg-red-950/60 border border-red-500/50 text-red-200 text-[11px] flex items-start gap-2 font-sans">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusNotice && (
            <div className="p-2 rounded-md bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-[11px] font-sans">
              {statusNotice}
            </div>
          )}
        </div>

        {/* Summary, Reference Blueprint Image & Online Grounded Citations */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row gap-3 items-start">
            {displayedSheet.referenceImageUrl && (
              imageLoadFailed ? (
                <div className="shrink-0 w-full sm:w-40 rounded-md border border-slate-700 bg-[#12161c] p-2 text-center space-y-1.5">
                  <ImageIcon className="w-5 h-5 text-slate-500 mx-auto" />
                  <p className="text-[10px] text-slate-400 font-sans">Preview unavailable</p>
                  <button
                    type="button"
                    onClick={() => setImageLoadFailed(false)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPreviewLightboxUrl(displayedSheet.referenceImageUrl || null)}
                  className="shrink-0 w-full sm:w-40 rounded-md overflow-hidden border border-slate-700 hover:border-cyan-400 transition group relative bg-white"
                  title="Click to enlarge technical drawing blueprint"
                >
                  <img
                    src={displayedSheet.referenceImageUrl}
                    alt={displayedSheet.title}
                    referrerPolicy="no-referrer"
                    onError={() => setImageLoadFailed(true)}
                    className="w-full h-24 object-contain bg-white"
                  />
                  <span className="block bg-black/85 text-[9px] text-cyan-300 py-0.5 text-center font-bold">
                    Click to Zoom Diagram
                  </span>
                </button>
              )
            )}

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                <span className="text-amber-400 font-bold uppercase">{displayedSheet.sourceLabel}</span>
                {displayedSheet.dimensions && (
                  <span className="text-emerald-400 font-semibold">
                    {displayedSheet.domain === 'transmission' && displayedSheet.dimensions.ratios
                      ? `Ratios: ${displayedSheet.dimensions.ratios.join(' / ')} · ${displayedSheet.dimensions.lengthInches || '—'}" OAL`
                      : displayedSheet.dimensions.bore
                      ? `${displayedSheet.dimensions.bore}" Bore × ${displayedSheet.dimensions.stroke}" Stroke · ${displayedSheet.dimensions.chamberCc ?? '—'}cc`
                      : ''}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {displayedSheet.unitSummary}
              </p>

              {displayedSheet.sourceUrls && displayedSheet.sourceUrls.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {displayedSheet.sourceUrls.slice(0, 4).map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded bg-sky-950/70 border border-sky-700/50 text-sky-300 hover:text-white text-[10px] flex items-center gap-1 max-w-[230px]"
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{src.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row A-F Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Rows:</span>
              {rowsAvailable.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRowFilter(r)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    effectiveRowFilter === r
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#0d1014] border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {r === 'ALL' ? 'All Rows' : `Row ${r}`}
                </button>
              ))}
              <span className="text-[10px] text-slate-500 ml-1.5 font-sans">
                ({filteredCallouts.length}/{displayedSheet.callouts.length})
              </span>
            </div>

            <input
              type="text"
              value={calloutFilter}
              onChange={(e) => setCalloutFilter(e.target.value)}
              placeholder="Filter part #, spec, component..."
              className="bg-[#0d1014] border border-slate-800 focus:border-cyan-400 rounded px-2.5 py-1 text-[11px] text-white outline-none font-sans w-48"
            />
          </div>

          {/* Exploded Callout BOM Table */}
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#0d1014]">
            <div className="overflow-x-auto max-h-[340px]">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-[#181e26] text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-1.5 px-2">IDX</th>
                    <th className="py-1.5 px-2">COMPONENT &amp; PART #</th>
                    <th className="py-1.5 px-2">CLEARANCE / SPEC</th>
                    <th className="py-1.5 px-2">TORQUE</th>
                    <th className="py-1.5 px-2 text-right">3D TARGET</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredCallouts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 px-3 text-center text-slate-400 font-sans">
                        <p>No BOM callouts match the active row or text filter.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setRowFilter('ALL');
                            setCalloutFilter('');
                          }}
                          className="mt-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-semibold"
                        >
                          Clear Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredCallouts.map((c, idx) => {
                      const rowKey = `${c.indexCode}_${idx}`;
                      const isFocused = selectedIndexCode === rowKey;
                      const focusRow = () => {
                        setSelectedIndexCode(rowKey);
                        onFocusCalloutIn3D(c, displayedSheet);
                      };
                      return (
                        <tr
                          key={rowKey}
                          tabIndex={0}
                          onClick={focusRow}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              focusRow();
                            }
                          }}
                          className={`cursor-pointer transition outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
                            isFocused
                              ? 'bg-orange-950/50 text-white'
                              : 'hover:bg-slate-800/60 text-slate-300'
                          }`}
                          title="Click to highlight & inspect this component inside the 3D CAD viewport"
                        >
                          <td className="py-2 px-2 align-top whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
                              {c.indexCode}
                            </span>
                          </td>
                          <td className="py-2 px-2 align-top">
                            <div className="font-semibold text-white font-sans">{c.partName}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                              {c.partNumber && (
                                <span className="text-amber-300 font-semibold">{c.partNumber}</span>
                              )}
                              {c.material && <span>{c.material}</span>}
                            </div>
                            {c.notes && (
                              <p className="text-[10px] text-slate-400 font-sans mt-0.5">{c.notes}</p>
                            )}
                          </td>
                          <td className="py-2 px-2 align-top text-emerald-300 text-[10px] font-sans">
                            {c.clearanceSpec || 'OEM Std'}
                          </td>
                          <td className="py-2 px-2 align-top text-amber-300 text-[10px] font-sans">
                            {c.torqueSpec || 'Factory Spec'}
                          </td>
                          <td className="py-2 px-2 align-top text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-cyan-300">
                              <Crosshair className="w-2.5 h-2.5" />
                              {c.targetSubassembly}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Blueprint Zoom Lightbox */}
      {previewLightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewLightboxUrl(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-[#12161c] border border-slate-700 rounded-xl p-3 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-xs text-white">
              <span className="font-bold font-sans">{displayedSheet.title} — Technical Blueprint</span>
              <button
                type="button"
                onClick={() => setPreviewLightboxUrl(null)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                aria-label="Close Lightbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewLightboxUrl}
              alt={displayedSheet.title}
              referrerPolicy="no-referrer"
              className="w-full max-h-[78vh] object-contain bg-white rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
};