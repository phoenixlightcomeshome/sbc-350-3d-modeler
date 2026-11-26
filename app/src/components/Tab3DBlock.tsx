/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Engine3DScene,
  EngineViewMode,
  CameraPresetId,
  InductionDressMode,
  SupportMode
} from './CADViewer/Engine3DScene';
import { InspectionHUD } from './CADViewer/InspectionHUD';
import { MeasurementHUD } from './CADViewer/MeasurementHUD';
import { MarkupAnnotations } from './CADViewer/MarkupAnnotations';
import { SpecificationTreeDrawer, AnalysisMode } from './CADViewer/SpecificationTreeDrawer';
import { TechDrawingSpecsDrawer } from './TechDrawingSpecsDrawer';
import { getEngineDrawingSheet } from '../data/techDrawingsCatalog';
import { ActiveStoreSelection } from './AutoPartsStorePanel';
import {
  EngineConfig,
  CoordinatedSpecs,
  CutawayMode,
  SubsystemIsolation,
  InspectionData,
  MeasurementState,
  TechDrawingSheet,
  TechDrawingCallout,
  CinematicLightingPreset,
  DesignStudioSubPageId,
  DynamicKinematicTelemetry,
  HoverProbeData,
  MountedStudioDesign
} from '../types/engine';
import { MatrixComponentKey } from '../data/manufacturingMatrix';
import { SpecialModControlsStrip } from './SpecialModControlsStrip';
import {
  Play,
  Square,
  Scissors,
  Ruler,
  Sliders,
  ChevronDown,
  ChevronUp,
  MapPin,
  RefreshCw,
  GitBranch,
  Download,
  Layers,
  FileSpreadsheet,
  Box,
  Compass,
  Gauge,
  Crosshair,
  X
} from 'lucide-react';

function mapInspectionToMatrixKey(part: InspectionData | null): MatrixComponentKey {
  const txt = `${part?.name || ''} ${part?.category || ''}`.toLowerCase();
  if (txt.includes('piston') || txt.includes('ring')) return 'rotating_piston';
  if (txt.includes('rod')) return 'rotating_rod';
  if (txt.includes('crank')) return 'crank';
  if (txt.includes('rocker') || txt.includes('spring') || txt.includes('valvetrain')) return 'valvetrain_rocker';
  if (txt.includes('cam')) return 'cam';
  if (txt.includes('head') || txt.includes('valve')) return 'heads';
  if (txt.includes('intake') || txt.includes('carb') || txt.includes('efi')) return 'intake';
  if (txt.includes('timing')) return 'timingCover';
  if (txt.includes('oil') || txt.includes('lubric')) return 'lubrication';
  if (txt.includes('damper') || txt.includes('balancer')) return 'damper';
  if (txt.includes('bellhousing') || txt.includes('starter') || txt.includes('chassis')) return 'bellhousing';
  return 'block';
}

interface Tab3DBlockProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
  onResetRay: () => void;
  activeStoreSelection?: ActiveStoreSelection | null;
  customEngineDrawing?: TechDrawingSheet | null;
  onApplyEngineDrawing?: (sheet: TechDrawingSheet | null) => void;
  onOpenDrawingsTab?: () => void;
  onOpenMatrixForPart?: (partKey: MatrixComponentKey) => void;
  cinematicPreset?: CinematicLightingPreset;
  onChangeCinematicPreset?: (preset: CinematicLightingPreset) => void;
  mountedDesign?: MountedStudioDesign | null;
  onUnmountDesign?: () => void;
  onOpenDesignStudio?: (subPage?: DesignStudioSubPageId) => void;
  cinematicLaunchNonce?: number;
}

export const Tab3DBlock: React.FC<Tab3DBlockProps> = ({
  config,
  specs,
  onUpdateConfig,
  activeStoreSelection = null,
  customEngineDrawing = null,
  onApplyEngineDrawing,
  onOpenDrawingsTab,
  onOpenMatrixForPart,
  cinematicPreset = 'dyno_cell',
  onChangeCinematicPreset,
  mountedDesign = null,
  onUnmountDesign,
  onOpenDesignStudio,
  cinematicLaunchNonce = 0
}) => {
  const [cutawayMode, setCutawayMode] = useState<CutawayMode>('rightBank');
  const [subsystemIsolation, setSubsystemIsolation] = useState<SubsystemIsolation>('all');
  const [explodedAmount, setExplodedAmount] = useState<number>(0);
  const [sectionOffset, setSectionOffset] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<{ id: CameraPresetId; nonce: number } | null>(null);
  const [projectionMode, setProjectionMode] = useState<'perspective' | 'orthographic'>('perspective');
  const [rpm, setRpm] = useState<number>(850);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<EngineViewMode>(
    cinematicLaunchNonce > 0 ? 'cinematic' : 'realistic'
  );
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('none');
  const [inductionDress, setInductionDress] = useState<InductionDressMode>('carb_hei');
  const [supportMode, setSupportMode] = useState<SupportMode>('shop_stand');
  const [showSpecTree, setShowSpecTree] = useState<boolean>(false);
  const [showTechDrawings, setShowTechDrawings] = useState<boolean>(false);
  const [showTelemetryStrip, setShowTelemetryStrip] = useState<boolean>(true);
  const [telemetry, setTelemetry] = useState<DynamicKinematicTelemetry>({
    crankAngleDeg: 0,
    cyl1Phase: 'INTAKE',
    pistonDepthFromTdcIn: 0,
    pistonVelocityFpm: 0,
    pistonVelocityMs: 0,
    rodAngleDeg: 0,
    intakeValveLiftIn: 0.02,
    exhaustValveLiftIn: 0,
    instantaneousTorqueLbFt: specs.peakTq,
    instantaneousHp: specs.peakHp,
    cylinderPressurePsi: 14.7
  });
  const [hoverProbe, setHoverProbe] = useState<HoverProbeData | null>(null);
  const [hiddenParts, setHiddenParts] = useState<Record<string, boolean>>({});
  const [showMarkups, setShowMarkups] = useState<boolean>(false);
  const [selectedPart, setSelectedPart] = useState<InspectionData | null>(null);
  const [focusPartRequest, setFocusPartRequest] = useState<{ key: string; nonce: number } | null>(null);
  const captureFnRef = useRef<(() => void) | null>(null);
  const stlExportFnRef = useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (cinematicLaunchNonce > 0) {
      setViewMode('cinematic');
      setIsRunning(true);
      setCameraPreset({ id: 'hero', nonce: Date.now() });
    }
  }, [cinematicLaunchNonce]);

  const builtInDrawing = React.useMemo(
    () => getEngineDrawingSheet(config, specs, activeStoreSelection),
    [config, specs, activeStoreSelection]
  );
  const activeTechDrawing = customEngineDrawing || builtInDrawing;

  const [measurementState, setMeasurementState] = useState<MeasurementState>({
    active: false,
    mode: 'none',
    point1: null,
    point2: null,
    distanceInches: null,
    distanceMm: null,
    surfaceLabel: null
  });

  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  const handleTogglePartVisibility = (partKey: string) => {
    setHiddenParts((prev) => ({ ...prev, [partKey]: !prev[partKey] }));
  };

  const handleApplyPreset = (name: string, distIn: number) => {
    setMeasurementState({
      active: true,
      mode: 'caliper',
      point1: [0, 0, 0],
      point2: [distIn, 0, 0],
      distanceInches: distIn,
      distanceMm: +(distIn * 25.4).toFixed(1),
      surfaceLabel: name
    });
  };

  const handleApplySheetTo3D = (sheet: TechDrawingSheet) => {
    onApplyEngineDrawing?.(sheet);
    const dims = sheet.dimensions;
    if (dims) {
      const updates: Partial<EngineConfig> = {};
      if (typeof dims.bore === 'number' && dims.bore > 2 && dims.bore < 6) updates.bore = dims.bore;
      if (typeof dims.stroke === 'number' && dims.stroke > 2 && dims.stroke < 6) updates.stroke = dims.stroke;
      if (typeof dims.rodLength === 'number' && dims.rodLength > 4 && dims.rodLength < 8) updates.rodLength = dims.rodLength;
      if (typeof dims.deckHeight === 'number' && dims.deckHeight > 7 && dims.deckHeight < 12) updates.deckHeight = dims.deckHeight;
      if (typeof dims.deckClearance === 'number' && dims.deckClearance >= 0 && dims.deckClearance < 0.2) {
        updates.deckClearance = dims.deckClearance;
      }
      if (typeof dims.gasketThickness === 'number' && dims.gasketThickness > 0.01 && dims.gasketThickness < 0.15) {
        updates.gasketThickness = dims.gasketThickness;
      }
      if (typeof dims.chamberCc === 'number' && dims.chamberCc > 30 && dims.chamberCc < 140) {
        updates.chamberCc = dims.chamberCc;
      }
      if (Object.keys(updates).length > 0) {
        onUpdateConfig(updates);
      }
    }
  };

  const handleFocusCalloutIn3D = (callout: TechDrawingCallout, sheet: TechDrawingSheet) => {
    setFocusPartRequest({ key: callout.targetSubassembly, nonce: Date.now() });
    setSelectedPart({
      name: callout.partName,
      category: callout.category,
      desc: callout.notes || sheet.unitSummary,
      spec: callout.clearanceSpec,
      torque: callout.torqueSpec,
      partNumber: callout.partNumber,
      drawingIndex: callout.indexCode,
      material: callout.material,
      sourceUrls: sheet.sourceUrls
    });
  };

  return (
    <div className="w-full h-full min-h-[560px] flex flex-col bg-[#0d1014] overflow-hidden select-none">
      {/* Top Docked CAD Drafting Toolbar (Zero Viewport Occlusion) */}
      <div className="shrink-0 bg-[#12161c] border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Cutaway Modes */}
          <div className="flex items-center gap-0.5 bg-[#0d1014] border border-slate-800 p-0.5 rounded-md">
            <span className="px-2 text-[11px] font-medium text-slate-400">Section</span>
            {[
              { id: 'none', label: 'Solid' },
              { id: 'rightBank', label: 'Right Bank' },
              { id: 'centerLongitudinal', label: 'Centerline' },
              { id: 'valvetrain', label: 'Valvetrain' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setCutawayMode(m.id as CutawayMode)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                  cutawayMode === m.id
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Rendering Shading Swatches */}
          <div className="flex flex-wrap items-center gap-0.5 bg-[#0d1014] border border-slate-800 p-0.5 rounded-md">
            <span className="px-2 text-[11px] font-medium text-slate-400">Render</span>
            {[
              { id: 'cinematic', label: 'Cinematic' },
              { id: 'realistic', label: 'Studio PBR' },
              { id: 'iso_paper', label: 'ISO Paper' },
              { id: 'dark', label: 'Dark CAD' },
              { id: 'drawing', label: 'Tech Drawing' },
              { id: 'ghost', label: 'Ghost X-Ray' },
              { id: 'wireframe', label: 'CAD Mesh' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setViewMode(style.id as EngineViewMode)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                  viewMode === style.id
                    ? style.id === 'cinematic'
                      ? 'bg-orange-600 text-white font-semibold'
                      : 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {style.label}
              </button>
            ))}
            {viewMode === 'cinematic' && onChangeCinematicPreset && (
              <>
                <span className="mx-0.5 h-3.5 w-px bg-slate-700" />
                {(
                  [
                    { id: 'dyno_cell', label: 'Dyno Cell' },
                    { id: 'showroom', label: 'Showroom' },
                    { id: 'machine_shop', label: 'Shop Rig' }
                  ] as Array<{ id: CinematicLightingPreset; label: string }>
                ).map((lp) => (
                  <button
                    key={lp.id}
                    onClick={() => onChangeCinematicPreset(lp.id)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition whitespace-nowrap ${
                      cinematicPreset === lp.id
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lp.label}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Induction / Ignition Dress Mode */}
          <div className="flex items-center gap-0.5 bg-[#0d1014] border border-slate-800 p-0.5 rounded-md">
            <span className="px-2 text-[11px] font-medium text-slate-400">Dress</span>
            {[
              { id: 'carb_hei', label: 'Carb + HEI' },
              { id: 'mpfi_cnp', label: 'MPFI + Coils' }
            ].map((dress) => (
              <button
                key={dress.id}
                onClick={() => setInductionDress(dress.id as InductionDressMode)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                  inductionDress === dress.id
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {dress.label}
              </button>
            ))}
          </div>

          {/* Standard Orthographic / Isometric / Cinematic Camera Views + Projection */}
          <div className="flex flex-wrap items-center gap-0.5 bg-[#0d1014] border border-slate-800 p-0.5 rounded-md">
            <span className="px-2 text-[11px] font-medium text-slate-400">View</span>
            {(
              [
                { id: 'hero', label: 'Hero' },
                { id: 'cutaway_detail', label: 'Bore Macro' },
                { id: 'valvetrain_macro', label: 'Valve Macro' },
                { id: 'iso', label: 'ISO' },
                { id: 'front', label: 'Front' },
                { id: 'right', label: 'Side' },
                { id: 'top', label: 'Top' },
                { id: 'rear', label: 'Rear' }
              ] as Array<{ id: CameraPresetId; label: string }>
            ).map((cam) => (
              <button
                key={cam.id}
                onClick={() => setCameraPreset({ id: cam.id, nonce: Date.now() })}
                className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                  cameraPreset?.id === cam.id
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cam.label}
              </button>
            ))}
            <span className="mx-0.5 h-3.5 w-px bg-slate-700" />
            <button
              onClick={() =>
                setProjectionMode((p) => (p === 'perspective' ? 'orthographic' : 'perspective'))
              }
              className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                projectionMode === 'orthographic'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle Perspective vs True CAD Orthographic Projection"
            >
              {projectionMode === 'orthographic' ? 'Ortho' : 'Persp'}
            </button>
          </div>

          {/* SIMULIA Analysis Modes */}
          <div className="flex items-center gap-0.5 bg-[#0d1014] border border-slate-800 p-0.5 rounded-md">
            <span className="px-2 text-[11px] font-medium text-slate-400">Analysis</span>
            {(
              [
                { id: 'none', label: 'PBR' },
                { id: 'stress', label: 'FEA Stress' },
                { id: 'thermal', label: 'Thermal' },
                { id: 'clearance', label: 'GD&T Clash' }
              ] as Array<{ id: AnalysisMode; label: string }>
            ).map((a) => (
              <button
                key={a.id}
                onClick={() => setAnalysisMode(a.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                  analysisMode === a.id
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Tool Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          {onOpenDesignStudio && (
            <button
              onClick={() => onOpenDesignStudio('3d_creator')}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-orange-500/60 bg-orange-600/15 text-orange-300 hover:bg-orange-600 hover:text-white flex items-center gap-1.5 transition whitespace-nowrap"
              title="Author 3D parts, CAD technical drawings, or CAM toolpaths to mount here"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>CAD/CAM Studio</span>
            </button>
          )}

          <button
            onClick={() => setShowTelemetryStrip((v) => !v)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition flex items-center gap-1.5 whitespace-nowrap ${
              showTelemetryStrip
                ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300'
                : 'bg-[#0d1014] border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Pinpoint Real-Time Kinematic Readouts & Spatial Coordinate Probe"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Readouts</span>
          </button>

          <button
            onClick={() =>
              setMeasurementState((prev) => ({
                ...prev,
                active: !prev.active,
                mode: prev.mode === 'none' ? 'caliper' : 'none'
              }))
            }
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition flex items-center gap-1.5 whitespace-nowrap ${
              measurementState.mode !== 'none'
                ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-semibold'
                : 'bg-[#0d1014] border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Measure</span>
          </button>

          <button
            onClick={() => setShowMarkups(!showMarkups)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition flex items-center gap-1.5 whitespace-nowrap ${
              showMarkups
                ? 'bg-orange-500/15 border-orange-500/60 text-orange-300'
                : 'bg-[#0d1014] border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Callouts</span>
          </button>

          <button
            onClick={() => {
              if (hiddenParts.chassis) {
                handleTogglePartVisibility('chassis');
              } else {
                setSupportMode((prev) => (prev === 'shop_stand' ? 'hotrod_chassis' : 'shop_stand'));
              }
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition flex items-center gap-1.5 whitespace-nowrap ${
              !hiddenParts.chassis
                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                : 'bg-[#0d1014] border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Switch between Tubular Shop Engine Stand and Hot-Rod Chassis Rails (use Spec Tree eye icon to hide)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{supportMode === 'shop_stand' ? 'Shop Stand' : 'Hot-Rod Chassis'}</span>
          </button>

          <button
            onClick={() => {
              setShowTechDrawings((v) => !v);
              setShowSpecTree(false);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition flex items-center gap-1.5 whitespace-nowrap ${
              showTechDrawings
                ? 'bg-orange-600 border-orange-400 text-white font-semibold'
                : 'bg-[#0d1014] border-slate-700 text-orange-300 hover:border-orange-500/60'
            }`}
            title="Technical Drawing Descriptions, Online Spec Lookup & Diagram Upload to 3D"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Drawings / Upload</span>
          </button>

          <button
            onClick={() => {
              setShowSpecTree((v) => !v);
              setShowTechDrawings(false);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition flex items-center gap-1.5 whitespace-nowrap ${
              showSpecTree
                ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-semibold'
                : 'bg-[#0d1014] border-slate-700 text-cyan-300 hover:border-cyan-500/60'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Spec Tree</span>
          </button>

          <button
            onClick={() => stlExportFnRef.current?.()}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-700 bg-[#0d1014] hover:border-orange-500/60 text-slate-300 hover:text-orange-300 flex items-center gap-1.5 transition whitespace-nowrap"
            title="Export Full Engine Assembly to 3D ASCII .STL for Fusion 360 / Onshape / CAM"
          >
            <Box className="w-3.5 h-3.5 text-orange-400" />
            <span>Export STL</span>
          </button>

          <button
            onClick={() => captureFnRef.current?.()}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-700 bg-[#0d1014] hover:border-slate-500 text-slate-300 hover:text-white flex items-center gap-1.5 transition whitespace-nowrap"
            title="Export CAD Snapshot PNG"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export PNG</span>
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold border transition flex items-center gap-1.5 whitespace-nowrap ${
              isRunning
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-orange-600 border-orange-500 text-white hover:bg-orange-500'
            }`}
          >
            {isRunning ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isRunning ? 'Stop Cycle' : 'Run Cycle'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Live Carb, Air & Exhaust Port Modification Bar */}
      <div className="shrink-0 px-3 py-1.5 bg-[#0d1014] border-b border-slate-800">
        <SpecialModControlsStrip
          config={config}
          specs={specs}
          onUpdateConfig={onUpdateConfig}
          variant="compact"
        />
      </div>

      {/* Mounted Design Studio Package Indicator Strip */}
      {mountedDesign && (
        <div className="shrink-0 px-3 py-1.5 bg-[#101924] border-b border-cyan-500/40 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono font-bold text-cyan-300">
              STUDIO MOUNTED: {mountedDesign.drawingNumber} ({mountedDesign.revision})
            </span>
            <span className="text-slate-200 font-medium">{mountedDesign.title}</span>
            <span className="font-mono text-emerald-400">{mountedDesign.toleranceClass}</span>
            {mountedDesign.camOperation && (
              <span className="font-mono text-orange-300">
                CAM: {mountedDesign.camOperation} · {mountedDesign.spindleRpm} RPM · {mountedDesign.surfaceFinishRa}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onOpenDesignStudio && (
              <button
                type="button"
                onClick={() => onOpenDesignStudio(mountedDesign.sourceSubPage)}
                className="px-2 py-0.5 rounded bg-[#0d1014] border border-slate-700 hover:border-cyan-400 text-cyan-300 font-medium transition"
              >
                Edit in Studio
              </button>
            )}
            {onUnmountDesign && (
              <button
                type="button"
                onClick={onUnmountDesign}
                className="p-0.5 text-slate-400 hover:text-white"
                title="Unmount Studio Package"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pinpoint Real-Time Kinematic Telemetry & Spatial Probe Strip */}
      {showTelemetryStrip && (
        <div className="shrink-0 px-3 py-1.5 bg-[#0a0d12] border-b border-slate-800 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-mono tabular-nums">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div>
              <span className="text-slate-500 mr-1">CRANK</span>
              <span className="text-white font-bold">{telemetry.crankAngleDeg.toFixed(1)}°</span>
              <span
                className={`ml-1.5 font-semibold ${
                  telemetry.cyl1Phase === 'POWER'
                    ? 'text-orange-400'
                    : telemetry.cyl1Phase === 'COMPRESSION'
                    ? 'text-amber-300'
                    : telemetry.cyl1Phase === 'EXHAUST'
                    ? 'text-rose-400'
                    : 'text-cyan-400'
                }`}
              >
                CYL1:{telemetry.cyl1Phase}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">TDC DEPTH</span>
              <span className="text-cyan-300 font-semibold">
                {telemetry.pistonDepthFromTdcIn.toFixed(4)}"
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">PISTON VEL</span>
              <span className="text-slate-200 font-semibold">
                {telemetry.pistonVelocityFpm.toLocaleString()} FPM
              </span>
              <span className="text-slate-500 ml-1">({telemetry.pistonVelocityMs.toFixed(2)} m/s)</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">ROD</span>
              <span className="text-slate-200">{telemetry.rodAngleDeg.toFixed(2)}°</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">VALVE LIFT I/E</span>
              <span className="text-emerald-300">
                {telemetry.intakeValveLiftIn.toFixed(3)}" / {telemetry.exhaustValveLiftIn.toFixed(3)}"
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">CYL PRESS</span>
              <span className="text-amber-400 font-semibold">{telemetry.cylinderPressurePsi} PSI</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">OUTPUT</span>
              <span className="text-orange-400 font-bold">
                {telemetry.instantaneousHp} HP · {telemetry.instantaneousTorqueLbFt} LB-FT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Crosshair className="w-3 h-3 text-cyan-400 shrink-0" />
            {hoverProbe ? (
              <span className="text-cyan-300">
                {hoverProbe.partName.slice(0, 22)} · X:{hoverProbe.xIn.toFixed(3)}" Y:{hoverProbe.yIn.toFixed(3)}" Z:{hoverProbe.zIn.toFixed(3)}"
              </span>
            ) : (
              <span className="text-slate-500">Hover 3D geometry for X/Y/Z coordinate probe</span>
            )}
          </div>
        </div>
      )}

      {/* Center Unobstructed 3D CAD Viewport */}
      <div className="flex-1 w-full relative min-h-0">
        <Engine3DScene
          config={config}
          specs={specs}
          cutawayMode={cutawayMode}
          subsystemIsolation={subsystemIsolation}
          explodedAmount={explodedAmount}
          sectionOffset={sectionOffset}
          cameraPreset={cameraPreset}
          projectionMode={projectionMode}
          analysisMode={analysisMode}
          inductionDress={inductionDress}
          supportMode={supportMode}
          cinematicPreset={cinematicPreset}
          hiddenParts={hiddenParts}
          onRegisterCapture={(fn) => {
            captureFnRef.current = fn;
          }}
          onRegisterStlExport={(fn) => {
            stlExportFnRef.current = fn;
          }}
          rpm={rpm}
          isRunning={isRunning}
          viewMode={viewMode}
          showMarkups={showMarkups}
          onSelectPart={setSelectedPart}
          selectedPart={selectedPart}
          measurementState={measurementState}
          onUpdateMeasurement={setMeasurementState}
          techDrawing={activeTechDrawing}
          mountedDesign={mountedDesign}
          focusPartRequest={focusPartRequest}
          onOpenDrawingsTab={onOpenDrawingsTab}
          onTelemetryUpdate={setTelemetry}
          onHoverProbe={setHoverProbe}
        />

        {/* CATIA Specification Tree & GD&T Stackup Drawer */}
        <SpecificationTreeDrawer
          isOpen={showSpecTree}
          onClose={() => setShowSpecTree(false)}
          config={config}
          specs={specs}
          subsystemIsolation={subsystemIsolation}
          onSelectIsolation={setSubsystemIsolation}
          hiddenParts={hiddenParts}
          onTogglePartVisibility={handleTogglePartVisibility}
          onUpdateConfig={onUpdateConfig}
          onSelectPart={setSelectedPart}
          rpm={rpm}
        />

        {/* Technical Drawing BOM Sheet + Online Spec Lookup + Diagram Upload */}
        <TechDrawingSpecsDrawer
          isOpen={showTechDrawings}
          onClose={() => setShowTechDrawings(false)}
          domain="engine"
          activeSheet={activeTechDrawing}
          defaultQuery={activeTechDrawing.title}
          contextSpecs={{
            bore: config.bore,
            stroke: config.stroke,
            rodLength: config.rodLength,
            chamberCc: config.chamberCc,
            staticCR: specs.staticCR
          }}
          onApplySheetTo3D={handleApplySheetTo3D}
          onFocusCalloutIn3D={handleFocusCalloutIn3D}
          onResetCustomSheet={() => onApplyEngineDrawing?.(null)}
          hasCustomApplied={Boolean(customEngineDrawing)}
        />

        {/* 3D Markup Annotation Callout Pins */}
        <MarkupAnnotations
          showMarkups={showMarkups}
          specs={specs}
          config={config}
          onSelectTag={(label, desc) => {
            setSelectedPart({
              name: label,
              category: 'Blueprint Callout',
              desc
            });
          }}
        />

        {/* Inspection Card HUD */}
        <InspectionHUD
          part={selectedPart}
          onClose={() => setSelectedPart(null)}
          onOpenInDrawingMatrix={
            onOpenMatrixForPart
              ? () => onOpenMatrixForPart(mapInspectionToMatrixKey(selectedPart))
              : undefined
          }
        />

        {/* CAD Caliper & Volumetric Measurement HUD */}
        <MeasurementHUD
          measurementState={measurementState}
          onUpdateMeasurement={setMeasurementState}
          specs={specs}
          config={config}
          onApplyPreset={handleApplyPreset}
        />

        {/* ISO/ASME Technical Drawing Corner Title Block */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 bg-[#0d1014]/90 border border-slate-700/90 rounded-md px-3 py-2 font-mono text-[10px] text-slate-300 space-y-0.5 tabular-nums hidden sm:block">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
            <span className="font-bold text-white">DWG: MODSIM-{specs.displacementCi}</span>
            <span className="text-slate-400">SCALE 1:1 · INCH / CC</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>B×S {config.bore.toFixed(3)}"×{config.stroke.toFixed(3)}"</span>
            <span>·</span>
            <span>ROD {config.rodLength.toFixed(3)}"</span>
            <span>·</span>
            <span className="text-emerald-400">QUENCH {specs.quenchDistance}"</span>
            <span>·</span>
            <span className="text-amber-400">CR {specs.staticCR}:1</span>
          </div>
        </div>
      </div>

      {/* Bottom Docked Drafting & Simulation Control Bar (Docked Outside Canvas) */}
      <div className="shrink-0 bg-[#12161c] border-t border-slate-800 px-4 py-2 space-y-2 text-xs">
        {/* Subsystem Isolation + Collapse Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-medium text-slate-400 mr-1.5">Isolate Assembly:</span>
            {[
              { id: 'all', label: 'Full Engine' },
              { id: 'rotating', label: 'Rotating' },
              { id: 'valvetrain', label: 'Valvetrain' },
              { id: 'ignition', label: 'Ignition' },
              { id: 'lubrication', label: 'Oil Pump' },
              { id: 'cooling', label: 'Water Pump' },
              { id: 'fuel', label: 'Fuel Pump' },
              { id: 'starter', label: 'Starter' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSubsystemIsolation(s.id as SubsystemIsolation)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition whitespace-nowrap ${
                  subsystemIsolation === s.id
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
          >
            {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{dockCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
          </button>
        </div>

        {!dockCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 border-t border-slate-800/80 items-center">
            {/* Exploded Separation */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-orange-400" />
                  <span>Exploded Separation</span>
                </span>
                <span className="font-mono font-semibold text-orange-400 tabular-nums">
                  {Math.round(explodedAmount * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodedAmount}
                onChange={(e) => setExplodedAmount(parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            {/* Kinematic Cycle Speed */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cycle Speed</span>
                </span>
                <span className="font-mono font-semibold text-amber-400 tabular-nums">
                  {rpm} RPM
                </span>
              </div>
              <input
                type="range"
                min="600"
                max="6500"
                step="50"
                value={rpm}
                onChange={(e) => setRpm(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            {/* Section Plane or Analysis Legend */}
            {cutawayMode !== 'none' ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Section Plane Offset</span>
                  </span>
                  <span className="font-mono font-semibold text-cyan-400 tabular-nums">
                    {sectionOffset >= 0 ? `+${sectionOffset.toFixed(2)}` : sectionOffset.toFixed(2)} in
                  </span>
                </div>
                <input
                  type="range"
                  min="-2.5"
                  max="2.5"
                  step="0.05"
                  value={sectionOffset}
                  onChange={(e) => setSectionOffset(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                />
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                Click any 3D part for inspection specs, or switch Section mode to inspect internal bore &amp; rotating assembly.
              </div>
            )}

            {analysisMode !== 'none' && (
              <div className="md:col-span-3 pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-amber-400">
                  {analysisMode === 'stress'
                    ? 'Von Mises Stress Distribution (ksi)'
                    : analysisMode === 'thermal'
                    ? 'Combustion & Exhaust Thermal Map (°F)'
                    : 'GD&T Quench & Clash Tolerance'}
                </span>
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  <span className="text-cyan-300">
                    {analysisMode === 'stress'
                      ? '12 ksi'
                      : analysisMode === 'thermal'
                      ? '185°F'
                      : 'Pass (0.040"-0.060")'}
                  </span>
                  <div className="w-32 h-2 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-red-500" />
                  <span className="text-red-400 font-semibold">
                    {analysisMode === 'stress'
                      ? '145 ksi'
                      : analysisMode === 'thermal'
                      ? '1,350°F'
                      : 'Interference'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
