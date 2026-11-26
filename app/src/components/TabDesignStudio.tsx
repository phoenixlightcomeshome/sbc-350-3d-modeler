/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CinematicLightingPreset,
  CoordinatedSpecs,
  DesignStudioSubPageId,
  EngineConfig,
  MountedStudioDesign,
  PistonAlloy,
  TabId,
  TechDrawingCallout,
  TechDrawingSheet
} from '../types/engine';
import {
  getManufacturingMatrix,
  MatrixComponentKey
} from '../data/manufacturingMatrix';
import {
  Component3DTechRenderer,
  ComponentProjectionMode,
  ComponentRenderMode,
  ComponentViewportLayout
} from './CADViewer/Component3DTechRenderer';
import { exportObject3DToSTL, exportPartProfileToDXF } from '../utils/cadExporters';
import { scalePointsToMm, VectorContour, vectorizeImageFile, VectorizeResult, VectorPoint, } from '../utils/imageVectorizer';
import {
  Box,
  CheckCircle2,
  Compass,
  Cpu,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  Film,
  Layers,
  Pause,
  Play,
  Plus,
  Rocket,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  Wrench
} from 'lucide-react';

interface TabDesignStudioProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
  activeSubPage: DesignStudioSubPageId;
  onChangeSubPage: (sub: DesignStudioSubPageId) => void;
  cinematicPreset: CinematicLightingPreset;
  onChangeCinematicPreset: (preset: CinematicLightingPreset) => void;
  mountedDesign: MountedStudioDesign | null;
  studioDesigns: MountedStudioDesign[];
  onSaveStudioDesign: (design: MountedStudioDesign) => void;
  onMountDesignToTestArea: (design: MountedStudioDesign, launchCinematic?: boolean) => void;
  onJumpToTab: (tab: TabId) => void;
}

interface CamOperationPreset {
  id: string;
  label: string;
  partKey: MatrixComponentKey;
  toolDesc: string;
  toolDiaIn: number;
  flutes: number;
  spindleRpm: number;
  feedIpm: number;
  docIn: number;
  stepoverPct: number;
  stockIn: number;
  coolant: 'Through-Spindle 1000 PSI' | 'Flood Synthetic' | 'MQL Mist';
}

const CAM_OPERATIONS: CamOperationPreset[] = [
  {
    id: 'cnc_head_port',
    label: '5-Axis CNC Cylinder Head Port & Chamber',
    partKey: 'heads',
    toolDesc: 'Ø 0.500" 4-Flute Solid Carbide Ball-Nose (TiAlN)',
    toolDiaIn: 0.5,
    flutes: 4,
    spindleRpm: 14500,
    feedIpm: 92,
    docIn: 0.035,
    stepoverPct: 8,
    stockIn: 0.005,
    coolant: 'MQL Mist'
  },
  {
    id: 'block_deck_bore',
    label: 'Torque-Plate Bore Finish & Deck Mill',
    partKey: 'block',
    toolDesc: 'Ø 2.500" 6-Insert PCD Face/Bore Mill',
    toolDiaIn: 2.5,
    flutes: 6,
    spindleRpm: 3200,
    feedIpm: 46,
    docIn: 0.015,
    stepoverPct: 32,
    stockIn: 0.003,
    coolant: 'Flood Synthetic'
  },
  {
    id: 'crank_contour',
    label: '4340 Billet Crank Counterweight Contour',
    partKey: 'crank',
    toolDesc: 'Ø 0.625" 5-Flute Variable-Helix Carbide Endmill',
    toolDiaIn: 0.625,
    flutes: 5,
    spindleRpm: 5800,
    feedIpm: 54,
    docIn: 0.06,
    stepoverPct: 18,
    stockIn: 0.008,
    coolant: 'Through-Spindle 1000 PSI'
  },
  {
    id: 'rod_hbeam_pocket',
    label: 'H-Beam Connecting Rod Pocket & Cap Bore',
    partKey: 'rotating_rod',
    toolDesc: 'Ø 0.375" 5-Flute AlTiN Corner-Radius Endmill',
    toolDiaIn: 0.375,
    flutes: 5,
    spindleRpm: 7600,
    feedIpm: 48,
    docIn: 0.045,
    stepoverPct: 14,
    stockIn: 0.004,
    coolant: 'Through-Spindle 1000 PSI'
  },
  {
    id: 'piston_crown_relief',
    label: '2618 Forged Piston Dome & Valve Reliefs',
    partKey: 'rotating_piston',
    toolDesc: 'Ø 0.3125" 3-Flute Polished ZrN Aluminum Mill',
    toolDiaIn: 0.3125,
    flutes: 3,
    spindleRpm: 18000,
    feedIpm: 125,
    docIn: 0.025,
    stepoverPct: 10,
    stockIn: 0.002,
    coolant: 'MQL Mist'
  },
  {
    id: 'cam_lobe_cbn',
    label: '8620 Billet Camshaft CBN Lobe Finish',
    partKey: 'cam',
    toolDesc: 'Ø 1.250" CBN Electroplated Profile Wheel',
    toolDiaIn: 1.25,
    flutes: 4,
    spindleRpm: 6400,
    feedIpm: 38,
    docIn: 0.008,
    stepoverPct: 6,
    stockIn: 0.002,
    coolant: 'Flood Synthetic'
  }
];

type CadPaperTheme = 'blueprint' | 'vellum' | 'obsidian';

const CINEMATIC_PLATES: Array<{
  id: string;
  preset: CinematicLightingPreset;
  title: string;
  subtitle: string;
  imageUrl: string;
  lightingSummary: string;
  cameraSpec: string;
}> = [
  {
    id: 'dyno_cell',
    preset: 'dyno_cell',
    title: 'Obsidian Dyno Test Cell',
    subtitle: 'Full V8 Cutaway Assembly · Thermal Exhaust Rim Glow',
    imageUrl: '/src/assets/images/cinematic_v8_dyno_cell_1795540040912.jpg',
    lightingSummary: 'RoomEnvironment IBL + Overhead 16×7ft Softbox + 6500K Cyan Rim + Bloom',
    cameraSpec: '36mm Anamorphic · ACES Filmic · 2048px Contact Shadows'
  },
  {
    id: 'machine_shop',
    preset: 'machine_shop',
    title: '5-Axis CNC Machining Cell',
    subtitle: 'Billet Cylinder Head Porting · MQL Mist & Tungsten Key',
    imageUrl: '/src/assets/images/cinematic_cnc_5axis_head_1795540041464.jpg',
    lightingSummary: 'Warm 4200K Worklamp Key + Cool Coolant Specular + Emissive Cutter Tip',
    cameraSpec: '50mm Macro · Anisotropic Billet Swirl Normal Map'
  },
  {
    id: 'showroom',
    preset: 'showroom',
    title: 'Metrology & ASME CAD Bench',
    subtitle: '4340 Crankshaft, H-Beam Rod & Forged Piston Blueprint Study',
    imageUrl: '/src/assets/images/cinematic_cad_blueprint_desk_1795540041126.jpg',
    lightingSummary: 'High-Key Neutral Softbox Studio · Brushed Micro-Normal PBR',
    cameraSpec: '35mm Technical Prime · Zero-Distortion Studio Sweep'
  }
];

export const TabDesignStudio: React.FC<TabDesignStudioProps> = ({
  config,
  specs,
  onUpdateConfig,
  activeSubPage,
  onChangeSubPage,
  cinematicPreset,
  onChangeCinematicPreset,
  mountedDesign,
  studioDesigns,
  onSaveStudioDesign,
  onMountDesignToTestArea,
  onJumpToTab
}) => {
  // 3D Creator State
  const [selectedPartKey, setSelectedPartKey] = useState<MatrixComponentKey>('heads');
  const [renderMode3d, setRenderMode3d] = useState<ComponentRenderMode>('cinematic');
  const [projection3d, setProjection3d] = useState<ComponentProjectionMode>('perspective');
  const [viewportLayout3d, setViewportLayout3d] = useState<ComponentViewportLayout>('single');

  const [designTitle, setDesignTitle] = useState<string>(
    `SBC ${specs.displacementCi} Custom CNC Stage-II Spec`
  );
  const [drawingNumber, setDrawingNumber] = useState<string>(
    `STD-${specs.displacementCi}-CNC-01`
  );
  const [revision, setRevision] = useState<string>('REV E');
  const [toleranceClass, setToleranceClass] = useState<string>('AS9100 Class A (±0.0002")');
  const [surfaceFinishTarget, setSurfaceFinishTarget] = useState<string>('Ra 12–16 µin Plateau');

  // CAD Technical Drawing State
  const [paperTheme, setPaperTheme] = useState<CadPaperTheme>('blueprint');
  const [projectionAngle, setProjectionAngle] = useState<'Third-Angle (ASME Y14.5)' | 'First-Angle (ISO 128)'>('Third-Angle (ASME Y14.5)');
  const [drawingScale, setDrawingScale] = useState<'1:1' | '1:2' | '2:1'>('1:1');
  const [cadLayers, setCadLayers] = useState({
    geometry: true,
    centerlines: true,
    hatch: true,
    dimensions: true,
    gdt: true,
    balloons: true
  });
  const [customCallouts, setCustomCallouts] = useState<TechDrawingCallout[]>([
    {
      row: '1',
      indexCode: 'A-101',
      partName: 'Torque-Plate Honed Cylinder Block',
      partNumber: `BLK-${specs.displacementCi}-4B`,
      category: 'Datum Base A|B',
      clearanceSpec: `Bore ${config.bore.toFixed(3)}" · Quench ${specs.quenchDistance}"`,
      torqueSpec: 'Main Caps 75 ft-lbs ARP',
      material: 'Class 35 High-Nickel Cast Iron',
      notes: 'Deck squared 90.00° ±0.0005" to crank centerline.',
      targetSubassembly: 'block'
    },
    {
      row: '2',
      indexCode: 'B-205',
      partName: 'Forged Piston & 4340 H-Beam Rod',
      partNumber: `ROT-${config.pistonAlloy.toUpperCase()}-570`,
      category: 'Rotating Assembly',
      clearanceSpec: `PTW ${specs.ptwClearance} · Top Gap ${config.ringApplication}`,
      torqueSpec: 'ARP 2000 Rod Bolts 63 ft-lbs',
      material: `${config.pistonAlloy.toUpperCase()} Forged / 4340 Billet`,
      notes: `Rod/Stroke ${specs.rodStrokeRatio}:1 · Max Rod Angle ${specs.maxRodAngleDeg}°`,
      targetSubassembly: 'rotating'
    },
    {
      row: '3',
      indexCode: 'C-310',
      partName: '5-Axis CNC Ported Cylinder Head',
      partNumber: `HEAD-${config.intakePortCc ?? 185}CC`,
      category: 'Airflow & Valvetrain',
      clearanceSpec: `Int ${config.intakePortCc ?? 185}cc (${specs.intakeFlowPeakCfm} CFM)`,
      torqueSpec: 'Head Studs 70 ft-lbs (3-Step)',
      material: '356-T6 Aerospace Aluminum',
      notes: `${config.chamberCc.toFixed(1)}cc CNC Chamber · Static CR ${specs.staticCR}:1`,
      targetSubassembly: 'heads'
    },
    {
      row: '4',
      indexCode: 'D-420',
      partName: '4340 Nitrided Forged Crankshaft',
      partNumber: `CRK-${config.stroke.toFixed(3).replace('.', '')}`,
      category: 'Crankshaft',
      clearanceSpec: `Stroke ${config.stroke.toFixed(3)}" · Main Clear 0.0024"`,
      torqueSpec: 'Damper Bolt 65 ft-lbs',
      material: '4340 Vacuum-Melt Forging',
      notes: 'Precision micro-polished journals Ra ≤ 4 µin.',
      targetSubassembly: 'crank'
    }
  ]);
  const [selectedCalloutIdx, setSelectedCalloutIdx] = useState<number>(0);
  const cadSvgRef = useRef<SVGSVGElement | null>(null);

  // CAM Toolpath State
  const [selectedCamOpId, setSelectedCamOpId] = useState<string>(CAM_OPERATIONS[0].id);
  const [toolDiaIn, setToolDiaIn] = useState<number>(CAM_OPERATIONS[0].toolDiaIn);
  const [flutes, setFlutes] = useState<number>(CAM_OPERATIONS[0].flutes);
  const [spindleRpm, setSpindleRpm] = useState<number>(CAM_OPERATIONS[0].spindleRpm);
  const [feedIpm, setFeedIpm] = useState<number>(CAM_OPERATIONS[0].feedIpm);
  const [docIn, setDocIn] = useState<number>(CAM_OPERATIONS[0].docIn);
  const [stepoverPct, setStepoverPct] = useState<number>(CAM_OPERATIONS[0].stepoverPct);
  const [stockIn, setStockIn] = useState<number>(CAM_OPERATIONS[0].stockIn);
  const [camSimRunning, setCamSimRunning] = useState<boolean>(true);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
// Image-to-3D (Tab 14 draft workflow) state — Ray's numbers only, no invented dimensions
const [imageFile, setImageFile] = useState<File | null>(null);
const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
const [tracedPartName, setTracedPartName] = useState<string>('');
const [thresholdOverrideInput, setThresholdOverrideInput] = useState<string>('');
const [rdpEpsilonInput, setRdpEpsilonInput] = useState<string>('1.0');
const [minContourAreaInput, setMinContourAreaInput] = useState<string>('16');
const [traceResult, setTraceResult] = useState<VectorizeResult | null>(null);
const [draftContours, setDraftContours] = useState<VectorContour[] | null>(null);
const [selectedContourIdx, setSelectedContourIdx] = useState<number>(0);
const [isTracing, setIsTracing] = useState<boolean>(false);
const [traceError, setTraceError] = useState<string | null>(null);
// Reference scale inputs (pixels -> mm) — required from user, no defaults
const [scaleInputMode, setScaleInputMode] = useState<'reference_span' | 'direct_px_per_mm'>('reference_span');
const [refSpanPxInput, setRefSpanPxInput] = useState<string>('');
const [refSpanMmInput, setRefSpanMmInput] = useState<string>('');
const [directPxPerMmInput, setDirectPxPerMmInput] = useState<string>('');
const [originMode, setOriginMode] = useState<'bottom_left' | 'center'>('bottom_left');
// 2D drafting overlay interaction state
const [overlayTool, setOverlayTool] = useState<'inspect' | 'caliper' | 'edit_vertices'>('inspect');
const [caliperPoints, setCaliperPoints] = useState<VectorPoint[]>([]);
const [selectedVertexIdx, setSelectedVertexIdx] = useState<number | null>(null);
const [vertexEditXInput, setVertexEditXInput] = useState<string>('');
const [vertexEditYInput, setVertexEditYInput] = useState<string>('');
// Extrude depth (required from user, no default) and local Three.js extruded mesh state
const [extrudeDepthMmInput, setExtrudeDepthMmInput] = useState<string>('');
const [extrudedPart, setExtrudedPart] = useState<{
  outerMm: VectorPoint[];
  holesMm: VectorPoint[][];
  depthMm: number;
  widthMm: number;
  heightMm: number;
  triangleCount: number;
  partName: string;
} | null>(null);
const overlaySvgRef = useRef<SVGSVGElement | null>(null);
const extrudePreviewMountRef = useRef<HTMLDivElement | null>(null);
const extrudedGroupRef = useRef<THREE.Group | null>(null);

  const matrix = useMemo(() => getManufacturingMatrix(config, specs), [config, specs]);
  const activePartEntry = useMemo(
    () => matrix.find((m) => m.id === selectedPartKey) || matrix[0],
    [matrix, selectedPartKey]
  );

  const activeCamOp = useMemo(
    () => CAM_OPERATIONS.find((op) => op.id === selectedCamOpId) || CAM_OPERATIONS[0],
    [selectedCamOpId]
  );
  const camPartEntry = useMemo(
    () => matrix.find((m) => m.id === activeCamOp.partKey) || matrix[0],
    [matrix, activeCamOp.partKey]
  );

  const handleSelectCamOp = (opId: string) => {
    const op = CAM_OPERATIONS.find((o) => o.id === opId);
    if (!op) return;
    setSelectedCamOpId(op.id);
    setToolDiaIn(op.toolDiaIn);
    setFlutes(op.flutes);
    setSpindleRpm(op.spindleRpm);
    setFeedIpm(op.feedIpm);
    setDocIn(op.docIn);
    setStepoverPct(op.stepoverPct);
    setStockIn(op.stockIn);
    setSelectedPartKey(op.partKey);
  };

  // Real CAM Physics Calculations
  const camMetrics = useMemo(() => {
    const sfm = Math.round((Math.PI * toolDiaIn * spindleRpm) / 12);
    const chipLoadIpt = +(feedIpm / Math.max(1, spindleRpm * flutes)).toFixed(5);
    const radialWoc = toolDiaIn * (stepoverPct / 100);
    const mrr = +(docIn * radialWoc * feedIpm).toFixed(3);
    // Scallop roughness prediction (ball-nose cusp height approximation in micro-inches)
    const cuspIn = (radialWoc * radialWoc) / (8 * Math.max(0.05, toolDiaIn * 0.5));
    const raUin = Math.max(4, Math.min(125, Math.round(cuspIn * 1_000_000 * 0.25)));
    const volumeEstIn3 = activeCamOp.partKey === 'block' ? 18.5 : activeCamOp.partKey === 'heads' ? 11.4 : 6.2;
    const mins = Math.max(4, Math.round(volumeEstIn3 / Math.max(0.08, mrr) + 6));
    return {
      sfm,
      chipLoadIpt,
      radialWoc: +radialWoc.toFixed(4),
      mrr,
      raUin,
      cycleTimeEst: `${mins} min / op`
    };
  }, [toolDiaIn, spindleRpm, flutes, feedIpm, docIn, stepoverPct, activeCamOp.partKey]);

  // Live RS-274 CNC G-Code Program synchronized to Bore / Stroke / Head Port / CAM params
  const gcodeProgram = useMemo(() => {
    const boreR = +(config.bore * 0.5 - toolDiaIn * 0.5 - stockIn).toFixed(4);
    const deckZ = +(-config.deckClearance - docIn).toFixed(4);
    const portR = +(((config.intakePortCc ?? 185) / 185) * 0.85).toFixed(4);
    return [
      `%`,
      `O${String(specs.displacementCi).padStart(4, '0')} (${drawingNumber} - ${activeCamOp.label.toUpperCase()})`,
      `(SPEC: BORE ${config.bore.toFixed(3)} X STROKE ${config.stroke.toFixed(3)} | CR ${specs.staticCR}:1 | QUENCH ${specs.quenchDistance})`,
      `(TOOL: ${activeCamOp.toolDesc} | DIA ${toolDiaIn.toFixed(4)} | ${flutes} FL)`,
      `(CALC: ${camMetrics.sfm} SFM | ${camMetrics.chipLoadIpt} IPT | MRR ${camMetrics.mrr} IN3/MIN | RA ${camMetrics.raUin} UIN)`,
      `G90 G94 G17 G49 G40 G80`,
      `G20 (INCH MODE)`,
      `T01 M06 (${activeCamOp.partKey.toUpperCase()} FINISHING TOOL)`,
      `G54 G00 X0.0000 Y0.0000`,
      `S${spindleRpm} M03`,
      `G43 Z1.5000 H01 M08 (${activeCamOp.coolant.toUpperCase()})`,
      `G00 X${boreR.toFixed(4)} Y0.0000`,
      `G01 Z${deckZ.toFixed(4)} F${Math.max(8, Math.round(feedIpm * 0.35)).toFixed(1)}`,
      `G03 I-${boreR.toFixed(4)} J0.0000 Z${(deckZ - docIn).toFixed(4)} F${feedIpm.toFixed(1)} (HELICAL BORE INTERPOLATION)`,
      `G03 I-${boreR.toFixed(4)} J0.0000 Z${(deckZ - docIn * 2).toFixed(4)}`,
      `G01 X${portR.toFixed(4)} Y0.2500 F${feedIpm.toFixed(1)} (5-AXIS PORT CONTOUR PASS)`,
      `G02 X${(-portR).toFixed(4)} Y-0.2500 R${(portR * 1.15).toFixed(4)}`,
      `G00 Z2.5000 M09`,
      `G91 G28 Z0.0000 M05`,
      `M30`,
      `%`
    ].join('\n');
  }, [
    specs.displacementCi,
    specs.staticCR,
    specs.quenchDistance,
    config.bore,
    config.stroke,
    config.deckClearance,
    config.intakePortCc,
    toolDiaIn,
    stockIn,
    docIn,
    flutes,
    spindleRpm,
    feedIpm,
    drawingNumber,
    activeCamOp,
    camMetrics
  ]);

  const notify = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 4000);
  };

  const buildStudioDesignPackage = (sourceSub: DesignStudioSubPageId): MountedStudioDesign => {
    const sheet: TechDrawingSheet = {
      id: `studio_${Date.now()}`,
      domain: 'engine',
      drawingNumber,
      title: designTitle,
      subtitle: `${revision} · ${toleranceClass} · ${projectionAngle}`,
      sourceLabel: 'MODSIM CAD/CAM Design Studio',
      unitSummary: `${specs.displacementCi} CID (${config.bore.toFixed(3)}" × ${config.stroke.toFixed(3)}") · ${specs.staticCR}:1 CR · Quench ${specs.quenchDistance}"`,
      dimensions: {
        bore: config.bore,
        stroke: config.stroke,
        rodLength: config.rodLength,
        deckHeight: config.deckHeight,
        deckClearance: config.deckClearance,
        gasketThickness: config.gasketThickness,
        chamberCc: config.chamberCc
      },
      callouts: customCallouts,
      updatedAt: new Date().toLocaleTimeString()
    };

    return {
      id: `pkg_${Date.now()}`,
      title: designTitle,
      drawingNumber,
      revision,
      partKey: sourceSub === 'cam_toolpath' ? activeCamOp.partKey : selectedPartKey,
      sourceSubPage: sourceSub,
      toleranceClass,
      surfaceFinishRa:
        sourceSub === 'cam_toolpath' ? `Ra ${camMetrics.raUin} µin (Predicted)` : surfaceFinishTarget,
      camOperation: sourceSub === 'cam_toolpath' ? activeCamOp.label : undefined,
      toolSpec: sourceSub === 'cam_toolpath' ? activeCamOp.toolDesc : undefined,
      spindleRpm: sourceSub === 'cam_toolpath' ? spindleRpm : undefined,
      feedRateIpm: sourceSub === 'cam_toolpath' ? feedIpm : undefined,
      mrrIn3Min: sourceSub === 'cam_toolpath' ? camMetrics.mrr : undefined,
      cycleTimeEst: sourceSub === 'cam_toolpath' ? camMetrics.cycleTimeEst : undefined,
      gcodeSnippet: sourceSub === 'cam_toolpath' ? gcodeProgram : undefined,
      configUpdates: {
        bore: config.bore,
        stroke: config.stroke,
        rodLength: config.rodLength,
        deckHeight: config.deckHeight,
        deckClearance: config.deckClearance,
        gasketThickness: config.gasketThickness,
        chamberCc: config.chamberCc,
        intakePortCc: config.intakePortCc,
        intakeValveIn: config.intakeValveIn,
        exhaustPortCc: config.exhaustPortCc,
        exhaustValveIn: config.exhaustValveIn,
        pistonAlloy: config.pistonAlloy
      },
      drawingSheet: sheet,
      mountedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleSaveCurrent = (sourceSub: DesignStudioSubPageId) => {
    const pkg = buildStudioDesignPackage(sourceSub);
    onSaveStudioDesign(pkg);
    notify(`Saved "${pkg.drawingNumber}" to Studio Designs Tray.`);
  };

  const handleMountCurrent = (sourceSub: DesignStudioSubPageId, launchCinematic = false) => {
    const pkg = buildStudioDesignPackage(sourceSub);
    onMountDesignToTestArea(pkg, launchCinematic);
  };

  const handleExportCadSvg = () => {
    if (!cadSvgRef.current) return;
    const xml = new XMLSerializer().serializeToString(cadSvgRef.current);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${drawingNumber}-${revision.replace(/\s+/g, '')}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Exported ASME CAD vector sheet (${drawingNumber}.svg).`);
  };

  const handleExportCadDxf = () => {
    exportPartProfileToDXF({
      drawingNumber,
      title: designTitle,
      partKey: selectedPartKey,
      bore: config.bore,
      stroke: config.stroke,
      rodLength: config.rodLength,
      deckHeight: config.deckHeight,
      chamberCc: config.chamberCc,
      filename: `${drawingNumber}.dxf`
    });
    notify(`Exported AutoCAD R12 DXF (${drawingNumber}.dxf).`);
  };

  const handleDownloadGcode = () => {
    const blob = new Blob([gcodeProgram], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${drawingNumber}-${activeCamOp.id}.nc`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Exported RS-274 CNC G-Code (${drawingNumber}-${activeCamOp.id}.nc).`);
  };

  const cadPalette = useMemo(() => {
    if (paperTheme === 'vellum') {
      return {
        bg: '#f8fafc',
        gridMinor: '#e2e8f0',
        gridMajor: '#cbd5e1',
        stroke: '#0f172a',
        muted: '#475569',
        dim: '#0284c7',
        accent: '#c2410c',
        hatch: '#94a3b8',
        fill: '#e2e8f0',
        panelBg: '#ffffff'
      };
    }
    if (paperTheme === 'obsidian') {
      return {
        bg: '#090c11',
        gridMinor: '#121822',
        gridMajor: '#1c2636',
        stroke: '#f8fafc',
        muted: '#94a3b8',
        dim: '#22d3ee',
        accent: '#fb923c',
        hatch: '#334155',
        fill: '#131b26',
        panelBg: '#0d1117'
      };
    }
    return {
      bg: '#091628',
      gridMinor: '#10243e',
      gridMajor: '#183457',
      stroke: '#e2e8f0',
      muted: '#94a3b8',
      dim: '#38bdf8',
      accent: '#fb923c',
      hatch: '#38bdf8',
      fill: '#0e223d',
      panelBg: '#091628'
    };
  }, [paperTheme]);

  const activeCallout = customCallouts[selectedCalloutIdx] || customCallouts[0];

  const handleUpdateCalloutField = (field: keyof TechDrawingCallout, value: string) => {
    setCustomCallouts((prev) =>
      prev.map((c, idx) => (idx === selectedCalloutIdx ? { ...c, [field]: value } : c))
    );
  };

  const handleAddCallout = () => {
    const nextIdx = customCallouts.length + 1;
    const newItem: TechDrawingCallout = {
      row: String(nextIdx),
      indexCode: `E-${100 + nextIdx * 10}`,
      partName: 'Custom Machined Subassembly',
      partNumber: `CUST-${nextIdx}00`,
      category: 'Custom CAD Datum',
      clearanceSpec: `±0.0005" GD&T`,
      torqueSpec: 'ARP Spec',
      material: '7075-T6 Billet',
      notes: 'Inspect per ASME Y14.5 datum frame.',
      targetSubassembly: 'intake'
    };
    setCustomCallouts((prev) => [...prev, newItem]);
    setSelectedCalloutIdx(customCallouts.length);
  };

  const handleDeleteCallout = (idx: number) => {
    if (customCallouts.length <= 1) return;
    setCustomCallouts((prev) => prev.filter((_, i) => i !== idx));
    setSelectedCalloutIdx(0);
  };

  // Dynamic parametric pixel coordinates for CAD Drafting Sheet
  const boreScaled = Math.max(76, Math.min(130, config.bore * 26));
  const strokeScaled = Math.max(70, Math.min(125, config.stroke * 27));
  const deckY = 178;
  const gasketH = Math.max(6, Math.min(14, config.gasketThickness * 200));
  const deckClearH = Math.max(3, Math.min(12, config.deckClearance * 280));
  const cxCross = 230;
  const cxOrtho = 610;

const activeContours = draftContours ?? traceResult?.contours ?? null;
const selectedContour: VectorContour | null =
  activeContours && activeContours.length > 0 ? (activeContours[selectedContourIdx] ?? activeContours[0] ?? null) : null;
const selectedContourPxBounds = useMemo(() => {
  if (!selectedContour || selectedContour.points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < selectedContour.points.length; i++) {
    const p = selectedContour.points[i];
    if (!p) continue;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    widthPx: maxX - minX,
    heightPx: maxY - minY,
  };
}, [selectedContour]);
const activePixelsPerMm: number | null = useMemo(() => {
  if (scaleInputMode === 'direct_px_per_mm') {
    if (directPxPerMmInput.trim() === '') return null;
    const val = Number(directPxPerMmInput);
    return Number.isFinite(val) && val > 0 ? val : null;
  }
  if (refSpanPxInput.trim() === '' || refSpanMmInput.trim() === '') return null;
  const px = Number(refSpanPxInput);
  const mm = Number(refSpanMmInput);
  if (!Number.isFinite(px) || !Number.isFinite(mm) || px <= 0 || mm <= 0) {
    return null;
  }
  return px / mm;
}, [scaleInputMode, directPxPerMmInput, refSpanPxInput, refSpanMmInput]);
const parsedExtrudeDepthMm: number | null = useMemo(() => {
  if (extrudeDepthMmInput.trim() === '') return null;
  const val = Number(extrudeDepthMmInput);
  return Number.isFinite(val) && val > 0 ? val : null;
}, [extrudeDepthMmInput]);
const transformPointsToCadMm = (
  contour: VectorContour,
  pixelsPerMm: number,
  frameOrigin: 'bottom_left' | 'center'
): {
  outerMm: VectorPoint[];
  holesMm: VectorPoint[][];
  widthMm: number;
  heightMm: number;
  minXMm: number;
  maxXMm: number;
  minYMm: number;
  maxYMm: number;
} => {
  const rawOuter = scalePointsToMm(contour.points, pixelsPerMm);
  const rawHoles = contour.holes.map((h) => scalePointsToMm(h, pixelsPerMm));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < rawOuter.length; i++) {
    const p = rawOuter[i];
    if (!p) continue;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const widthMm = maxX - minX;
  const heightMm = maxY - minY;
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const toCad = (pt: VectorPoint): VectorPoint => {
    if (frameOrigin === 'center') {
      return { x: pt.x - cx, y: cy - pt.y };
    }
    return { x: pt.x - minX, y: maxY - pt.y };
  };
  const signedArea = (pts: VectorPoint[]): number => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (!a || !b) continue;
      s += a.x * b.y - b.x * a.y;
    }
    return s * 0.5;
  };
  const outerMm = rawOuter.map(toCad);
  if (signedArea(outerMm) < 0) {
    outerMm.reverse();
  }
  const holesMm = rawHoles.map((hole) => {
    const mapped = hole.map(toCad);
    if (signedArea(mapped) > 0) {
      mapped.reverse();
    }
    return mapped;
  });
  return {
    outerMm,
    holesMm,
    widthMm,
    heightMm,
    minXMm: frameOrigin === 'center' ? -widthMm * 0.5 : 0,
    maxXMm: frameOrigin === 'center' ? widthMm * 0.5 : widthMm,
    minYMm: frameOrigin === 'center' ? -heightMm * 0.5 : 0,
    maxYMm: frameOrigin === 'center' ? heightMm * 0.5 : heightMm,
  };
};
const scaledPreviewMetrics = useMemo(() => {
  if (!selectedContour || activePixelsPerMm === null) return null;
  const cad = transformPointsToCadMm(selectedContour, activePixelsPerMm, originMode);
  return {
    widthMm: cad.widthMm,
    heightMm: cad.heightMm,
    outerMm: cad.outerMm,
    holesMm: cad.holesMm,
  };
}, [selectedContour, activePixelsPerMm, originMode]);
const resolvedTracedPartSlug = useMemo(() => {
  const raw =
    tracedPartName.trim() ||
    (imageFile ? imageFile.name.replace(/\.[^.]+$/, '') : '') ||
    designTitle.trim() ||
    drawingNumber;
  const sanitized = raw.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized || drawingNumber;
}, [tracedPartName, imageFile, designTitle, drawingNumber]);

useEffect(() => {
  return () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
  };
}, [imagePreviewUrl]);

useEffect(() => {
  if (!selectedContour || selectedVertexIdx === null) {
    setVertexEditXInput('');
    setVertexEditYInput('');
    return;
  }
  const pt = selectedContour.points[selectedVertexIdx];
  if (!pt) {
    setVertexEditXInput('');
    setVertexEditYInput('');
    return;
  }
  if (activePixelsPerMm !== null && selectedContourPxBounds) {
    const xMm =
      originMode === 'center' ? (pt.x - (selectedContourPxBounds.minX + selectedContourPxBounds.maxX) * 0.5) / activePixelsPerMm
        : (pt.x - selectedContourPxBounds.minX) / activePixelsPerMm;
    const yMm =
      originMode === 'center' ? ((selectedContourPxBounds.minY + selectedContourPxBounds.maxY) * 0.5 - pt.y) / activePixelsPerMm
        : (selectedContourPxBounds.maxY - pt.y) / activePixelsPerMm;
    setVertexEditXInput(String(xMm));
    setVertexEditYInput(String(yMm));
  } else {
    setVertexEditXInput(String(pt.x));
    setVertexEditYInput(String(pt.y));
  }
}, [selectedContour, selectedVertexIdx, activePixelsPerMm, originMode, selectedContourPxBounds]);

useEffect(() => {
  const mount = extrudePreviewMountRef.current;
  if (!mount || !extrudedPart) {
    extrudedGroupRef.current = null;
    return;
  }
  const width = Math.max(240, mount.clientWidth || 480);
  const height = Math.max(240, mount.clientHeight || 320);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  mount.innerHTML = '';
  mount.appendChild(renderer.domElement);
  const ambient = new THREE.AmbientLight(0xdbeafe, 0.75);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
  keyLight.position.set(1.2, 1.6, 1.4);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
  fillLight.position.set(-1.3, -0.8, -1.0);
  scene.add(fillLight);
  const shape = new THREE.Shape();
  const firstOuter = extrudedPart.outerMm[0];
  if (firstOuter) {
    shape.moveTo(firstOuter.x, firstOuter.y);
    for (let i = 1; i < extrudedPart.outerMm.length; i++) {
      const pt = extrudedPart.outerMm[i];
      if (pt) shape.lineTo(pt.x, pt.y);
    }
    shape.closePath();
  }
  for (let h = 0; h < extrudedPart.holesMm.length; h++) {
    const hole = extrudedPart.holesMm[h];
    if (!hole || hole.length < 3) continue;
    const holeFirst = hole[0];
    if (!holeFirst) continue;
    const holePath = new THREE.Path();
    holePath.moveTo(holeFirst.x, holeFirst.y);
    for (let i = 1; i < hole.length; i++) {
      const pt = hole[i];
      if (pt) holePath.lineTo(pt.x, pt.y);
    }
    holePath.closePath();
    shape.holes.push(holePath);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: extrudedPart.depthMm,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.25,
    roughness: 0.42,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const edgesGeometry = new THREE.EdgesGeometry(geometry, 15);
  const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xe0f2fe });
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  edges.userData._excludeExport = true;
  const partGroup = new THREE.Group();
  partGroup.add(mesh);
  partGroup.add(edges);
  scene.add(partGroup);
  extrudedGroupRef.current = partGroup;
  const bbox = new THREE.Box3().setFromObject(partGroup);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bbox.getCenter(center);
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const gridSize = Math.max(10, Math.ceil(maxDim * 2.2));
  const grid = new THREE.GridHelper(gridSize, 16, 0x334155, 0x1e293b);
  grid.rotation.x = Math.PI * 0.5;
  grid.position.set(center.x, center.y, -0.05);
  grid.userData._excludeExport = true;
  scene.add(grid);
  const axes = new THREE.AxesHelper(maxDim * 0.35);
  axes.userData._excludeExport = true;
  scene.add(axes);
  let theta = Math.PI * 0.24;
  let phi = Math.PI * 0.34;
  let radius = maxDim * 2.1;
  camera.near = Math.max(0.01, maxDim * 0.002);
  camera.far = Math.max(1000, maxDim * 80);
  camera.updateProjectionMatrix();
  const updateCamera = () => {
    const sinPhi = Math.sin(phi);
    camera.position.set(
      center.x + radius * sinPhi * Math.sin(theta),
      center.y - radius * sinPhi * Math.cos(theta),
      center.z + radius * Math.cos(phi)
    );
    camera.up.set(0, 0, 1);
    camera.lookAt(center);
  };
  updateCamera();
  let isDragging = false;
  let lastClientX = 0;
  let lastClientY = 0;
  const onPointerDown = (ev: PointerEvent) => {
    isDragging = true;
    lastClientX = ev.clientX;
    lastClientY = ev.clientY;
    renderer.domElement.setPointerCapture(ev.pointerId);
  };
  const onPointerMove = (ev: PointerEvent) => {
    if (!isDragging) return;
    const dx = ev.clientX - lastClientX;
    const dy = ev.clientY - lastClientY;
    lastClientX = ev.clientX;
    lastClientY = ev.clientY;
    theta -= dx * 0.01;
    phi = Math.min(Math.PI - 0.08, Math.max(0.08, phi - dy * 0.01));
    updateCamera();
  };
  const onPointerUp = (ev: PointerEvent) => {
    isDragging = false;
    if (renderer.domElement.hasPointerCapture(ev.pointerId)) {
      renderer.domElement.releasePointerCapture(ev.pointerId);
    }
  };
  const onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    const factor = ev.deltaY > 0 ? 1.12 : 0.89;
    radius = Math.min(maxDim * 20, Math.max(maxDim * 0.4, radius * factor));
    updateCamera();
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  const resizeObserver = new ResizeObserver(() => {
    if (!mount) return;
    const nextW = Math.max(240, mount.clientWidth || width);
    const nextH = Math.max(240, mount.clientHeight || height);
    camera.aspect = nextW / nextH;
    camera.updateProjectionMatrix();
    renderer.setSize(nextW, nextH);
  });
  resizeObserver.observe(mount);
  let rafId = 0;
  const renderLoop = () => {
    renderer.render(scene, camera);
    rafId = window.requestAnimationFrame(renderLoop);
  };
  renderLoop();
  return () => {
    window.cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    renderer.domElement.removeEventListener('wheel', onWheel);
    geometry.dispose();
    material.dispose();
    edgesGeometry.dispose();
    edgesMaterial.dispose();
    renderer.dispose();
    extrudedGroupRef.current = null;
    if (renderer.domElement.parentNode === mount) {
      mount.removeChild(renderer.domElement);
    }
  };
}, [extrudedPart]);
const runVectorTrace = async (
  fileToTrace: File,
  opts?: { resetThresholdToAuto?: boolean }
): Promise<void> => {
  const rdpEpsilon = Number(rdpEpsilonInput);
  if (rdpEpsilonInput.trim() === '' || !Number.isFinite(rdpEpsilon) || rdpEpsilon < 0) {
    const msg = 'RDP epsilon must be a finite number >= 0.';
    setTraceError(msg);
    notify(msg);
    return;
  }
  const minContourArea = Number(minContourAreaInput);
  if (
    minContourAreaInput.trim() === '' ||
    !Number.isFinite(minContourArea) ||
    minContourArea < 0
  ) {
    const msg = 'Minimum contour area must be a finite number >= 0.';
    setTraceError(msg);
    notify(msg);
    return;
  }
  let thresholdVal: number | undefined = undefined;
  if (!opts?.resetThresholdToAuto && thresholdOverrideInput.trim() !== '') {
    const parsedT = Number(thresholdOverrideInput);
    if (!Number.isFinite(parsedT) || parsedT < 0 || parsedT > 255) {
      const msg = 'Threshold override must be a finite number between 0 and 255.';
      setTraceError(msg);
      notify(msg);
      return;
    }
    thresholdVal = parsedT;
  }

  setIsTracing(true);
  setTraceError(null);
  setExtrudedPart(null);
  setSelectedVertexIdx(null);
  try {
    const result = await vectorizeImageFile(fileToTrace, {
      threshold: thresholdVal,
      rdpEpsilon,
      minContourArea,
    });
    setTraceResult(result);
    setDraftContours(
      result.contours.map((c) => ({
        points: c.points.map((p) => ({ x: p.x, y: p.y })),
        holes: c.holes.map((h) => h.map((p) => ({ x: p.x, y: p.y }))),
      }))
    );
    setSelectedContourIdx(0);
    if (opts?.resetThresholdToAuto) {
      setThresholdOverrideInput('');
    }
    notify(`Traced ${result.contours.length} outer contour(s) at threshold ${result.thresholdUsed} (RDP ε=${rdpEpsilon} px).`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Image vectorization failed.';
    setTraceResult(null);
    setDraftContours(null);
    setTraceError(msg);
    notify(`Trace error: ${msg}`);
  } finally {
    setIsTracing(false);
  }
};
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
  const file = e.target.files?.[0];
  if (!file) return;
  const lower = file.name.toLowerCase();
  const validType =
    file.type === 'image/png' ||
    file.type === 'image/jpeg' ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg');
  if (!validType) {
    const msg = `Unsupported file "${file.name}". Please upload a PNG or JPG image.`;
    setTraceError(msg);
    notify(msg);
    return;
  }
  if (imagePreviewUrl) {
    URL.revokeObjectURL(imagePreviewUrl);
  }
  const nextUrl = URL.createObjectURL(file);
  setImageFile(file);
  setImagePreviewUrl(nextUrl);
  setTracedPartName(file.name.replace(/\.[^.]+$/, ''));
  setThresholdOverrideInput('');
  setTraceResult(null);
  setDraftContours(null);
  setExtrudedPart(null);
  setCaliperPoints([]);
  setSelectedVertexIdx(null);
  setTraceError(null);
  await runVectorTrace(file, { resetThresholdToAuto: true });
};
const handleTrace = async (resetToOtsu = false): Promise<void> => {
  if (!imageFile) {
    const msg = 'Upload a PNG or JPG image before tracing.';
    setTraceError(msg);
    notify(msg);
    return;
  }
  await runVectorTrace(imageFile, { resetThresholdToAuto: resetToOtsu });
};
const handleOverlaySvgClick = (e: React.MouseEvent<SVGSVGElement>): void => {
  if (!traceResult || !overlaySvgRef.current) return;
  if (overlayTool === 'inspect') return;
  const rect = overlaySvgRef.current.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const pxX = ((e.clientX - rect.left) / rect.width) * traceResult.width;
  const pxY = ((e.clientY - rect.top) / rect.height) * traceResult.height;
  if (overlayTool === 'caliper') {
    const nextPts = caliperPoints.length >= 2 ? [{ x: pxX, y: pxY }] : [...caliperPoints, { x: pxX, y: pxY }];
    setCaliperPoints(nextPts);
    if (nextPts.length === 2) {
      const a = nextPts[0];
      const b = nextPts[1];
      if (a && b) {
        const distPx = Math.hypot(b.x - a.x, b.y - a.y);
        setScaleInputMode('reference_span');
        setRefSpanPxInput(String(distPx));
        notify(`Measured reference span: ${distPx.toFixed(2)} px. Enter the real mm length.`);
      }
    }
    return;
  }
  if (overlayTool === 'edit_vertices' && selectedContour && activeContours) {
    if (selectedVertexIdx !== null) {
      const insertAfter = selectedVertexIdx;
      const updatedContours = activeContours.map((c, idx) => {
        if (idx !== selectedContourIdx) return c;
        const nextPts = c.points.slice();
        nextPts.splice(insertAfter + 1, 0, { x: pxX, y: pxY });
        return { ...c, points: nextPts };
      });
      setDraftContours(updatedContours);
      setSelectedVertexIdx(insertAfter + 1);
      setExtrudedPart(null);
    }
  }
};
const handleApplyVertexEdit = (): void => {
  if (selectedVertexIdx === null || !selectedContour || !activeContours) return;
  const xInput = Number(vertexEditXInput);
  const yInput = Number(vertexEditYInput);
  if (
    vertexEditXInput.trim() === '' ||
    vertexEditYInput.trim() === '' ||
    !Number.isFinite(xInput) ||
    !Number.isFinite(yInput)
  ) {
    notify('Vertex X and Y must both be valid finite numbers.');
    return;
  }
  let nextPxX = xInput;
  let nextPxY = yInput;
  if (activePixelsPerMm !== null && selectedContourPxBounds) {
    nextPxX =
      originMode === 'center' ? (selectedContourPxBounds.minX + selectedContourPxBounds.maxX) * 0.5 + xInput * activePixelsPerMm
        : selectedContourPxBounds.minX + xInput * activePixelsPerMm;
    nextPxY =
      originMode === 'center' ? (selectedContourPxBounds.minY + selectedContourPxBounds.maxY) * 0.5 - yInput * activePixelsPerMm
        : selectedContourPxBounds.maxY - yInput * activePixelsPerMm;
  }
  const updatedContours = activeContours.map((c, idx) => {
    if (idx !== selectedContourIdx) return c;
    const nextPts = c.points.map((pt, vIdx) => vIdx === selectedVertexIdx ? { x: nextPxX, y: nextPxY } : pt);
    return { ...c, points: nextPts };
  });
  setDraftContours(updatedContours);
  setExtrudedPart(null);
  notify(`Updated vertex #${selectedVertexIdx + 1}.`);
};
const handleDeleteSelectedVertex = (): void => {
  if (selectedVertexIdx === null || !selectedContour || !activeContours) return;
  if (selectedContour.points.length <= 3) {
    notify('Cannot delete vertex: a closed contour requires at least 3 vertices.');
    return;
  }
  const updatedContours = activeContours.map((c, idx) => {
    if (idx !== selectedContourIdx) return c;
    return {
      ...c,
      points: c.points.filter((_, vIdx) => vIdx !== selectedVertexIdx),
    };
  });
  setDraftContours(updatedContours);
  setSelectedVertexIdx(null);
  setExtrudedPart(null);
};
const handleExtrude = (): void => {
  if (!selectedContour) {
    notify('Trace a valid outer contour before extruding.');
    return;
  }
  if (activePixelsPerMm === null) {
    notify('Reference scale (pixels -> mm) is required from Ray before extruding.');
    return;
  }
  if (parsedExtrudeDepthMm === null) {
    notify('Extrude depth (mm) is required from Ray before extruding.');
    return;
  }
  const cad = transformPointsToCadMm(selectedContour, activePixelsPerMm, originMode);
  // Pre-compute triangle count via temporary Shape/ExtrudeGeometry to report exact mesh stats.
  const testShape = new THREE.Shape();
  const first = cad.outerMm[0];
  if (!first || cad.outerMm.length < 3) {
    notify('Selected contour is degenerate (< 3 vertices).');
    return;
  }
  testShape.moveTo(first.x, first.y);
  for (let i = 1; i < cad.outerMm.length; i++) {
    const pt = cad.outerMm[i];
    if (pt) testShape.lineTo(pt.x, pt.y);
  }
  testShape.closePath();
  for (let h = 0; h < cad.holesMm.length; h++) {
    const hole = cad.holesMm[h];
    if (!hole || hole.length < 3 || !hole[0]) continue;
    const holePath = new THREE.Path();
    holePath.moveTo(hole[0].x, hole[0].y);
    for (let i = 1; i < hole.length; i++) {
      const pt = hole[i];
      if (pt) holePath.lineTo(pt.x, pt.y);
    }
    holePath.closePath();
    testShape.holes.push(holePath);
  }
  const tempGeo = new THREE.ExtrudeGeometry(testShape, {
    depth: parsedExtrudeDepthMm,
    bevelEnabled: false,
    curveSegments: 1,
  });
  const triCount = tempGeo.index
    ? Math.floor(tempGeo.index.count / 3)
    : Math.floor((tempGeo.getAttribute('position')?.count ?? 0) / 3);
  tempGeo.dispose();

  setExtrudedPart({
    outerMm: cad.outerMm,
    holesMm: cad.holesMm,
    depthMm: parsedExtrudeDepthMm,
    widthMm: cad.widthMm,
    heightMm: cad.heightMm,
    triangleCount: triCount,
    partName: resolvedTracedPartSlug,
  });

  notify(`Extruded "${resolvedTracedPartSlug}" (${cad.widthMm.toFixed(2)} x ${cad.heightMm.toFixed(2)} x ${parsedExtrudeDepthMm} mm, ${triCount} triangles).`);
};
const handleExportTracedStl = (): void => {
  if (!extrudedGroupRef.current || !extrudedPart) {
    notify('Extrude the 2D profile before exporting STL.');
    return;
  }
  const filename = `${extrudedPart.partName}-extruded.stl`;
  // Scale factor is 1 because the extruded Three.js mesh is already constructed in millimetres.
  const tris = exportObject3DToSTL(extrudedGroupRef.current, filename, 1);
  notify(`Exported binary/ASCII STL in mm (${filename}, ${tris} triangles).`);
};
const handleExportTracedDxf = (): void => {
  if (!selectedContour || activePixelsPerMm === null) {
    notify('Trace a profile and enter a valid pixel-to-mm scale before exporting DXF.');
    return;
  }
  const cad = transformPointsToCadMm(selectedContour, activePixelsPerMm, originMode);
  const lines: string[] = [
    '0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$EXTMIN', '10', String(cad.minXMm), '20', String(cad.minYMm), '30', '0', '9', '$EXTMAX', '10', String(cad.maxXMm), '20', String(cad.maxYMm), '30', '0', '0', 'ENDSEC', '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '2', '0', 'LAYER', '2', 'PROFILE_OUTER', '70', '0', '62', '5', '6', 'CONTINUOUS', '0', 'LAYER', '2', 'PROFILE_HOLES', '70', '0', '62', '2', '6', 'CONTINUOUS', '0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES',
  ];
  const appendClosedPolyline = (pts: VectorPoint[], layer: string): void => {
    if (pts.length < 3) return;
    lines.push('0', 'POLYLINE', '8', layer, '66', '1', '70', '1', '10', '0', '20', '0', '30', '0');
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      if (!pt) continue;
      lines.push('0', 'VERTEX', '8', layer, '10', String(pt.x), '20', String(pt.y), '30', '0');
    }
    lines.push('0', 'SEQEND', '8', layer);
  };

  appendClosedPolyline(cad.outerMm, 'PROFILE_OUTER');
  for (let h = 0; h < cad.holesMm.length; h++) {
    const hole = cad.holesMm[h];
    if (hole) appendClosedPolyline(hole, 'PROFILE_HOLES');
  }

  lines.push('0', 'ENDSEC', '0', 'EOF');
  const filename = `${resolvedTracedPartSlug}-profile.dxf`;
  const blob = new Blob([lines.join('\n')], { type: 'application/dxf;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(`Exported AutoCAD R12 DXF profile in mm (${filename}).`);
};
const handleExportTracedSvg = (): void => {
  if (!selectedContour || activePixelsPerMm === null) {
    notify('Trace a profile and enter a valid pixel-to-mm scale before exporting SVG.');
    return;
  }
  const cad = transformPointsToCadMm(selectedContour, activePixelsPerMm, originMode);
  const buildRingPath = (pts: VectorPoint[]): string => {
    if (pts.length === 0) return '';
    const commands: string[] = [];
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      if (!pt) continue;
      // Flip CAD Y back to top-down SVG Y inside the exact mm viewBox.
      const svgX = pt.x;
      const svgY = cad.maxYMm - pt.y + cad.minYMm;
      commands.push(`${i === 0 ? 'M' : 'L'} ${svgX} ${svgY}`);
    }
    commands.push('Z');
    return commands.join(' ');
  };
  const dParts: string[] = [buildRingPath(cad.outerMm)];
  for (let h = 0; h < cad.holesMm.length; h++) {
    const hole = cad.holesMm[h];
    if (hole && hole.length >= 3) {
      dParts.push(buildRingPath(hole));
    }
  }
  const svgContent = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cad.widthMm} mm" height="${cad.heightMm} mm" viewBox="${cad.minXMm} ${cad.minYMm} ${cad.widthMm} ${cad.heightMm}">`,
    `  <title>${resolvedTracedPartSlug} (${cad.widthMm} mm x ${cad.heightMm} mm)</title>`,
    `  <path d="${dParts.join(' ')}" fill="none" stroke="#000000" stroke-width="0.2" fill-rule="evenodd" />`,
    '</svg>',
  ].join('\n');
  const filename = `${resolvedTracedPartSlug}-profile.svg`;
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(`Exported 2D vector SVG in mm (${filename}).`);
};

  return (
    <div className="p-4 sm:p-5 space-y-4 max-w-[1680px] mx-auto select-none">
      {/* Studio Header & 4-Subpage Navigation */}
      <div className="bg-[#12161c] border border-slate-800 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-extrabold tracking-tight text-white">
              3D / CAD / CAM Design Studio
            </h2>
            <span className="text-xs font-mono text-orange-400">
              {drawingNumber} · {revision}
            </span>
            {mountedDesign && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mounted in Engine Test Area ({mountedDesign.drawingNumber})</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Author parametric 3D components, ASME Y14.5 CAD technical drawings, 5-axis CNC CAM toolpaths &amp; G-code, and launch directly into the Engine Dynamic Graphics Test Area.
          </p>
        </div>

        {/* Sub-page Segmented Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-[#0d1014] border border-slate-800 p-1 rounded-lg">
          {(
            [
              { id: '3d_creator', label: '1. 3D Parametric Creator', icon: <Box className="w-3.5 h-3.5" /> },
              { id: 'cad_drafting', label: '2. CAD Technical Drawing', icon: <Compass className="w-3.5 h-3.5" /> },
              { id: 'cam_toolpath', label: '3. CAM Toolpath & G-Code', icon: <Cpu className="w-3.5 h-3.5" /> },
              { id: 'render_gallery', label: '4. Cinematic Render Lab', icon: <Film className="w-3.5 h-3.5" /> }
            ] as Array<{ id: DesignStudioSubPageId; label: string; icon: React.ReactNode }>
          ).map((sp) => {
            const active = activeSubPage === sp.id;
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => onChangeSubPage(sp.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                  active
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {sp.icon}
                <span>{sp.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {statusNotice && (
        <div className="bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-lg text-xs font-medium flex items-center justify-between">
          <span>{statusNotice}</span>
          <button
            type="button"
            onClick={() => onJumpToTab('block3d')}
            className="text-white font-semibold underline hover:text-emerald-200"
          >
            Open Engine Test Area
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-PAGE 1: 3D PARAMETRIC PART & ASSEMBLY CREATOR                     */}
      {/* ===================================================================== */}
      {activeSubPage === '3d_creator' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left: 3D Component Viewport */}
          <div className="xl:col-span-8 space-y-3">
            {/* Component Selector Strip */}
            <div className="bg-[#12161c] border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 px-2">Component:</span>
              {matrix.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPartKey(item.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap ${
                    selectedPartKey === item.id
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'bg-[#0d1014] text-slate-300 border border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {item.partName.split('(')[0].trim()}
                </button>
              ))}
            </div>

            <Component3DTechRenderer
              partKey={selectedPartKey}
              entry={activePartEntry}
              config={config}
              specs={specs}
              renderMode={renderMode3d}
              onChangeRenderMode={setRenderMode3d}
              projection={projection3d}
              onChangeProjection={setProjection3d}
              viewportLayout={viewportLayout3d}
              onChangeViewportLayout={setViewportLayout3d}
            />
          </div>

          {/* Right: Parametric Geometry, Material & Mount Controls */}
          <div className="xl:col-span-4 bg-[#12161c] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-orange-400" />
                  <span>Parametric Design Authoring</span>
                </span>
                <span className="font-mono text-xs text-cyan-400 tabular-nums">
                  {specs.displacementCi} CID · {specs.staticCR}:1
                </span>
              </div>

              {/* Drawing Identity */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <label className="col-span-2 space-y-1">
                  <span className="text-[11px] text-slate-400">Assembly / Design Title</span>
                  <input
                    type="text"
                    value={designTitle}
                    onChange={(e) => setDesignTitle(e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:border-orange-500 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-slate-400">Drawing Number</span>
                  <input
                    type="text"
                    value={drawingNumber}
                    onChange={(e) => setDrawingNumber(e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-white focus:border-orange-500 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-slate-400">Revision</span>
                  <input
                    type="text"
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-white focus:border-orange-500 outline-none"
                  />
                </label>
              </div>

              {/* Core Dimensional Sliders */}
              <div className="space-y-2.5 bg-[#0d1014] border border-slate-800 rounded-lg p-3 text-xs">
                {[
                  {
                    label: 'Cylinder Bore',
                    val: `${config.bore.toFixed(3)}"`,
                    min: 3.74,
                    max: 4.185,
                    step: 0.005,
                    current: config.bore,
                    onChange: (v: number) => onUpdateConfig({ bore: v })
                  },
                  {
                    label: 'Crankshaft Stroke',
                    val: `${config.stroke.toFixed(3)}"`,
                    min: 3.0,
                    max: 4.0,
                    step: 0.01,
                    current: config.stroke,
                    onChange: (v: number) => onUpdateConfig({ stroke: v })
                  },
                  {
                    label: 'Connecting Rod Length',
                    val: `${config.rodLength.toFixed(3)}"`,
                    min: 5.565,
                    max: 6.25,
                    step: 0.025,
                    current: config.rodLength,
                    onChange: (v: number) => onUpdateConfig({ rodLength: v })
                  },
                  {
                    label: 'Piston Deck Clearance',
                    val: `${config.deckClearance.toFixed(3)}"`,
                    min: 0.0,
                    max: 0.045,
                    step: 0.001,
                    current: config.deckClearance,
                    onChange: (v: number) => onUpdateConfig({ deckClearance: v })
                  },
                  {
                    label: 'Head Gasket Thickness',
                    val: `${config.gasketThickness.toFixed(3)}"`,
                    min: 0.015,
                    max: 0.06,
                    step: 0.001,
                    current: config.gasketThickness,
                    onChange: (v: number) => onUpdateConfig({ gasketThickness: v })
                  },
                  {
                    label: 'Combustion Chamber',
                    val: `${config.chamberCc.toFixed(1)} cc`,
                    min: 48,
                    max: 82,
                    step: 0.5,
                    current: config.chamberCc,
                    onChange: (v: number) => onUpdateConfig({ chamberCc: v })
                  },
                  {
                    label: 'Intake Port Volume',
                    val: `${config.intakePortCc ?? 185} cc`,
                    min: 165,
                    max: 245,
                    step: 1,
                    current: config.intakePortCc ?? 185,
                    onChange: (v: number) => onUpdateConfig({ intakePortCc: v })
                  },
                  {
                    label: 'Intake Valve Diameter',
                    val: `${(config.intakeValveIn ?? 2.02).toFixed(3)}"`,
                    min: 1.94,
                    max: 2.125,
                    step: 0.005,
                    current: config.intakeValveIn ?? 2.02,
                    onChange: (v: number) => onUpdateConfig({ intakeValveIn: v })
                  }
                ].map((ctrl) => (
                  <div key={ctrl.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">{ctrl.label}</span>
                      <span className="font-mono font-semibold text-orange-400 tabular-nums">
                        {ctrl.val}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={ctrl.step}
                      value={ctrl.current}
                      onChange={(e) => ctrl.onChange(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* Alloy & GD&T Class */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <label className="space-y-1">
                  <span className="text-[11px] text-slate-400">Piston Alloy</span>
                  <select
                    value={config.pistonAlloy}
                    onChange={(e) => onUpdateConfig({ pistonAlloy: e.target.value as PistonAlloy })}
                    className="w-full bg-[#0d1014] border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white"
                  >
                    <option value="2618">2618-T61 Race Forged</option>
                    <option value="4032">4032-T6 Street Forged</option>
                    <option value="hypereutectic">Hypereutectic Cast</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-slate-400">GD&amp;T Tolerance Class</span>
                  <select
                    value={toleranceClass}
                    onChange={(e) => setToleranceClass(e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white"
                  >
                    <option value='AS9100 Class A (±0.0002")'>AS9100 Class A (±0.0002")</option>
                    <option value='Blueprinted Race (±0.0005")'>Blueprinted Race (±0.0005")</option>
                    <option value='OEM Production (±0.0015")'>OEM Production (±0.0015")</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Live Derived Engineering Summary + Mount Actions */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-3 gap-2 text-center bg-[#0d1014] border border-slate-800 rounded-lg p-2.5 font-mono tabular-nums">
                <div>
                  <div className="text-[10px] text-slate-500">QUENCH</div>
                  <div className="text-xs font-bold text-emerald-400">{specs.quenchDistance}"</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">ROD RATIO</div>
                  <div className="text-xs font-bold text-cyan-400">{specs.rodStrokeRatio}:1</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">DYNO EST</div>
                  <div className="text-xs font-bold text-orange-400">{specs.peakHp} HP</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveCurrent('3d_creator')}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-700 bg-[#0d1014] hover:border-cyan-500 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Save to Tray</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMountCurrent('3d_creator', true)}
                  className="flex-[1.5] px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Mount to Engine Test Area</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-PAGE 2: ASME Y14.5 CAD TECHNICAL DRAWING CREATOR                  */}
      {/* ===================================================================== */}
      {activeSubPage === 'cad_drafting' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left: Drafting Controls & Editable Callout Table */}
          <div className="xl:col-span-4 bg-[#12161c] border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>ASME Y14.5 Sheet Setup</span>
              </span>
              <div className="flex items-center gap-1">
                {(['blueprint', 'vellum', 'obsidian'] as CadPaperTheme[]).map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setPaperTheme(theme)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition ${
                      paperTheme === theme
                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                        : 'bg-[#0d1014] text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <label className="space-y-1">
                <span className="text-[11px] text-slate-400">Projection Standard</span>
                <select
                  value={projectionAngle}
                  onChange={(e) =>
                    setProjectionAngle(e.target.value as typeof projectionAngle)
                  }
                  className="w-full bg-[#0d1014] border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white"
                >
                  <option value="Third-Angle (ASME Y14.5)">Third-Angle (ASME Y14.5)</option>
                  <option value="First-Angle (ISO 128)">First-Angle (ISO 128)</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-slate-400">Sheet Scale</span>
                <select
                  value={drawingScale}
                  onChange={(e) => setDrawingScale(e.target.value as typeof drawingScale)}
                  className="w-full bg-[#0d1014] border border-slate-700 rounded-md px-2 py-1.5 text-xs font-mono text-white"
                >
                  <option value="1:1">SCALE 1:1 (FULL)</option>
                  <option value="1:2">SCALE 1:2 (HALF)</option>
                  <option value="2:1">SCALE 2:1 (DETAIL)</option>
                </select>
              </label>
            </div>

            {/* CAD Layer Toggles */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                <span>Drafting Layer Visibility</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { key: 'geometry', label: 'Geometry' },
                    { key: 'centerlines', label: 'Centerlines' },
                    { key: 'hatch', label: 'Section Hatch' },
                    { key: 'dimensions', label: 'Dimensions' },
                    { key: 'gdt', label: 'GD&T Datums' },
                    { key: 'balloons', label: 'Balloons' }
                  ] as Array<{ key: keyof typeof cadLayers; label: string }>
                ).map((lyr) => {
                  const on = cadLayers[lyr.key];
                  return (
                    <button
                      key={lyr.key}
                      type="button"
                      onClick={() =>
                        setCadLayers((prev) => ({ ...prev, [lyr.key]: !prev[lyr.key] }))
                      }
                      className={`px-2 py-1 rounded text-[11px] font-medium flex items-center justify-between border transition ${
                        on
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                          : 'bg-[#0d1014] border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="truncate">{lyr.label}</span>
                      {on ? <Eye className="w-3 h-3 shrink-0" /> : <EyeOff className="w-3 h-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable Callouts BOM List */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">
                  Interactive Callout Balloons ({customCallouts.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddCallout}
                  className="px-2 py-0.5 rounded bg-[#0d1014] border border-slate-700 hover:border-orange-500 text-[11px] text-orange-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Callout</span>
                </button>
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {customCallouts.map((c, idx) => (
                  <div
                    key={`${c.indexCode}_${idx}`}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition ${
                      selectedCalloutIdx === idx
                        ? 'bg-orange-600/15 border-orange-500/60 text-white'
                        : 'bg-[#0d1014] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedCalloutIdx(idx)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-orange-400">
                        {c.indexCode}
                      </span>
                      <span className="truncate">{c.partName}</span>
                    </div>
                    {customCallouts.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCallout(idx);
                        }}
                        className="text-slate-500 hover:text-red-400"
                        title="Remove Callout"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {activeCallout && (
                <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-2.5 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-0.5">
                      <span className="text-[10px] text-slate-400">Balloon Index</span>
                      <input
                        type="text"
                        value={activeCallout.indexCode}
                        onChange={(e) => handleUpdateCalloutField('indexCode', e.target.value)}
                        className="w-full bg-[#12161c] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[10px] text-slate-400">3D Target Assembly</span>
                      <select
                        value={activeCallout.targetSubassembly}
                        onChange={(e) =>
                          handleUpdateCalloutField('targetSubassembly', e.target.value)
                        }
                        className="w-full bg-[#12161c] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="block">Cylinder Block</option>
                        <option value="rotating">Rotating Pistons/Rods</option>
                        <option value="heads">Cylinder Heads</option>
                        <option value="crank">Crankshaft</option>
                        <option value="cam">Camshaft</option>
                        <option value="intake">Intake &amp; Carb</option>
                        <option value="ignition">Ignition / HEI</option>
                      </select>
                    </label>
                  </div>
                  <label className="block space-y-0.5">
                    <span className="text-[10px] text-slate-400">Component Name</span>
                    <input
                      type="text"
                      value={activeCallout.partName}
                      onChange={(e) => handleUpdateCalloutField('partName', e.target.value)}
                      className="w-full bg-[#12161c] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-0.5">
                      <span className="text-[10px] text-slate-400">Clearance / GD&amp;T</span>
                      <input
                        type="text"
                        value={activeCallout.clearanceSpec || ''}
                        onChange={(e) => handleUpdateCalloutField('clearanceSpec', e.target.value)}
                        className="w-full bg-[#12161c] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[10px] text-slate-400">Torque Spec</span>
                      <input
                        type="text"
                        value={activeCallout.torqueSpec || ''}
                        onChange={(e) => handleUpdateCalloutField('torqueSpec', e.target.value)}
                        className="w-full bg-[#12161c] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportCadSvg}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#0d1014] hover:border-cyan-500 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SVG Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCadDxf}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#0d1014] hover:border-emerald-500 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AutoCAD .DXF</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleMountCurrent('cad_drafting', false)}
                className="w-full px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Bring CAD Drawing into Engine Test Area</span>
              </button>
            </div>
          </div>

          {/* Right: Live Parametric Multi-View CAD Drawing Sheet */}
          <div className="xl:col-span-8 bg-[#12161c] border border-slate-800 rounded-xl p-3 flex flex-col">
            <div className="w-full overflow-x-auto rounded-lg border border-slate-800">
              <svg
                ref={cadSvgRef}
                viewBox="0 0 1000 640"
                className="w-full min-w-[760px] h-auto block"
                style={{ backgroundColor: cadPalette.bg }}
              >
                <defs>
                  <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke={cadPalette.gridMinor} strokeWidth="0.7" />
                  </pattern>
                  <pattern id="cad-grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
                    <rect width="100" height="100" fill="url(#cad-grid)" />
                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke={cadPalette.gridMajor} strokeWidth="1" />
                  </pattern>
                  <pattern
                    id="cad-hatch"
                    width="8"
                    height="8"
                    patternTransform="rotate(45 0 0)"
                    patternUnits="userSpaceOnUse"
                  >
                    <line x1="0" y1="0" x2="0" y2="8" stroke={cadPalette.hatch} strokeWidth="1.1" opacity="0.55" />
                  </pattern>
                </defs>

                <rect x="0" y="0" width="1000" height="640" fill="url(#cad-grid-major)" />
                <rect x="14" y="14" width="972" height="612" fill="none" stroke={cadPalette.stroke} strokeWidth="1.6" />
                <rect x="20" y="20" width="960" height="600" fill="none" stroke={cadPalette.muted} strokeWidth="0.6" />

                {/* View Titles */}
                <text x="42" y="44" fill={cadPalette.dim} fontSize="11" fontFamily="monospace" fontWeight="700">
                  VIEW A-A: SECTIONAL CYLINDER &amp; QUENCH STACKUP ({drawingScale})
                </text>
                <text x="460" y="44" fill={cadPalette.dim} fontSize="11" fontFamily="monospace" fontWeight="700">
                  VIEW B: ORTHOGRAPHIC DECK &amp; BORE ARRAY ({projectionAngle.split(' ')[0]})
                </text>

                {/* VIEW A-A: Parametric Cross-Section */}
                {cadLayers.geometry && (
                  <g>
                    {/* Cylinder Head Casting */}
                    <rect
                      x={cxCross - boreScaled * 0.78}
                      y={76}
                      width={boreScaled * 1.56}
                      height={deckY - gasketH - 76}
                      fill={cadLayers.hatch ? 'url(#cad-hatch)' : cadPalette.fill}
                      stroke={cadPalette.stroke}
                      strokeWidth="1.8"
                    />
                    {/* Combustion Chamber Cutout */}
                    <path
                      d={`M ${cxCross - boreScaled * 0.44} ${deckY - gasketH} L ${cxCross - boreScaled * 0.34} ${deckY - gasketH - 26} L ${cxCross + boreScaled * 0.34} ${deckY - gasketH - 26} L ${cxCross + boreScaled * 0.44} ${deckY - gasketH} Z`}
                      fill={cadPalette.bg}
                      stroke={cadPalette.stroke}
                      strokeWidth="1.5"
                    />
                    {/* Head Gasket */}
                    <rect
                      x={cxCross - boreScaled * 0.74}
                      y={deckY - gasketH}
                      width={boreScaled * 1.48}
                      height={gasketH}
                      fill={cadPalette.accent}
                      opacity="0.7"
                    />
                    {/* Left & Right Block Deck Walls */}
                    <rect
                      x={cxCross - boreScaled * 0.78}
                      y={deckY}
                      width={boreScaled * 0.28}
                      height={190}
                      fill={cadLayers.hatch ? 'url(#cad-hatch)' : cadPalette.fill}
                      stroke={cadPalette.stroke}
                      strokeWidth="1.8"
                    />
                    <rect
                      x={cxCross + boreScaled * 0.5}
                      y={deckY}
                      width={boreScaled * 0.28}
                      height={190}
                      fill={cadLayers.hatch ? 'url(#cad-hatch)' : cadPalette.fill}
                      stroke={cadPalette.stroke}
                      strokeWidth="1.8"
                    />
                    {/* Bore Cavity */}
                    <rect
                      x={cxCross - boreScaled * 0.5}
                      y={deckY}
                      width={boreScaled}
                      height={190}
                      fill="none"
                      stroke={cadPalette.stroke}
                      strokeWidth="1.8"
                    />
                    {/* Piston Crown at TDC */}
                    <rect
                      x={cxCross - boreScaled * 0.48}
                      y={deckY + deckClearH}
                      width={boreScaled * 0.96}
                      height={66}
                      fill={cadPalette.fill}
                      stroke={cadPalette.stroke}
                      strokeWidth="1.8"
                    />
                    {/* H-Beam Connecting Rod & Crankpin */}
                    <line
                      x1={cxCross}
                      y1={deckY + deckClearH + 42}
                      x2={cxCross}
                      y2={deckY + deckClearH + 42 + strokeScaled * 1.15}
                      stroke={cadPalette.stroke}
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={cxCross}
                      cy={deckY + deckClearH + 42}
                      r="10"
                      fill={cadPalette.bg}
                      stroke={cadPalette.accent}
                      strokeWidth="2"
                    />
                    <circle
                      cx={cxCross}
                      cy={deckY + deckClearH + 42 + strokeScaled * 1.15}
                      r="20"
                      fill={cadPalette.bg}
                      stroke={cadPalette.stroke}
                      strokeWidth="2"
                    />
                    <circle
                      cx={cxCross}
                      cy={deckY + deckClearH + 74 + strokeScaled * 1.15}
                      r="34"
                      fill="none"
                      stroke={cadPalette.muted}
                      strokeWidth="1.4"
                      strokeDasharray="6 3"
                    />
                  </g>
                )}

                {/* Centerlines */}
                {cadLayers.centerlines && (
                  <g stroke={cadPalette.accent} strokeWidth="1" strokeDasharray="12 4 3 4" opacity="0.85">
                    <line x1={cxCross} y1={58} x2={cxCross} y2={520} />
                    <line x1={cxOrtho} y1={65} x2={cxOrtho} y2={380} />
                    <line x1={440} y1={220} x2={930} y2={220} />
                  </g>
                )}

                {/* VIEW B: Top Deck Orthographic 4-Cylinder Bank Array */}
                {cadLayers.geometry && (
                  <g>
                    <rect
                      x={465}
                      y={120}
                      width={445}
                      height={200}
                      rx="6"
                      fill={cadPalette.fill}
                      fillOpacity="0.4"
                      stroke={cadPalette.stroke}
                      strokeWidth="1.8"
                    />
                    {[0, 1, 2, 3].map((cylIdx) => {
                      const bx = 528 + cylIdx * 106;
                      const rPx = boreScaled * 0.37;
                      return (
                        <g key={cylIdx}>
                          <circle
                            cx={bx}
                            cy={220}
                            r={rPx}
                            fill={cadPalette.bg}
                            stroke={cadPalette.stroke}
                            strokeWidth="1.8"
                          />
                          <circle
                            cx={bx}
                            cy={220}
                            r={rPx + 5}
                            fill="none"
                            stroke={cadPalette.dim}
                            strokeWidth="0.9"
                            strokeDasharray="4 3"
                          />
                          {/* Head Bolt Holes around Bore */}
                          {[
                            [-rPx * 0.92, -rPx * 0.95],
                            [rPx * 0.92, -rPx * 0.95],
                            [-rPx * 0.92, rPx * 0.95],
                            [rPx * 0.92, rPx * 0.95]
                          ].map(([ox, oy], hIdx) => (
                            <circle
                              key={hIdx}
                              cx={bx + ox}
                              cy={220 + oy}
                              r="4.2"
                              fill={cadPalette.bg}
                              stroke={cadPalette.muted}
                              strokeWidth="1.2"
                            />
                          ))}
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Dimension Lines */}
                {cadLayers.dimensions && (
                  <g fontFamily="monospace" fontSize="10.5" fontWeight="700" fill={cadPalette.dim}>
                    {/* Bore Diameter Dimension */}
                    <line
                      x1={cxCross - boreScaled * 0.5}
                      y1={382}
                      x2={cxCross + boreScaled * 0.5}
                      y2={382}
                      stroke={cadPalette.dim}
                      strokeWidth="1.3"
                    />
                    <text x={cxCross} y={398} textAnchor="middle">
                      Ø {config.bore.toFixed(3)}" BORE
                    </text>

                    {/* Quench Dimension */}
                    <line
                      x1={cxCross + boreScaled * 0.85}
                      y1={deckY - gasketH}
                      x2={cxCross + boreScaled * 0.85}
                      y2={deckY + deckClearH}
                      stroke={cadPalette.accent}
                      strokeWidth="1.5"
                    />
                    <text x={cxCross + boreScaled * 0.92} y={deckY + 4} fill={cadPalette.accent}>
                      QUENCH {specs.quenchDistance}"
                    </text>

                    {/* 4.400 Bore Spacing */}
                    <line x1={528} y1={96} x2={634} y2={96} stroke={cadPalette.dim} strokeWidth="1.3" />
                    <line x1={528} y1={96} x2={528} y2={175} stroke={cadPalette.dim} strokeWidth="0.8" strokeDasharray="3 3" />
                    <line x1={634} y1={96} x2={634} y2={175} stroke={cadPalette.dim} strokeWidth="0.8" strokeDasharray="3 3" />
                    <text x={581} y={89} textAnchor="middle">
                      4.400" BORE SPACING
                    </text>
                  </g>
                )}

                {/* GD&T Feature Control Frames */}
                {cadLayers.gdt && (
                  <g fontFamily="monospace" fontSize="10" fill={cadPalette.stroke}>
                    <rect x="465" y="346" width="290" height="48" fill={cadPalette.panelBg} stroke={cadPalette.dim} strokeWidth="1.1" />
                    <text x="475" y="365" fill={cadPalette.dim} fontWeight="700">
                      GD&amp;T: ⌭ 0.0004" | DATUM A (MAIN LINE BORE)
                    </text>
                    <text x="475" y="383" fill={cadPalette.stroke}>
                      ⊥ 0.0005" | A | B (DECK FLATNESS ≤ 0.001")
                    </text>
                  </g>
                )}

                {/* Interactive Callout Balloons */}
                {cadLayers.balloons &&
                  customCallouts.map((c, idx) => {
                    const bx = idx % 2 === 0 ? 78 : 880;
                    const by = 115 + Math.floor(idx / 2) * 145 + (idx % 2 === 1 ? 265 : 0);
                    const isSel = idx === selectedCalloutIdx;
                    return (
                      <g
                        key={`${c.indexCode}_${idx}`}
                        className="cursor-pointer"
                        onClick={() => setSelectedCalloutIdx(idx)}
                      >
                        <rect
                          x={bx - 30}
                          y={by - 14}
                          width="60"
                          height="24"
                          rx="4"
                          fill={isSel ? cadPalette.accent : cadPalette.panelBg}
                          stroke={isSel ? '#ffffff' : cadPalette.dim}
                          strokeWidth="1.5"
                        />
                        <text
                          x={bx}
                          y={by + 2}
                          textAnchor="middle"
                          fontFamily="monospace"
                          fontSize="11"
                          fontWeight="700"
                          fill={isSel ? '#ffffff' : cadPalette.stroke}
                        >
                          {c.indexCode}
                        </text>
                        <text
                          x={bx}
                          y={by + 24}
                          textAnchor="middle"
                          fontFamily="sans-serif"
                          fontSize="9.5"
                          fill={cadPalette.muted}
                        >
                          {c.partName.slice(0, 24)}
                        </text>
                      </g>
                    );
                  })}

                {/* ASME Title Block Bottom Right */}
                <g transform="translate(530, 480)">
                  <rect width="440" height="132" fill={cadPalette.panelBg} stroke={cadPalette.stroke} strokeWidth="1.4" />
                  <line x1="0" y1="34" x2="440" y2="34" stroke={cadPalette.stroke} strokeWidth="1" />
                  <line x1="0" y1="68" x2="440" y2="68" stroke={cadPalette.muted} strokeWidth="0.8" />
                  <line x1="0" y1="98" x2="440" y2="98" stroke={cadPalette.muted} strokeWidth="0.8" />
                  <line x1="250" y1="68" x2="250" y2="132" stroke={cadPalette.muted} strokeWidth="0.8" />
                  <text x="12" y="22" fill={cadPalette.stroke} fontFamily="sans-serif" fontSize="13" fontWeight="800">
                    {designTitle.toUpperCase()}
                  </text>
                  <text x="12" y="54" fill={cadPalette.dim} fontFamily="monospace" fontSize="11" fontWeight="700">
                    DWG: {drawingNumber} · {revision} · {specs.displacementCi} CID
                  </text>
                  <text x="12" y="87" fill={cadPalette.muted} fontFamily="monospace" fontSize="10">
                    TOL: {toleranceClass}
                  </text>
                  <text x="260" y="87" fill={cadPalette.muted} fontFamily="monospace" fontSize="10">
                    SCALE: {drawingScale} · INCH
                  </text>
                  <text x="12" y="119" fill={cadPalette.accent} fontFamily="monospace" fontSize="10" fontWeight="700">
                    BORE {config.bore.toFixed(3)}" × STROKE {config.stroke.toFixed(3)}" · CR {specs.staticCR}:1
                  </text>
                  <text x="260" y="119" fill={cadPalette.stroke} fontFamily="monospace" fontSize="10">
                    {projectionAngle.split(' ')[0].toUpperCase()}
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-PAGE 3: 5-AXIS CAM TOOLPATH & RS-274 CNC G-CODE GENERATOR         */}
      {/* ===================================================================== */}
      {activeSubPage === 'cam_toolpath' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left: Live 3D Animated CNC Toolpath Viewport + G-Code Output */}
          <div className="xl:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#12161c] border border-slate-800 rounded-xl px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {CAM_OPERATIONS.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => handleSelectCamOp(op.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap ${
                      selectedCamOpId === op.id
                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                        : 'bg-[#0d1014] text-slate-300 border border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCamSimRunning((r) => !r)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition ${
                  camSimRunning
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {camSimRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{camSimRunning ? 'Spindle Live' : 'Paused'}</span>
              </button>
            </div>

            <Component3DTechRenderer
              partKey={activeCamOp.partKey}
              entry={camPartEntry}
              config={config}
              specs={specs}
              renderMode="toolpath"
              onChangeRenderMode={() => {}}
              projection={projection3d}
              onChangeProjection={setProjection3d}
              viewportLayout="single"
              onChangeViewportLayout={() => {}}
              camRunning={camSimRunning}
              camStepoverPct={stepoverPct}
            />

            {/* Generated RS-274 CNC G-Code Listing */}
            <div className="bg-[#12161c] border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-[#0d1014] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <FileCode2 className="w-4 h-4 text-cyan-400" />
                  <span>Generated RS-274 5-Axis CNC Post-Processor Output</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadGcode}
                  className="px-3 py-1 rounded-md border border-slate-700 bg-[#12161c] hover:border-cyan-500 text-xs font-medium text-cyan-300 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .NC Program</span>
                </button>
              </div>
              <pre className="p-4 text-[11px] font-mono text-emerald-300/95 bg-[#080b0f] overflow-x-auto leading-relaxed">
                {gcodeProgram}
              </pre>
            </div>
          </div>

          {/* Right: CAM Milling Feeds, Speeds, MRR & Mount Controls */}
          <div className="xl:col-span-4 bg-[#12161c] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-orange-400" />
                  <span>Tooling &amp; Cutting Physics</span>
                </div>
                <div className="mt-1 text-xs font-mono text-cyan-400">
                  {activeCamOp.toolDesc}
                </div>
              </div>

              {/* Calculated Real-Time Milling Metrics */}
              <div className="grid grid-cols-2 gap-2.5 font-mono tabular-nums">
                <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">SURFACE SPEED</div>
                  <div className="text-sm font-bold text-white">{camMetrics.sfm} SFM</div>
                </div>
                <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">CHIP LOAD / TOOTH</div>
                  <div className="text-sm font-bold text-cyan-400">{camMetrics.chipLoadIpt}" IPT</div>
                </div>
                <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">REMOVAL RATE (MRR)</div>
                  <div className="text-sm font-bold text-orange-400">{camMetrics.mrr} in³/min</div>
                </div>
                <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">PREDICTED FINISH</div>
                  <div className="text-sm font-bold text-emerald-400">
                    Ra {camMetrics.raUin} µin
                  </div>
                </div>
              </div>

              {/* Milling Sliders */}
              <div className="space-y-2.5 bg-[#0d1014] border border-slate-800 rounded-lg p-3">
                {[
                  {
                    label: 'Spindle Speed (RPM)',
                    val: `${spindleRpm.toLocaleString()} RPM`,
                    min: 1800,
                    max: 24000,
                    step: 100,
                    cur: spindleRpm,
                    set: setSpindleRpm
                  },
                  {
                    label: 'Feed Rate (IPM)',
                    val: `${feedIpm} in/min`,
                    min: 12,
                    max: 200,
                    step: 1,
                    cur: feedIpm,
                    set: setFeedIpm
                  },
                  {
                    label: 'Radial Stepover (%)',
                    val: `${stepoverPct}% (${camMetrics.radialWoc}")`,
                    min: 4,
                    max: 45,
                    step: 1,
                    cur: stepoverPct,
                    set: setStepoverPct
                  },
                  {
                    label: 'Axial Depth of Cut',
                    val: `${docIn.toFixed(3)}"`,
                    min: 0.005,
                    max: 0.15,
                    step: 0.005,
                    cur: docIn,
                    set: setDocIn
                  },
                  {
                    label: 'Finish Stock Allowance',
                    val: `${stockIn.toFixed(4)}"`,
                    min: 0.001,
                    max: 0.02,
                    step: 0.001,
                    cur: stockIn,
                    set: setStockIn
                  },
                  {
                    label: 'Cutter Flutes',
                    val: `${flutes} Flutes`,
                    min: 2,
                    max: 6,
                    step: 1,
                    cur: flutes,
                    set: setFlutes
                  }
                ].map((s) => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">{s.label}</span>
                      <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                        {s.val}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={s.cur}
                      onChange={(e) => s.set(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Coolant Delivery:</span>
                  <span className="text-slate-200 font-medium">{activeCamOp.coolant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Est. Cycle Time:</span>
                  <span className="font-mono text-amber-400 font-semibold">{camMetrics.cycleTimeEst}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleSaveCurrent('cam_toolpath')}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#0d1014] hover:border-cyan-500 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span>Save CAM Package to Tray</span>
              </button>
              <button
                type="button"
                onClick={() => handleMountCurrent('cam_toolpath', true)}
                className="w-full px-3 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Apply CAM Spec &amp; Mount to Engine Test Area</span>
              </button>
            </div>
          </div>
        </div>
      )}

{/* === IMAGE TO 3D PROFILE VECTORIZER & EXTRUDER === */}
<section className="mt-6 rounded-xl border border-slate-700 bg-slate-900/90 p-5 text-slate-100 shadow-xl">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
    <div>
      <h3 className="flex items-center gap-2 text-base font-semibold text-cyan-300">
        <Layers className="h-4 w-4" /> Image to 3D Profile Pipeline (PNG / JPG → Traced Vector → 2D Draft → Extruded 3D → Export)
      </h3>
      <p className="mt-0.5 text-xs text-slate-400">
        Client-side Otsu + Marching Squares + RDP. Ray's numbers only: missing scale, depth, material, and tolerance are never guessed.
      </p>
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300">
        Material: <strong className="text-amber-300">to be decided</strong>
      </span>
      <span className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300">
        Tolerance: <strong className="text-amber-300">to be decided</strong>
      </span>
    </div>
  </div>
  <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
    {/* LEFT COLUMN: 1. Intake + 2. Trace Controls + 3. Scale & Depth Inputs */}
    <div className="space-y-4 xl:col-span-4">
      {/* Step 1: Image Intake */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            1. Image Intake (Single PNG / JPG)
          </span>
          {imageFile && (
            <span className="text-[11px] text-cyan-300">{imageFile.name}</span>
          )}
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          onChange={handleImageUpload}
          className="block w-full cursor-pointer rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 file:mr-3 file:rounded file:border-0 file:bg-cyan-600 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-cyan-500"
        />
        <label className="mt-2.5 block text-xs text-slate-300">
          Part Name (used in exported filenames)
          <input
            type="text"
            value={tracedPartName}
            onChange={(e) => setTracedPartName(e.target.value)}
            placeholder={`e.g. ${drawingNumber}-BRACKET`}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
          />
        </label>
      </div>
      {/* Step 2: Trace / Vectorize Controls */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <Sliders className="h-3.5 w-3.5 text-cyan-400" /> 2. Trace &amp; Simplify
          </span>
          <span className="text-[11px] text-slate-400">
            Threshold used:{' '}
            <strong className="text-cyan-300">
              {traceResult ? `${traceResult.thresholdUsed}${thresholdOverrideInput.trim() === '' ? ' (Otsu)' : ' (Manual)'}` : '—'}
            </strong>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block text-xs text-slate-300">
            Threshold Override (0–255)
            <input
              type="number"
              min={0}
              max={255}
              step={1}
              value={thresholdOverrideInput}
              onChange={(e) => setThresholdOverrideInput(e.target.value)}
              placeholder="Blank = Otsu Auto"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </label>
          <label className="block text-xs text-slate-300">
            RDP Epsilon (px)
            <input
              type="number"
              min={0}
              step={0.1}
              value={rdpEpsilonInput}
              onChange={(e) => setRdpEpsilonInput(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
            />
          </label>
        </div>
        <label className="mt-2.5 block text-xs text-slate-300">
          Minimum Contour Area Filter (px²)
          <input
            type="number"
            min={0}
            step={1}
            value={minContourAreaInput}
            onChange={(e) => setMinContourAreaInput(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!imageFile || isTracing}
            onClick={() => void handleTrace(false)}
            className="rounded bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isTracing ? 'Tracing...' : 'Re-trace'}
          </button>
          <button
            type="button"
            disabled={!imageFile || isTracing}
            onClick={() => void handleTrace(true)}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset to Otsu Auto
          </button>
          {traceResult && (
            <button
              type="button"
              onClick={() => {
                setDraftContours(
                  traceResult.contours.map((c) => ({
                    points: c.points.map((p) => ({ x: p.x, y: p.y })),
                    holes: c.holes.map((h) => h.map((p) => ({ x: p.x, y: p.y }))),
                  }))
                );
                setSelectedVertexIdx(null);
                setExtrudedPart(null);
              }}
              className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
            >
              Reset 2D Draft
            </button>
          )}
        </div>
        {activeContours && activeContours.length > 0 && (
          <div className="mt-3 border-t border-slate-800 pt-2.5">
            <label className="block text-xs text-slate-300">
              Active Outer Contour ({activeContours.length} found)
              <select
                value={selectedContourIdx}
                onChange={(e) => {
                  setSelectedContourIdx(Number(e.target.value));
                  setSelectedVertexIdx(null);
                  setExtrudedPart(null);
                }}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              >
                {activeContours.map((c, idx) => (
                  <option key={idx} value={idx}>
                    Contour #{idx + 1} — {c.points.length} vertices, {c.holes.length} hole(s)
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {traceError && (
          <div className="mt-3 rounded border border-red-500/50 bg-red-950/60 p-2.5 text-xs text-red-200">
            {traceError}
          </div>
        )}
      </div>
      {/* Step 3: Required Reference Scale (pixels -> mm) & Extrude Depth */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            3. Real-World Scale &amp; Depth (Required)
          </span>
        </div>
        <div className="mb-2.5 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setScaleInputMode('reference_span')}
            className={`rounded px-2.5 py-1 font-medium ${
              scaleInputMode === 'reference_span'
                ? 'bg-cyan-600 text-white'
                : 'border border-slate-700 bg-slate-900 text-slate-300'
            }`}
          >
            Reference Span (px → mm)
          </button>
          <button
            type="button"
            onClick={() => setScaleInputMode('direct_px_per_mm')}
            className={`rounded px-2.5 py-1 font-medium ${
              scaleInputMode === 'direct_px_per_mm'
                ? 'bg-cyan-600 text-white'
                : 'border border-slate-700 bg-slate-900 text-slate-300'
            }`}
          >
            Direct px / mm
          </button>
        </div>
        {scaleInputMode === 'reference_span' ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-slate-300">
                Reference Span (px) *
                <input
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={refSpanPxInput}
                  onChange={(e) => {
                    setRefSpanPxInput(e.target.value);
                    setExtrudedPart(null);
                  }}
                  placeholder="Required (px)"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500"
                />
              </label>
              <label className="block text-xs text-slate-300">
                Real Length (mm) *
                <input
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={refSpanMmInput}
                  onChange={(e) => {
                    setRefSpanMmInput(e.target.value);
                    setExtrudedPart(null);
                  }}
                  placeholder="Required (mm)"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500"
                />
              </label>
            </div>
            {selectedContourPxBounds && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRefSpanPxInput(String(selectedContourPxBounds.widthPx));
                    setExtrudedPart(null);
                  }}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-cyan-300 hover:bg-slate-800"
                >
                  Use Contour Width ({selectedContourPxBounds.widthPx.toFixed(2)} px)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRefSpanPxInput(String(selectedContourPxBounds.heightPx));
                    setExtrudedPart(null);
                  }}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-cyan-300 hover:bg-slate-800"
                >
                  Use Contour Height ({selectedContourPxBounds.heightPx.toFixed(2)} px)
                </button>
              </div>
            )}
          </div>
        ) : (
          <label className="block text-xs text-slate-300">
            Scale Factor (pixels per mm) *
            <input
              type="number"
              min={0}
              step="any"
              required
              value={directPxPerMmInput}
              onChange={(e) => {
                setDirectPxPerMmInput(e.target.value);
                setExtrudedPart(null);
              }}
              placeholder="Required (px/mm)"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </label>
        )}
        <div className="mt-2.5 rounded border border-slate-800 bg-slate-900/70 px-2.5 py-2 text-xs">
          <div>
            Scale:{' '}
            {activePixelsPerMm !== null ? (
              <strong className="text-emerald-300">{activePixelsPerMm.toFixed(4)} px/mm</strong>
            ) : (
              <strong className="text-amber-300">to be decided (reference dimension required)</strong>
            )}
          </div>
          <div className="mt-1">
            2D Envelope:{' '}
            {scaledPreviewMetrics ? (
              <strong className="text-cyan-300">
                {scaledPreviewMetrics.widthMm.toFixed(3)} mm ×{' '}
                {scaledPreviewMetrics.heightMm.toFixed(3)} mm
              </strong>
            ) : (
              <strong className="text-amber-300">to be decided</strong>
            )}
          </div>
        </div>
        <label className="mt-2.5 block text-xs text-slate-300">
          Coordinate Frame Origin
          <select
            value={originMode}
            onChange={(e) => {
              setOriginMode(e.target.value as 'bottom_left' | 'center');
              setExtrudedPart(null);
            }}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
          >
            <option value="bottom_left">Bottom-Left (0, 0)</option>
            <option value="center">Part Center (0, 0)</option>
          </select>
        </label>
        <label className="mt-2.5 block text-xs text-slate-300">
          Extrude Depth (mm) * — No Default
          <input
            type="number"
            min={0}
            step="any"
            required
            value={extrudeDepthMmInput}
            onChange={(e) => setExtrudeDepthMmInput(e.target.value)}
            placeholder="Required from Ray (mm)"
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
          />
        </label>
        {parsedExtrudeDepthMm === null && (
          <p className="mt-1 text-[11px] text-amber-300">
            Extrude depth: to be decided (Extrude disabled until entered).
          </p>
        )}
        <button
          type="button"
          disabled={!selectedContour || activePixelsPerMm === null || parsedExtrudeDepthMm === null}
          onClick={handleExtrude}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Box className="h-4 w-4" /> Extrude 2D Profile to 3D
        </button>
      </div>
    </div>
    {/* CENTER COLUMN: Source Image + Traced Overlay + 2D Draft Editing */}
    <div className="space-y-3 xl:col-span-4">
      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Source Image &amp; Traced 2D Overlay
          </span>
          <div className="flex gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setOverlayTool('inspect')}
              className={`rounded px-2 py-0.5 ${
                overlayTool === 'inspect'
                  ? 'bg-cyan-600 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              Inspect
            </button>
            <button
              type="button"
              onClick={() => setOverlayTool('caliper')}
              className={`rounded px-2 py-0.5 ${
                overlayTool === 'caliper'
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              2-Pt Caliper
            </button>
            <button
              type="button"
              onClick={() => setOverlayTool('edit_vertices')}
              className={`rounded px-2 py-0.5 ${
                overlayTool === 'edit_vertices'
                  ? 'bg-amber-600 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              Edit Vertices
            </button>
          </div>
        </div>
        {imagePreviewUrl ? (
          <div className="relative overflow-hidden rounded border border-slate-700 bg-slate-950">
            <img src={imagePreviewUrl} alt="Uploaded part drawing" className="block h-auto w-full select-none" />
            {traceResult && (
              <svg
                ref={overlaySvgRef}
                viewBox={`0 0 ${traceResult.width} ${traceResult.height}`}
                preserveAspectRatio="none"
                onClick={handleOverlaySvgClick}
                className={`absolute inset-0 h-full w-full ${
                  overlayTool === 'inspect' ? 'cursor-default' : 'cursor-crosshair'
                }`}
              >
                {activeContours?.map((contour, cIdx) => {
                  const isSelected = cIdx === selectedContourIdx;
                  const outerPointsStr = contour.points.map((p) => `${p.x},${p.y}`).join(' ');
                  const strokeScale = Math.max(traceResult.width, traceResult.height) / 360;
                  return (
                    <g key={cIdx}>
                      <polygon
                        points={outerPointsStr}
                        fill={isSelected ? 'rgba(34, 211, 238, 0.16)' : 'none'}
                        stroke={isSelected ? '#22d3ee' : '#38bdf8'}
                        strokeOpacity={isSelected ? 0.95 : 0.45}
                        strokeWidth={isSelected ? 2.2 * strokeScale : 1.2 * strokeScale}
                        strokeDasharray={isSelected ? undefined : `${4 * strokeScale} ${3 * strokeScale}`}
                      />
                      {contour.holes.map((hole, hIdx) => (
                        <polygon
                          key={hIdx}
                          points={hole.map((p) => `${p.x},${p.y}`).join(' ')}
                          fill={isSelected ? 'rgba(245, 158, 11, 0.18)' : 'none'}
                          stroke="#f59e0b"
                          strokeOpacity={isSelected ? 0.95 : 0.5}
                          strokeWidth={1.8 * strokeScale}
                        />
                      ))}
                      {isSelected &&
                        contour.points.length <= 400 &&
                        contour.points.map((pt, vIdx) => (
                          <circle
                            key={vIdx}
                            cx={pt.x}
                            cy={pt.y}
                            r={selectedVertexIdx === vIdx ? 4.2 * strokeScale : 2.3 * strokeScale}
                            fill={selectedVertexIdx === vIdx ? '#fde047' : '#22d3ee'}
                            stroke="#0f172a"
                            strokeWidth={0.8 * strokeScale}
                            onClick={(ev) => {
                              if (overlayTool !== 'edit_vertices') return;
                              ev.stopPropagation();
                              setSelectedVertexIdx(vIdx);
                            }}
                          />
                        ))}
                    </g>
                  );
                })}
                {caliperPoints.length === 2 && caliperPoints[0] && caliperPoints[1] && (
                  <g>
                    <line
                      x1={caliperPoints[0].x}
                      y1={caliperPoints[0].y}
                      x2={caliperPoints[1].x}
                      y2={caliperPoints[1].y}
                      stroke="#4ade80"
                      strokeWidth={2 * (Math.max(traceResult.width, traceResult.height) / 360)}
                    />
                    <circle cx={caliperPoints[0].x} cy={caliperPoints[0].y} r={3.2 * (Math.max(traceResult.width, traceResult.height) / 360)} fill="#4ade80" />
                    <circle cx={caliperPoints[1].x} cy={caliperPoints[1].y} r={3.2 * (Math.max(traceResult.width, traceResult.height) / 360)} fill="#4ade80" />
                  </g>
                )}
              </svg>
            )}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded border border-dashed border-slate-700 bg-slate-900/40 text-xs text-slate-500">
            Upload a PNG or JPG drawing to preview the traced outline over the source image.
          </div>
        )}
        {traceResult && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              Image: {traceResult.width} × {traceResult.height} px
            </span>
            <span>Cyan = outer contour · Amber = holes</span>
          </div>
        )}
        {overlayTool === 'edit_vertices' && selectedContour && (
          <div className="mt-3 rounded border border-slate-800 bg-slate-900/70 p-2.5 text-xs">
            <div className="mb-1.5 font-medium text-amber-300">
              2D Vertex Draft Editor ({selectedContour.points.length} vertices)
            </div>
            {selectedVertexIdx !== null ? (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-400">
                  Selected Vertex #{selectedVertexIdx + 1} (
                  {activePixelsPerMm !== null ? 'mm in coordinate frame' : 'px'}). Click canvas to insert a new vertex after it.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={vertexEditXInput}
                    onChange={(e) => setVertexEditXInput(e.target.value)}
                    placeholder="X"
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    type="number"
                    step="any"
                    value={vertexEditYInput}
                    onChange={(e) => setVertexEditYInput(e.target.value)}
                    placeholder="Y"
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleApplyVertexEdit} className="rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-500">
                    Apply Vertex Coords
                  </button>
                  <button type="button" onClick={handleDeleteSelectedVertex} className="flex items-center gap-1 rounded border border-red-700/60 bg-red-950/60 px-2.5 py-1 text-xs text-red-200 hover:bg-red-900/60">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                Click any vertex dot on the cyan outer contour to edit coordinates, insert a vertex, or delete it.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    {/* RIGHT COLUMN: 4. 3D Extruded Preview + 5. CAD / CAM Exports */}
    <div className="space-y-4 xl:col-span-4">
      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <Box className="h-3.5 w-3.5 text-emerald-400" /> 4. 3D Extruded Preview (Local Three.js)
          </span>
          {extrudedPart && (
            <span className="text-[11px] text-emerald-300">
              {extrudedPart.triangleCount} tris · Z={extrudedPart.depthMm} mm
            </span>
          )}
        </div>
        <div ref={extrudePreviewMountRef} className="h-72 w-full overflow-hidden rounded border border-slate-700 bg-slate-950">
          {!extrudedPart && (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500">
              Enter reference scale (px → mm) and extrude depth (mm), then click &ldquo;Extrude 2D Profile to 3D&rdquo;.
            </div>
          )}
        </div>
        {extrudedPart && (
          <p className="mt-1.5 text-[11px] text-slate-400">
            Drag to orbit · Scroll to zoom · Size:{' '}
            {extrudedPart.widthMm.toFixed(2)} × {extrudedPart.heightMm.toFixed(2)} ×{' '}
            {extrudedPart.depthMm} mm
          </p>
        )}
      </div>
      {/* Step 5: Exports */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
        <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
          5. Export Traced Part (mm)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!extrudedPart} onClick={handleExportTracedStl} className="flex items-center justify-center gap-1.5 rounded bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">
            <Download className="h-3.5 w-3.5" /> Export STL (3D)
          </button>
          <button type="button" disabled={!selectedContour || activePixelsPerMm === null} onClick={handleExportTracedDxf} className="flex items-center justify-center gap-1.5 rounded border border-cyan-600/60 bg-slate-900 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
            <FileCode2 className="h-3.5 w-3.5" /> Export DXF (2D)
          </button>
          <button type="button" disabled={!selectedContour || activePixelsPerMm === null} onClick={handleExportTracedSvg} className="flex items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
            <Download className="h-3.5 w-3.5" /> Export SVG (2D)
          </button>
          <button type="button" disabled title="Disabled until tool, feed, speed, depth, and units are supplied by Ray." className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-500 opacity-55">
            <Wrench className="h-3.5 w-3.5" /> RS-274.NC (Locked)
          </button>
        </div>
        <p className="mt-2.5 rounded border border-amber-500/30 bg-amber-950/30 p-2 text-[11px] text-amber-200">
          <strong>RS-274.NC disabled: </strong>
          tool diameter, feed rate, spindle speed, cut depth, and units are required from Ray before CNC G-code can be generated (never guessed).
        </p>
      </div>
    </div>
  </div>
</section>

      {/* ===================================================================== */}
      {/* SUB-PAGE 4: CINEMATIC RENDER LAB & REALISTIC STUDIO IMAGERY           */}
      {/* ===================================================================== */}
      {activeSubPage === 'render_gallery' && (
        <div className="space-y-4">
          <div className="bg-[#12161c] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>Cinematic Studio Lighting Rig &amp; Visual Reference Plates</span>
              </h3>
              <p className="text-xs text-slate-400">
                Select a photorealistic ACES Filmic lighting environment below, then launch directly into the real-time 3D Engine Dynamic Graphics Test Area with Unreal Bloom &amp; thermal header glow active.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleMountCurrent('render_gallery', true)}
              className="px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white flex items-center justify-center gap-2 whitespace-nowrap transition"
            >
              <Rocket className="w-4 h-4" />
              <span>Launch Cinematic 3D Engine Test Area</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {CINEMATIC_PLATES.map((plate) => {
              const selected = cinematicPreset === plate.preset;
              const imgFailed = Boolean(failedImages[plate.id]);
              return (
                <div
                  key={plate.id}
                  onClick={() => onChangeCinematicPreset(plate.preset)}
                  className={`bg-[#12161c] border rounded-xl overflow-hidden cursor-pointer transition flex flex-col ${
                    selected
                      ? 'border-orange-500 ring-1 ring-orange-500/40'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="aspect-video w-full bg-[#090c11] relative overflow-hidden">
                    {!imgFailed ? (
                      <img
                        src={plate.imageUrl}
                        alt={plate.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [plate.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#0d1014] to-orange-950/30 p-4 text-center">
                        <Film className="w-8 h-8 text-orange-400 mb-2" />
                        <div className="text-xs font-bold text-white">{plate.title}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{plate.lightingSummary}</div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">{plate.title}</h4>
                        {selected && (
                          <span className="text-[11px] font-mono font-bold text-orange-400">
                            ACTIVE RIG
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{plate.subtitle}</p>
                    </div>
                    <div className="text-[11px] font-mono text-slate-300 bg-[#0d1014] border border-slate-800 rounded-lg p-2.5 space-y-1">
                      <div>{plate.lightingSummary}</div>
                      <div className="text-cyan-400">{plate.cameraSpec}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PERSISTENT STUDIO CREATED DESIGNS TRAY                                */}
      {/* ===================================================================== */}
      <div className="bg-[#12161c] border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Studio Created Design Packages ({studioDesigns.length})
          </div>
          <span className="text-[11px] text-slate-400">
            Load any created 3D, CAD, or CAM specification straight into the Dynamic Engine Graphics Test Area
          </span>
        </div>

        {studioDesigns.length === 0 ? (
          <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-4 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
            <span>
              No custom Studio packages saved yet. Author parameters above and click <strong className="text-slate-200">Save to Tray</strong> or <strong className="text-orange-400">Mount to Engine Test Area</strong>.
            </span>
            <button
              type="button"
              onClick={() => handleMountCurrent(activeSubPage, true)}
              className="px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white"
            >
              Mount Current Spec &amp; Launch Cinematic Test
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {studioDesigns.map((pkg) => {
              const isMounted = mountedDesign?.id === pkg.id;
              return (
                <div
                  key={pkg.id}
                  className={`bg-[#0d1014] border rounded-lg p-3 flex flex-col justify-between gap-2.5 ${
                    isMounted ? 'border-emerald-500/70' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-orange-400">
                        {pkg.drawingNumber} · {pkg.revision}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {pkg.mountedAt}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate">{pkg.title}</div>
                    <div className="text-[11px] text-slate-400">
                      {pkg.toleranceClass} · {pkg.surfaceFinishRa}
                    </div>
                    {pkg.camOperation && (
                      <div className="text-[11px] font-mono text-cyan-400 truncate">
                        CAM: {pkg.camOperation} ({pkg.spindleRpm} RPM)
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onMountDesignToTestArea(pkg, true)}
                      className="flex-1 px-2.5 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-[11px] font-semibold text-white flex items-center justify-center gap-1"
                    >
                      <Rocket className="w-3 h-3" />
                      <span>{isMounted ? 'Re-Mount & Run' : 'Load into Test Area'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
