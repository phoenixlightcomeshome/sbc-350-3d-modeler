/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import {
  EngineConfig,
  CoordinatedSpecs,
  TechDrawingSheet,
  TechDrawingCallout,
  TransmissionItem,
  TabId
} from '../types/engine';
import { TRANSMISSIONS_DB } from '../data/engineData';
import {
  getEngineDrawingSheet,
  getTransmissionDrawingSheet,
  A500_42RE_REFERENCE_IMAGE
} from '../data/techDrawingsCatalog';
import { ActiveStoreSelection } from './AutoPartsStorePanel';
import {
  SchematicEngineSVG,
  SchematicTransmissionSVG,
  BlueprintPaperTheme
} from './SchematicBlueprints';
import { MatrixComponentKey } from '../data/manufacturingMatrix';
import {
  FileSpreadsheet,
  Search,
  Upload,
  Download,
  Printer,
  Box,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  Wrench,
  ShieldCheck,
  X
} from 'lucide-react';

interface TabTechnicalDrawingsProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
  activeStoreSelection: ActiveStoreSelection | null;
  customEngineDrawing: TechDrawingSheet | null;
  onApplyEngineDrawing: (sheet: TechDrawingSheet | null) => void;
  transDrawingsById: Record<string, TechDrawingSheet>;
  transOverridesById: Record<string, Partial<TransmissionItem>>;
  onApplyTransDrawing: (transId: string, sheet: TechDrawingSheet | null) => void;
  onJumpToTab: (tab: TabId) => void;
  onOpenMatrixForPart?: (partKey: MatrixComponentKey) => void;
}

const DIM_HIDDEN_ATTR = 'data-cad-dim-hidden';
const DIM_PREV_DISPLAY_ATTR = 'data-cad-prev-display';
const TITLE_BLOCK_REGEX =
  /\b(DWG\s*NO|DRAWING\s*NO|TITLE|SCALE|PROJ|PROJECTION|SHEET|REV|APPROVED|MODSIM|HOOPS)\b/i;
const DIMENSION_TEXT_REGEX =
  /\d+(\.\d+)?\s*("|″|in\b|mm\b|cc\b|°|:1\b|CID\b|OAL\b|RPM\b|PSI\b|FT-?LB\b)|\b(BORE|STROKE|DECK|QUENCH|ROD\s*C-?TO-?C|VALVE\s*LIFT|CHAMBER|GASKET|SCR\b|DCR\b|OAL\b|R\/S\b|CLEARANCE|TORQUE|RING\s*GAP)\b/i;

function isTitleBlockGroup(el: Element, drawingNumber: string, title: string): boolean {
  const idClass = `${el.getAttribute('id') || ''} ${el.getAttribute('class') || ''}`;
  if (/title[-_]?block|header[-_]?bar|border/i.test(idClass)) return true;
  const texts = Array.from(el.querySelectorAll('text'));
  return texts.some((t) => {
    const content = (t.textContent || '').trim();
    return (
      TITLE_BLOCK_REGEX.test(content) ||
      (drawingNumber.length > 0 && content.includes(drawingNumber)) ||
      (title.length > 3 && content.includes(title))
    );
  });
}

function hideSvgElement(el: SVGElement): void {
  if (el.getAttribute(DIM_HIDDEN_ATTR) === 'true') return;
  const prevDisplay = el.style.display || '';
  el.setAttribute(DIM_PREV_DISPLAY_ATTR, prevDisplay);
  el.setAttribute(DIM_HIDDEN_ATTR, 'true');
  el.style.display = 'none';
}

function restoreSvgElements(svg: SVGSVGElement): void {
  const hidden = svg.querySelectorAll(`[${DIM_HIDDEN_ATTR}="true"]`);
  hidden.forEach((node) => {
    if (node instanceof SVGElement) {
      const prev = node.getAttribute(DIM_PREV_DISPLAY_ATTR) || '';
      node.style.display = prev;
      node.removeAttribute(DIM_HIDDEN_ATTR);
      node.removeAttribute(DIM_PREV_DISPLAY_ATTR);
    }
  });
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

export const TabTechnicalDrawings: React.FC<TabTechnicalDrawingsProps> = ({
  config,
  specs,
  onUpdateConfig,
  activeStoreSelection,
  customEngineDrawing,
  onApplyEngineDrawing,
  transDrawingsById,
  transOverridesById,
  onApplyTransDrawing,
  onJumpToTab,
  onOpenMatrixForPart
}) => {
  const [domain, setDomain] = useState<'engine' | 'transmission'>('engine');
  const [visualMode, setVisualMode] = useState<'schematic' | 'diagram'>('schematic');
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [paperTheme, setPaperTheme] = useState<BlueprintPaperTheme>('blueprint');
  const [diagramZoom, setDiagramZoom] = useState<number>(1);
  const [diagramImgError, setDiagramImgError] = useState<boolean>(false);
  const [rowFilter, setRowFilter] = useState<string>('ALL');
  const [calloutFilter, setCalloutFilter] = useState<string>('');
  const [selectedCallout, setSelectedCallout] = useState<TechDrawingCallout | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stagedSheet, setStagedSheet] = useState<TechDrawingSheet | null>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [isParsingDiagram, setIsParsingDiagram] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseTrans = TRANSMISSIONS_DB[config.selectedTrans] || TRANSMISSIONS_DB.th350;
  const currentTrans: TransmissionItem = useMemo(() => {
    const override = transOverridesById[baseTrans.id];
    return override ? { ...baseTrans, ...override } : baseTrans;
  }, [baseTrans, transOverridesById]);

  const builtInEngineSheet = useMemo(
    () => getEngineDrawingSheet(config, specs, activeStoreSelection),
    [config, specs, activeStoreSelection]
  );
  const builtInTransSheet = useMemo(
    () => getTransmissionDrawingSheet(currentTrans),
    [currentTrans]
  );

  const activeSavedSheet =
    domain === 'engine'
      ? customEngineDrawing || builtInEngineSheet
      : transDrawingsById[currentTrans.id] || builtInTransSheet;

  const hasStagedForDomain = Boolean(stagedSheet && stagedSheet.domain === domain);
  const hasCustomForDomain =
    domain === 'engine'
      ? Boolean(customEngineDrawing)
      : Boolean(transDrawingsById[currentTrans.id]);

  const displayedSheet =
    stagedSheet && stagedSheet.domain === domain ? stagedSheet : activeSavedSheet;

  const schematicSheet = useMemo(
    () => (showDimensions ? displayedSheet : { ...displayedSheet, callouts: [] }),
    [showDimensions, displayedSheet]
  );

  const effectiveReferenceImageUrl = useMemo(() => {
    if (displayedSheet.referenceImageUrl) return displayedSheet.referenceImageUrl;
    if (domain === 'transmission' && currentTrans.id === 'mopar_a500_42re') {
      return A500_42RE_REFERENCE_IMAGE;
    }
    return undefined;
  }, [displayedSheet.referenceImageUrl, domain, currentTrans.id]);

  const hasReferenceImage = Boolean(effectiveReferenceImageUrl);

  useEffect(() => {
    setDiagramImgError(false);
  }, [effectiveReferenceImageUrl, domain, visualMode]);

  // Keep inspected callout synchronized with the current displayedSheet callouts
  const activeInspectCallout = useMemo(() => {
    if (selectedCallout) {
      const refreshed =
        displayedSheet.callouts.find(
          (c) =>
            c.indexCode === selectedCallout.indexCode && c.partName === selectedCallout.partName
        ) || displayedSheet.callouts.find((c) => c.indexCode === selectedCallout.indexCode);
      if (refreshed) return refreshed;
    }
    return displayedSheet.callouts[0] || null;
  }, [selectedCallout, displayedSheet]);

  // Gate ALL dimension annotation/callout rendering inside the SVG schematic on showDimensions
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || visualMode !== 'schematic') return;

    restoreSvgElements(svg);
    if (showDimensions) return;

    const titleGroups = new Set<Element>();
    svg.querySelectorAll('g').forEach((g) => {
      if (isTitleBlockGroup(g, displayedSheet.drawingNumber, displayedSheet.title)) {
        titleGroups.add(g);
      }
    });

    const insideTitleBlock = (el: Element): boolean => {
      let cur: Element | null = el;
      while (cur && cur !== svg) {
        if (titleGroups.has(cur)) return true;
        cur = cur.parentElement;
      }
      return false;
    };

    // 1. Hide explicitly marked dimension/callout/annotation groups or elements
    svg
      .querySelectorAll(
        '[data-dimension], [data-callout], [class*="dimension" i], [class*="callout" i], [class*="annotation" i], [class*="leader" i], [id*="dimension" i], [id*="callout" i], [id*="annotation" i]'
      )
      .forEach((node) => {
        if (node instanceof SVGElement && !insideTitleBlock(node)) {
          hideSvgElement(node);
        }
      });

    // 2. Hide arrowed dimension lines & callout leader lines
    svg
      .querySelectorAll('line[marker-end], line[marker-start], path[marker-end], path[marker-start], polyline[marker-end], polyline[marker-start]')
      .forEach((node) => {
        if (node instanceof SVGElement && !insideTitleBlock(node)) {
          hideSvgElement(node);
          const parent = node.parentElement;
          if (
            parent &&
            parent !== (svg as unknown as HTMLElement) &&
            parent.tagName.toLowerCase() === 'g' &&
            !insideTitleBlock(parent) &&
            parent.querySelectorAll('rect, path').length <= 4 &&
            parent.querySelectorAll('text').length >= 1
          ) {
            hideSvgElement(parent as unknown as SVGElement);
          }
        }
      });

    // 3. Hide static callout balloon groups (small circle + short index text)
    svg.querySelectorAll('g').forEach((g) => {
      if (insideTitleBlock(g) || g.getAttribute(DIM_HIDDEN_ATTR) === 'true') return;
      const circles = g.querySelectorAll('circle');
      const texts = g.querySelectorAll('text');
      const largeRects = Array.from(g.querySelectorAll('rect')).filter(
        (r) => Number(r.getAttribute('width') || 0) > 120
      );
      if (circles.length === 1 && texts.length === 1 && largeRects.length === 0) {
        const radius = Number(circles[0].getAttribute('r') || 0);
        const label = (texts[0].textContent || '').trim();
        if (radius > 0 && radius <= 22 && label.length > 0 && label.length <= 5) {
          hideSvgElement(g);
        }
      }
    });

    // 4. Hide dimension / measurement <text> elements and compact dimension-line wrapper <g>s
    svg.querySelectorAll('text').forEach((textEl) => {
      if (insideTitleBlock(textEl) || textEl.getAttribute(DIM_HIDDEN_ATTR) === 'true') return;
      const content = (textEl.textContent || '').trim();
      if (!content) return;
      if (
        TITLE_BLOCK_REGEX.test(content) ||
        (displayedSheet.drawingNumber && content.includes(displayedSheet.drawingNumber)) ||
        (displayedSheet.title && content === displayedSheet.title)
      ) {
        return;
      }

      if (DIMENSION_TEXT_REGEX.test(content)) {
        hideSvgElement(textEl);
        const parent = textEl.parentElement;
        if (
          parent &&
          parent !== (svg as unknown as HTMLElement) &&
          parent.tagName.toLowerCase() === 'g' &&
          !insideTitleBlock(parent)
        ) {
          const largeShapes = Array.from(parent.querySelectorAll('rect, circle, ellipse')).filter(
            (shape) => {
              const w = Number(shape.getAttribute('width') || 0);
              const r = Number(shape.getAttribute('r') || 0);
              return w > 140 || r > 28;
            }
          );
          if (largeShapes.length === 0 && parent.children.length <= 10) {
            hideSvgElement(parent as unknown as SVGElement);
          }
        }
      }
    });

    return () => {
      if (svgRef.current) {
        restoreSvgElements(svgRef.current);
      }
    };
  }, [
    showDimensions,
    visualMode,
    domain,
    paperTheme,
    displayedSheet,
    currentTrans.id
  ]);

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
          (c.notes || '').toLowerCase().includes(q) ||
          c.targetSubassembly.toLowerCase().includes(q))
      );
    });
  }, [displayedSheet, effectiveRowFilter, calloutFilter]);

  const handleSelectDomain = (nextDomain: 'engine' | 'transmission') => {
    setDomain(nextDomain);
    setSelectedCallout(null);
    setRowFilter('ALL');
    setCalloutFilter('');
    setDiagramZoom(1);
    setDiagramImgError(false);
    setErrorMsg(null);
    setStatusMsg(null);

    const nextSavedSheet =
      nextDomain === 'engine'
        ? customEngineDrawing || builtInEngineSheet
        : transDrawingsById[currentTrans.id] || builtInTransSheet;
    const nextStaged = stagedSheet && stagedSheet.domain === nextDomain ? stagedSheet : null;
    const nextSheet = nextStaged || nextSavedSheet;
    const nextHasDiagram = Boolean(
      nextSheet.referenceImageUrl ||
        (nextDomain === 'transmission' && currentTrans.id === 'mopar_a500_42re')
    );

    if (visualMode === 'diagram' && !nextHasDiagram) {
      setVisualMode('schematic');
      setShowDimensions(true);
    }
  };

  const handleOnlineLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim() || displayedSheet.title;
    if (!q) return;

    setIsLookingUp(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/specs/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          query: q,
          unitName: displayedSheet.title,
          contextSpecs:
            domain === 'engine'
              ? {
                  bore: config.bore,
                  stroke: config.stroke,
                  rodLength: config.rodLength,
                  chamberCc: config.chamberCc,
                  staticCR: specs.staticCR
                }
              : {
                  id: currentTrans.id,
                  ratios: currentTrans.ratios,
                  lengthInches: currentTrans.lengthInches
                }
        })
      });

      const payload = await parseApiJson<{ sheet?: TechDrawingSheet; error?: string }>(
        res,
        '/api/specs/lookup'
      );

      if (!payload.sheet || !Array.isArray(payload.sheet.callouts)) {
        throw new Error(
          payload.error || `Online lookup returned incomplete sheet data (${res.status}).`
        );
      }

      const normalizedSheet: TechDrawingSheet = {
        ...payload.sheet,
        domain: payload.sheet.domain || domain
      };

      setStagedSheet(normalizedSheet);
      setSelectedCallout(normalizedSheet.callouts[0] || null);
      setRowFilter('ALL');
      setCalloutFilter('');
      setStatusMsg(
        `Loaded ${normalizedSheet.callouts.length} real-world callouts for "${normalizedSheet.title}". Click "Apply Pulled Specs to 3D" to commit into live CAD & 3D.`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof TypeError
          ? 'Online spec lookup (/api/specs/lookup) could not reach the backend API server. Built-in verified CAD & BOM sheets remain fully functional.'
          : err instanceof Error
          ? err.message
          : 'Unable to fetch online specs.';
      setErrorMsg(msg);
    } finally {
      setIsLookingUp(false);
    }
  };

  const parseDiagramDataUrl = async (
    dataUrl: string,
    mimeType: string,
    label: string,
    hintDomain?: 'engine' | 'transmission'
  ) => {
    const targetDomain = hintDomain || domain;
    setIsParsingDiagram(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const res = await fetch('/api/specs/parse-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: targetDomain,
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

      const nextSheet: TechDrawingSheet = {
        ...payload.sheet,
        domain: payload.sheet.domain || targetDomain,
        referenceImageUrl: dataUrl
      };
      setDomain(nextSheet.domain);
      setStagedSheet(nextSheet);
      setVisualMode('diagram');
      setDiagramZoom(1);
      setDiagramImgError(false);
      setSelectedCallout(nextSheet.callouts[0] || null);
      setRowFilter('ALL');
      setCalloutFilter('');
      setStatusMsg(
        `Extracted ${nextSheet.callouts.length} labeled components from "${label}". Switch between Dimensioned CAD & Part Catalog Diagram views anytime.`
      );
    } catch (err: unknown) {
      const baseSheet =
        targetDomain === 'engine'
          ? customEngineDrawing || builtInEngineSheet
          : transDrawingsById[currentTrans.id] || builtInTransSheet;
      const localSheet: TechDrawingSheet = {
        ...baseSheet,
        domain: targetDomain,
        referenceImageUrl: dataUrl,
        sourceLabel: `${baseSheet.sourceLabel} · Uploaded Image (${label})`
      };
      setDomain(targetDomain);
      setStagedSheet(localSheet);
      setVisualMode('diagram');
      setDiagramZoom(1);
      setDiagramImgError(false);
      setRowFilter('ALL');

      const reason =
        err instanceof TypeError
          ? 'Server-only AI diagram parsing (/api/specs/parse-diagram) could not reach the backend server.'
          : err instanceof Error
          ? err.message
          : 'Failed to parse uploaded technical drawing.';
      setErrorMsg(
        `${reason} Your uploaded image "${label}" has been loaded locally in Part Catalog Diagram view alongside the existing BOM callouts.`
      );
    } finally {
      setIsParsingDiagram(false);
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP, or GIF) to upload.');
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

  const handleLoadA500Diagram = () => {
    const a500Trans = TRANSMISSIONS_DB.mopar_a500_42re;
    onUpdateConfig({
      selectedTrans: 'mopar_a500_42re',
      stallSpeed: a500Trans?.defaultStall || config.stallSpeed
    });
    setStagedSheet(null);
    setDomain('transmission');
    setVisualMode('diagram');
    setDiagramZoom(1);
    setDiagramImgError(false);
    setSelectedCallout(null);
    setRowFilter('ALL');
    setCalloutFilter('');
    setErrorMsg(null);
    setStatusMsg(
      'Loaded Chrysler 40RH / 42RH / 42RE / 44RE (A500) Exploded Catalog Diagram & CAD Schematic.'
    );
  };

  const handleApplyTo3D = () => {
    const targetSheet = displayedSheet;
    const applyingStaged = Boolean(stagedSheet && stagedSheet.domain === domain);

    if (targetSheet.domain === 'engine') {
      if (applyingStaged || customEngineDrawing) {
        onApplyEngineDrawing(targetSheet);
      }
      const dims = targetSheet.dimensions;
      if (dims) {
        const updates: Partial<EngineConfig> = {};
        if (typeof dims.bore === 'number' && dims.bore > 2 && dims.bore < 6) updates.bore = dims.bore;
        if (typeof dims.stroke === 'number' && dims.stroke > 2 && dims.stroke < 6) updates.stroke = dims.stroke;
        if (typeof dims.rodLength === 'number' && dims.rodLength > 4 && dims.rodLength < 8) {
          updates.rodLength = dims.rodLength;
        }
        if (typeof dims.deckHeight === 'number' && dims.deckHeight > 7 && dims.deckHeight < 12) {
          updates.deckHeight = dims.deckHeight;
        }
        if (
          typeof dims.deckClearance === 'number' &&
          dims.deckClearance >= 0 &&
          dims.deckClearance < 0.2
        ) {
          updates.deckClearance = dims.deckClearance;
        }
        if (
          typeof dims.gasketThickness === 'number' &&
          dims.gasketThickness > 0.01 &&
          dims.gasketThickness < 0.15
        ) {
          updates.gasketThickness = dims.gasketThickness;
        }
        if (typeof dims.chamberCc === 'number' && dims.chamberCc > 30 && dims.chamberCc < 140) {
          updates.chamberCc = dims.chamberCc;
        }
        if (Object.keys(updates).length > 0) {
          onUpdateConfig(updates);
        }
      }
    } else {
      if (applyingStaged || transDrawingsById[currentTrans.id]) {
        onApplyTransDrawing(currentTrans.id, targetSheet);
      }
      if (targetSheet.dimensions?.defaultStall && currentTrans.type === 'Automatic') {
        onUpdateConfig({ stallSpeed: targetSheet.dimensions.defaultStall });
      }
    }

    setStagedSheet(null);
    setErrorMsg(null);
    setStatusMsg(
      applyingStaged
        ? `Applied "${targetSheet.title}" specs & BOM callouts to the live 3D ${targetSheet.domain} model.`
        : `Live "${targetSheet.title}" CAD sheet & BOM tolerances are synced with the 3D ${targetSheet.domain} model.`
    );
  };

  const handleDiscardStaged = () => {
    setStagedSheet(null);
    setSelectedCallout(null);
    setRowFilter('ALL');
    setCalloutFilter('');
    setDiagramZoom(1);
    setDiagramImgError(false);
    setErrorMsg(null);
    setStatusMsg('Discarded staged preview sheet and restored the active CAD drawing.');
  };

  const handleRestoreLiveSheet = () => {
    if (domain === 'engine') {
      onApplyEngineDrawing(null);
    } else {
      onApplyTransDrawing(currentTrans.id, null);
    }
    setStagedSheet(null);
    setSelectedCallout(null);
    setRowFilter('ALL');
    setCalloutFilter('');
    setDiagramZoom(1);
    setDiagramImgError(false);
    setErrorMsg(null);
    setStatusMsg(`Restored live parametric baseline CAD sheet for ${domain}.`);
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgRef.current);
    if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
      source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const filename = `${displayedSheet.drawingNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatusMsg(`Exported dimensioned blueprint SVG (${filename}).`);
  };

  const dimensionStripItems =
    domain === 'engine'
      ? [
          {
            label: 'Bore × Stroke',
            value: `${config.bore.toFixed(3)}" × ${config.stroke.toFixed(3)}"`,
            sub: `${specs.displacementCi} CID (${specs.displacementL} L)`
          },
          {
            label: 'Rod & Kinematics',
            value: `${config.rodLength.toFixed(3)}" C-to-C`,
            sub: `R/S ${specs.rodStrokeRatio}:1 · Max Angle ${specs.maxRodAngleDeg}°`
          },
          {
            label: 'Deck & Quench Stack',
            value: `${specs.quenchDistance}" Quench`,
            sub: `${config.deckHeight.toFixed(3)}" Deck · ${config.deckClearance.toFixed(3)}" + ${config.gasketThickness.toFixed(3)}"`
          },
          {
            label: 'Compression Ratio',
            value: `${specs.staticCR}:1 SCR`,
            sub: `${specs.dynamicCR}:1 Dynamic · ${config.chamberCc.toFixed(1)} cc Chamber`
          },
          {
            label: 'Valvetrain & Rings',
            value: `${specs.totalValveLift}" Valve Lift`,
            sub: `Gaps ${specs.topRingGap}" / ${specs.secondRingGap}" / ${specs.oilRingGap.toFixed(3)}"`
          }
        ]
      : [
          {
            label: 'Overall Length',
            value: `${currentTrans.lengthInches.toFixed(1)}" OAL`,
            sub: `${currentTrans.type} · ${currentTrans.ratios.length}-Speed`
          },
          {
            label: 'Bellhousing Pattern',
            value: currentTrans.nativePattern,
            sub: specs.compatibility.isDirectBoltOn ? 'Direct GM Bolt-On' : specs.compatibility.bellhousing
          },
          {
            label: 'Forward Gear Ratios',
            value: currentTrans.ratios.map((r) => r.toFixed(2)).join(' / '),
            sub: `Reverse ${currentTrans.reverse.toFixed(2)}:1`
          },
          {
            label: 'Converter / Clutch',
            value: currentTrans.type === 'Automatic' ? `${config.stallSpeed} RPM Stall` : 'Manual Clutch',
            sub: currentTrans.clutch
          },
          {
            label: 'Chassis Tunnel Fit',
            value: specs.compatibility.isDirectBoltOn ? 'Factory Fitment' : 'Adapter Required',
            sub: currentTrans.tunnelProfile
          }
        ];

  return (
    <div className="p-4 sm:p-6 max-w-[1440px] mx-auto w-full space-y-5 text-xs text-slate-200">
      {/* Workbench Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <span>Technical Drawing Description &amp; Dimensioned Schematics</span>
            {hasStagedForDomain && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-mono">
                STAGED PREVIEW
              </span>
            )}
            {!hasStagedForDomain && hasCustomForDomain && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono">
                CUSTOM APPLIED
              </span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="font-mono text-cyan-300 font-semibold">{displayedSheet.drawingNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{displayedSheet.title}</span>
            <span aria-hidden="true">·</span>
            <span>{displayedSheet.sourceLabel}</span>
          </div>
        </div>

        {/* Interactive Assembly, View & Paper Controls */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Domain Selector */}
          <div className="flex items-center gap-1 p-1 bg-[#12161c] border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => handleSelectDomain('engine')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                domain === 'engine'
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Engine Schematic
            </button>
            <button
              type="button"
              onClick={() => handleSelectDomain('transmission')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                domain === 'transmission'
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Transmission Schematic
            </button>
          </div>

          {/* Schematic vs Part Diagram Segmented Control */}
          <div
            role="group"
            aria-label="Technical drawing view mode"
            className="flex items-center gap-1 p-1 bg-[#12161c] border border-slate-800 rounded-lg"
          >
            <button
              type="button"
              onClick={() => {
                if (visualMode !== 'schematic') {
                  setVisualMode('schematic');
                  setShowDimensions(true);
                } else {
                  setShowDimensions((prev) => !prev);
                }
              }}
              aria-pressed={visualMode === 'schematic' && showDimensions}
              aria-label={
                visualMode === 'schematic'
                  ? showDimensions
                    ? 'Dimensioned CAD active with dimension annotations on. Click to hide dimensions.'
                    : 'Dimensioned CAD dimensions hidden. Click to show dimensions.'
                  : 'Switch to Dimensioned CAD schematic with dimension annotations on.'
              }
              className={`px-3 py-1.5 rounded-md text-xs transition whitespace-nowrap flex items-center gap-1.5 ${
                visualMode === 'schematic' && showDimensions
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : visualMode === 'schematic' && !showDimensions
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/50 font-semibold hover:bg-slate-700'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <span>Dimensioned CAD</span>
              {visualMode === 'schematic' && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                    showDimensions
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-amber-500/20 text-amber-200'
                  }`}
                >
                  {showDimensions ? 'ON' : 'OFF'}
                </span>
              )}
            </button>
            <button
              type="button"
              disabled={visualMode === 'diagram'}
              onClick={() => setVisualMode('diagram')}
              aria-pressed={visualMode === 'diagram'}
              aria-label={
                visualMode === 'diagram'
                  ? 'Part Catalog Diagram (current view)'
                  : 'Switch to Part Catalog Diagram view'
              }
              className={`px-3 py-1.5 rounded-md text-xs transition whitespace-nowrap ${
                visualMode === 'diagram'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm cursor-default'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              Part Catalog Diagram
            </button>
          </div>

          {/* Paper Style Toggle */}
          {visualMode === 'schematic' && (
            <button
              type="button"
              onClick={() => setPaperTheme((prev) => (prev === 'blueprint' ? 'vellum' : 'blueprint'))}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-[#12161c] hover:border-slate-500 text-slate-200 text-xs font-medium transition whitespace-nowrap"
            >
              {paperTheme === 'blueprint' ? 'Vellum Paper' : 'Blueprint Dark'}
            </button>
          )}

          {visualMode === 'schematic' && (
            <button
              type="button"
              onClick={handleExportSvg}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-[#12161c] hover:border-emerald-500/60 text-slate-200 hover:text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export SVG</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="no-print px-3 py-2 rounded-lg border border-slate-700 bg-[#12161c] hover:border-slate-500 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {onOpenMatrixForPart && (
            <button
              type="button"
              onClick={() =>
                onOpenMatrixForPart(domain === 'transmission' ? 'bellhousing' : 'block')
              }
              className="no-print px-3 py-2 rounded-lg border border-orange-500/60 bg-orange-600/15 hover:bg-orange-600/25 text-orange-200 text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap"
            >
              <Box className="w-3.5 h-3.5 text-orange-400" />
              <span>3D Part &amp; MFG Matrix</span>
            </button>
          )}
        </div>
      </div>

      {/* Transmission Selector Bar + Online Lookup & Diagram Upload */}
      <div className="bg-[#12161c] border border-slate-800 rounded-xl p-4 space-y-3 no-print">
        <div className="flex flex-wrap items-center gap-3">
          {domain === 'transmission' && (
            <div className="flex items-center gap-2 min-w-[260px]">
              <label htmlFor="td-trans-select" className="text-slate-400 font-medium whitespace-nowrap">
                Transmission Unit:
              </label>
              <select
                id="td-trans-select"
                value={currentTrans.id}
                onChange={(e) => {
                  const chosen = TRANSMISSIONS_DB[e.target.value];
                  if (chosen) {
                    onUpdateConfig({
                      selectedTrans: chosen.id,
                      stallSpeed: chosen.defaultStall || config.stallSpeed
                    });
                    setStagedSheet(null);
                    setSelectedCallout(null);
                    setRowFilter('ALL');
                    setCalloutFilter('');
                    setDiagramZoom(1);
                    setDiagramImgError(false);
                    setErrorMsg(null);
                    setStatusMsg(null);
                  }
                }}
                className="bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-md px-2.5 py-1.5 text-xs text-white font-medium max-w-[300px]"
              >
                {Object.values(TRANSMISSIONS_DB).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form
            onSubmit={handleOnlineLookup}
            className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-[260px]"
          >
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  domain === 'engine'
                    ? `Search online specs (current: ${displayedSheet.title})...`
                    : `Search online specs (current: ${currentTrans.name})...`
                }
                className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-md pl-8 pr-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLookingUp || isParsingDiagram}
              className="px-3.5 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition whitespace-nowrap"
            >
              {isLookingUp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isLookingUp ? 'Searching...' : 'Pull Online Specs'}</span>
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadFile}
              className="hidden"
            />
            <button
              type="button"
              disabled={isLookingUp || isParsingDiagram}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-md border border-slate-700 bg-[#0d1014] hover:border-orange-400 disabled:opacity-50 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
            >
              {isParsingDiagram ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-orange-400" />
              )}
              <span>{isParsingDiagram ? 'Extracting...' : 'Upload Part Diagram'}</span>
            </button>

            <button
              type="button"
              disabled={isLookingUp || isParsingDiagram}
              onClick={handleLoadA500Diagram}
              className="px-3 py-1.5 rounded-md border border-slate-700 bg-[#0d1014] hover:border-cyan-400 disabled:opacity-50 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>View A500 / 42RE Diagram</span>
            </button>

            {hasStagedForDomain && (
              <button
                type="button"
                onClick={handleDiscardStaged}
                className="px-3 py-1.5 rounded-md border border-amber-500/50 bg-[#0d1014] hover:border-amber-400 text-amber-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                <span>Discard Staged</span>
              </button>
            )}

            {hasCustomForDomain && (
              <button
                type="button"
                onClick={handleRestoreLiveSheet}
                className="px-3 py-1.5 rounded-md border border-slate-700 bg-[#0d1014] hover:border-slate-500 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Live Sheet</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApplyTo3D}
              className={`px-3.5 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition whitespace-nowrap ${
                hasStagedForDomain
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{hasStagedForDomain ? 'Apply Pulled Specs to 3D' : 'Sync Sheet to 3D Model'}</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {statusMsg && (
          <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-200">
            {statusMsg}
          </div>
        )}
      </div>

      {/* Primary Focal Anchor: Dimensioned Schematic / Catalog Diagram + Selected Callout Spec Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Left / Main Technical Drawing Stage (9 cols on XL) */}
        <div
          className={`xl:col-span-9 border border-slate-800 rounded-xl overflow-hidden flex flex-col ${
            visualMode === 'schematic' && paperTheme === 'vellum' ? 'bg-[#f4efe6]' : 'bg-[#091628]'
          }`}
        >
          {visualMode === 'schematic' ? (
            <div className="w-full flex flex-col">
              {!showDimensions && (
                <div className="px-4 py-2 bg-amber-950/85 border-b border-amber-500/40 text-amber-200 flex flex-wrap items-center justify-between gap-2 no-print">
                  <span className="font-mono text-[11px] font-semibold">
                    Dimensions hidden — click Dimensioned CAD to show them
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDimensions(true)}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-100 text-[11px] font-semibold transition"
                  >
                    Show Dimensions
                  </button>
                </div>
              )}
              <div className="w-full overflow-x-auto">
                {domain === 'engine' ? (
                  <SchematicEngineSVG
                    config={config}
                    specs={specs}
                    sheet={schematicSheet}
                    selectedTarget={
                      showDimensions ? activeInspectCallout?.targetSubassembly || null : null
                    }
                    onSelectCallout={(c) => setSelectedCallout(c)}
                    paperTheme={paperTheme}
                    svgRef={svgRef}
                  />
                ) : (
                  <SchematicTransmissionSVG
                    transmission={currentTrans}
                    sheet={schematicSheet}
                    selectedTarget={
                      showDimensions ? activeInspectCallout?.targetSubassembly || null : null
                    }
                    onSelectCallout={(c) => setSelectedCallout(c)}
                    paperTheme={paperTheme}
                    svgRef={svgRef}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-[460px] bg-[#091628]">
              {/* Diagram Viewer Toolbar */}
              <div className="px-4 py-2.5 bg-[#0d1014] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-slate-300">
                  {hasReferenceImage
                    ? `Exploded Parts Catalog Sheet · ${displayedSheet.drawingNumber}`
                    : 'No uploaded catalog bitmap for this unit — upload an image or view Dimensioned CAD Schematic'}
                </span>
                {hasReferenceImage && !diagramImgError && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDiagramZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                      aria-label="Zoom out diagram"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-cyan-300 px-2 tabular-nums">
                      {Math.round(diagramZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setDiagramZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                      aria-label="Zoom in diagram"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiagramZoom(1)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                      aria-label="Reset zoom"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Diagram Image Canvas or Guided Fallback */}
              <div className="flex-1 overflow-auto bg-[#0b1320] p-4 max-h-[580px]">
                {hasReferenceImage && !diagramImgError ? (
                  <div
                    className="bg-white rounded-lg p-2 shadow-xl mx-auto"
                    style={{
                      width: diagramZoom === 1 ? 'fit-content' : `${Math.round(diagramZoom * 100)}%`,
                      maxWidth: diagramZoom === 1 ? '100%' : 'none'
                    }}
                  >
                    <img
                      src={effectiveReferenceImageUrl}
                      alt={`${displayedSheet.title} technical parts diagram`}
                      referrerPolicy="no-referrer"
                      onError={() => setDiagramImgError(true)}
                      className={
                        diagramZoom === 1
                          ? 'max-w-full max-h-[520px] w-auto h-auto object-contain block mx-auto'
                          : 'w-full h-auto object-contain block'
                      }
                    />
                  </div>
                ) : hasReferenceImage && diagramImgError ? (
                  <div className="h-full min-h-[400px] flex items-center justify-center">
                    <div className="max-w-lg text-center space-y-3 p-6 border border-slate-800 rounded-xl bg-[#12161c]">
                      <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                      <h3 className="text-sm font-bold text-white">
                        Unable to Load External Catalog Diagram Image
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        The reference bitmap could not be loaded (network offline or blocked by external host). You can retry loading, upload a local image from disk, or inspect the built-in Dimensioned CAD Schematic.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setDiagramImgError(false)}
                          className="px-3.5 py-2 rounded-md border border-slate-700 bg-[#0d1014] hover:border-cyan-400 text-cyan-300 font-medium"
                        >
                          Retry Image
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white font-semibold"
                        >
                          Upload Local Image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVisualMode('schematic');
                            setShowDimensions(true);
                          }}
                          className="px-3.5 py-2 rounded-md border border-slate-700 bg-[#0d1014] hover:text-white text-slate-300 font-medium"
                        >
                          View CAD Schematic
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[400px] flex items-center justify-center">
                    <div className="max-w-lg text-center space-y-3 p-6 border border-slate-800 rounded-xl bg-[#12161c]">
                      <ImageIcon className="w-10 h-10 text-cyan-400 mx-auto" />
                      <h3 className="text-sm font-bold text-white">
                        Dimensioned Vector CAD Active — No Catalog Bitmap Attached Yet
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Upload any scanned factory exploded parts diagram or shop manual sheet above, load the Chrysler A500 / 42RE reference sheet, or switch to the parametric Dimensioned CAD view.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white font-semibold"
                        >
                          Upload Diagram Image
                        </button>
                        <button
                          type="button"
                          onClick={handleLoadA500Diagram}
                          className="px-3.5 py-2 rounded-md border border-slate-700 bg-[#0d1014] hover:border-cyan-400 text-cyan-300 font-medium"
                        >
                          Load A500 / 42RE Diagram
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVisualMode('schematic');
                            setShowDimensions(true);
                          }}
                          className="px-3.5 py-2 rounded-md border border-slate-700 bg-[#0d1014] hover:text-white text-slate-300 font-medium"
                        >
                          View CAD Schematic
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Component Inspector Panel (3 cols on XL) */}
        <aside className="xl:col-span-3 bg-[#12161c] border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-4">
          {activeInspectCallout ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-mono text-cyan-300 font-bold">
                  INDEX {activeInspectCallout.indexCode} · ROW {activeInspectCallout.row}
                </span>
                <span className="text-slate-400">{activeInspectCallout.category}</span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white leading-snug">
                  {activeInspectCallout.partName}
                </h3>
                {activeInspectCallout.partNumber && (
                  <p className="font-mono text-amber-300 font-semibold mt-1">
                    SKU / Part #: {activeInspectCallout.partNumber}
                  </p>
                )}
              </div>

              <div className="space-y-2.5 pt-1 border-t border-slate-800/80">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Clearance &amp; Tolerance Spec</span>
                  </div>
                  <p className="font-mono text-slate-200 tabular-nums leading-relaxed">
                    {activeInspectCallout.clearanceSpec || 'OEM factory standard tolerance'}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Fastener Torque &amp; Preload</span>
                  </div>
                  <p className="font-mono text-slate-200 tabular-nums leading-relaxed">
                    {activeInspectCallout.torqueSpec || 'Standard dry/lubed fastener torque'}
                  </p>
                </div>

                {activeInspectCallout.material && (
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-semibold text-slate-400">Material &amp; Finish</div>
                    <p className="text-slate-200">{activeInspectCallout.material}</p>
                  </div>
                )}

                {activeInspectCallout.notes && (
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-semibold text-slate-400">
                      Assembly &amp; Inspection Notes
                    </div>
                    <p className="text-slate-300 leading-relaxed">{activeInspectCallout.notes}</p>
                  </div>
                )}
              </div>

              {displayedSheet.sourceUrls && displayedSheet.sourceUrls.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <div className="text-[11px] font-semibold text-sky-400">
                    Online Verification Sources
                  </div>
                  {displayedSheet.sourceUrls.slice(0, 3).map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-300 hover:text-white underline flex items-center gap-1 truncate"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{src.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-400">
              Select any balloon callout on the CAD blueprint or row in the specification table below to inspect tolerances.
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 space-y-2 no-print">
            <button
              type="button"
              onClick={() => onJumpToTab(domain === 'engine' ? 'block3d' : 'trans')}
              className="w-full px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <Box className="w-4 h-4" />
              <span>
                {domain === 'engine' ? 'Inspect in 3D Engine Viewport' : 'Inspect in 3D Transmission'}
              </span>
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              Click any callout balloon on the schematic to isolate its tolerances.
            </p>
          </div>
        </aside>
      </div>

      {/* Key Confirmed Engineering Dimensions Strip (5-Column Full Width) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-[#12161c] border border-slate-800 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
        {dimensionStripItems.map((item) => (
          <div key={item.label} className="p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400 font-medium">{item.label}</div>
            <div className="font-mono text-sm font-bold text-white tabular-nums">{item.value}</div>
            <div className="font-mono text-[11px] text-cyan-300 tabular-nums truncate" title={item.sub}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Full Technical Drawing Description & Tolerance BOM Schedule */}
      <div className="bg-[#12161c] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">
              Component Dimension, Clearance &amp; Torque Description Schedule
              <span className="ml-2 text-xs font-mono font-normal text-slate-400">
                ({filteredCallouts.length} of {displayedSheet.callouts.length})
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{displayedSheet.unitSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="flex items-center gap-1 p-1 bg-[#0d1014] border border-slate-800 rounded-lg">
              {rowsAvailable.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRowFilter(r)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    effectiveRowFilter === r
                      ? 'bg-orange-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r === 'ALL' ? 'All Rows' : `Row ${r}`}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={calloutFilter}
              onChange={(e) => setCalloutFilter(e.target.value)}
              placeholder="Filter part, SKU, tolerance..."
              className="bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-md px-3 py-1.5 text-xs text-white outline-none w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0d1014] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-medium">Index</th>
                <th className="py-2.5 px-3 font-medium">Row</th>
                <th className="py-2.5 px-3 font-medium">Component Description</th>
                <th className="py-2.5 px-3 font-medium">OEM / Aftermarket SKU</th>
                <th className="py-2.5 px-3 font-medium">Dimension &amp; Clearance Spec</th>
                <th className="py-2.5 px-3 font-medium">Torque Spec</th>
                <th className="py-2.5 px-3 font-medium">Material</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCallouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-slate-400">
                    <p>No component callouts match the active row or search filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setRowFilter('ALL');
                        setCalloutFilter('');
                      }}
                      className="mt-2.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium text-xs"
                    >
                      Clear Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredCallouts.map((c, idx) => {
                  const isSelected =
                    activeInspectCallout?.indexCode === c.indexCode &&
                    activeInspectCallout?.partName === c.partName;
                  return (
                    <tr
                      key={`${c.indexCode}_${idx}`}
                      tabIndex={0}
                      onClick={() => setSelectedCallout(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedCallout(c);
                        }
                      }}
                      className={`cursor-pointer transition outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
                        isSelected
                          ? 'bg-orange-950/40 text-white'
                          : 'hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap tabular-nums">
                        {c.indexCode}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {c.row}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{c.partName}</div>
                        {c.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{c.notes}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-300 whitespace-nowrap">
                        {c.partNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-300 tabular-nums">
                        {c.clearanceSpec || 'OEM Standard'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-200 tabular-nums">
                        {c.torqueSpec || 'Factory Spec'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{c.material || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};