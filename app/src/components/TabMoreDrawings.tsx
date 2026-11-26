/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  CoordinatedSpecs,
  EngineConfig,
  TabId,
  TechDrawingCallout,
  TechDrawingSheet
} from '../types/engine';
import { ENGINE_FAMILIES } from '../data/engineFamilies';
import { BlueprintPaperTheme } from './SchematicBlueprints';
import { SpecialModControlsStrip } from './SpecialModControlsStrip';
import {
  Box,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Wrench
} from 'lucide-react';

import { MatrixComponentKey } from '../data/manufacturingMatrix';

interface TabMoreDrawingsProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
  onApplyEngineDrawing: (sheet: TechDrawingSheet | null) => void;
  onJumpToTab: (tab: TabId) => void;
  onOpenMatrixForPart?: (partKey: MatrixComponentKey) => void;
}

type SubsystemSheetId = 'block' | 'heads' | 'rotating';

function getPalette(theme: BlueprintPaperTheme) {
  if (theme === 'vellum') {
    return {
      bg: '#f8fafc',
      gridMinor: '#e2e8f0',
      gridMajor: '#cbd5e1',
      stroke: '#0f172a',
      strokeMuted: '#475569',
      dimLine: '#0369a1',
      accent: '#c2410c',
      ok: '#15803d',
      warn: '#b45309',
      fillSubtle: '#e2e8f0',
      fillDark: '#cbd5e1',
      balloonBg: '#ffffff',
      balloonActiveBg: '#ea580c',
      balloonActiveText: '#ffffff',
      text: '#0f172a',
      textMuted: '#475569',
      hatch: '#94a3b8'
    };
  }
  return {
    bg: '#091628',
    gridMinor: '#10243e',
    gridMajor: '#183457',
    stroke: '#e2e8f0',
    strokeMuted: '#7dd3fc',
    dimLine: '#38bdf8',
    accent: '#fb923c',
    ok: '#34d399',
    warn: '#fbbf24',
    fillSubtle: '#0e223d',
    fillDark: '#132c4d',
    balloonBg: '#091628',
    balloonActiveBg: '#ea580c',
    balloonActiveText: '#ffffff',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    hatch: '#38bdf8'
  };
}

export const TabMoreDrawings: React.FC<TabMoreDrawingsProps> = ({
  config,
  specs,
  onUpdateConfig,
  onApplyEngineDrawing,
  onJumpToTab,
  onOpenMatrixForPart
}) => {
  const [sheetKind, setSheetKind] = useState<SubsystemSheetId>('block');
  const [paperTheme, setPaperTheme] = useState<BlueprintPaperTheme>('blueprint');
  const [rowFilter, setRowFilter] = useState<string>('ALL');
  const [calloutFilter, setCalloutFilter] = useState<string>('');
  const [selectedCallout, setSelectedCallout] = useState<TechDrawingCallout | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeFamily = config.engineFamilyId
    ? ENGINE_FAMILIES[config.engineFamilyId]
    : ENGINE_FAMILIES.gm_sbc_350;

  const engineLabel = activeFamily?.shortName || `Engine ${specs.displacementCi} CID`;
  const blockMat = activeFamily?.blockMaterial || 'High-Nickel Cast Iron';
  const headSpec = activeFamily?.headType || '2-Valve OHV Aluminum / Cast Iron';
  const cylCount = config.cylinders ?? activeFamily?.cylinders ?? 8;

  const sheetsByKind: Record<SubsystemSheetId, TechDrawingSheet> = useMemo(() => {
    const boreStr = config.bore.toFixed(3);
    const strokeStr = config.stroke.toFixed(3);
    const deckStr = config.deckHeight.toFixed(3);

    const blockSheet: TechDrawingSheet = {
      id: `sub_block_${activeFamily?.id || 'custom'}`,
      domain: 'engine',
      drawingNumber: `MOD-BLK-${specs.displacementCi}-${boreStr.replace('.', '')}`,
      title: `${engineLabel} — Cylinder Block & Main Line-Bore Blueprint`,
      subtitle: `${cylCount}-Cylinder Block · ${boreStr}" Bore × ${deckStr}" Deck Height · ${blockMat}`,
      sourceLabel: 'MODSIM Subsystem Blueprints · Cylinder Block',
      unitSummary: `Square-decked ${deckStr}" datum height with ${boreStr}" torque-plate honed bores, ${config.deckClearance.toFixed(3)}" piston-to-deck clearance, and ${specs.quenchDistance}" quench stack.`,
      dimensions: {
        bore: config.bore,
        stroke: config.stroke,
        rodLength: config.rodLength,
        deckHeight: config.deckHeight,
        deckClearance: config.deckClearance,
        gasketThickness: config.gasketThickness,
        chamberCc: config.chamberCc
      },
      callouts: [
        {
          row: 'A',
          indexCode: 'BK-101',
          partName: `Torque-Plate Honed Cylinder Bore (${boreStr}" × ${cylCount} Cyl)`,
          partNumber: `${activeFamily?.code.split(' ')[0] || 'BLK'}-BORE-${boreStr.replace('.', '')}`,
          category: 'Cylinder Block',
          clearanceSpec: `Taper & Out-of-Round ≤ 0.0005" | PTW: ${specs.ptwClearance}`,
          torqueSpec: 'Torque Plate Preload: 65–70 ft-lbs during plateau hone',
          material: blockMat,
          notes: 'Finish plateau hone with 280/400 CBN stones for moly/plasma ring seating.',
          targetSubassembly: 'block'
        },
        {
          row: 'A',
          indexCode: 'BK-104',
          partName: `Squared Block Deck Surface (${deckStr}" Crank-to-Deck)`,
          partNumber: 'DECK-DATUM-A',
          category: 'Block Machining',
          clearanceSpec: `Deck Flatness ≤ 0.0015" OAL | Piston-to-Deck: ${config.deckClearance.toFixed(3)}"`,
          torqueSpec: 'Head Fastener Threads Chased & Sealed (Wet Jacket Check)',
          material: blockMat,
          notes: `Combine ${config.deckClearance.toFixed(3)}" deck clearance + ${config.gasketThickness.toFixed(3)}" gasket = ${specs.quenchDistance}" quench.`,
          targetSubassembly: 'block'
        },
        {
          row: 'B',
          indexCode: 'BK-201',
          partName: 'Line-Honed Main Bearing Saddles & Caps',
          partNumber: 'ARP-MAIN-CAP',
          category: 'Bottom End',
          clearanceSpec: 'Main Housing Bore Roundness ±0.0003" | Oil Clearance 0.0022"–0.0028"',
          torqueSpec: 'Inner Mains: 70–75 ft-lbs | Outer / Cross-Bolts: 65 ft-lbs',
          material: 'Nodular Iron / Billet Steel Caps w/ ARP Studs',
          notes: 'Verify #5 thrust bearing flange alignment before final torque.',
          targetSubassembly: 'crank'
        },
        {
          row: 'C',
          indexCode: 'BK-305',
          partName: 'Camshaft Bearing Tunnel & Lifter Bore Indexing',
          partNumber: 'DUR-CAM-BRG',
          category: 'Cam & Lifters',
          clearanceSpec: 'Cam Journal Oil Clearance 0.0015"–0.0025" | Lifter Bore 0.0010"–0.0018"',
          torqueSpec: 'Rear Cam Plug & Front Retainer Plate: 120 in-lbs + Loctite',
          material: 'Steel-Backed Babbitt Seamless Cam Bearings',
          notes: 'Align oil feed holes cleanly at 4 o-clock / 5 o-clock position.',
          targetSubassembly: 'cam'
        },
        {
          row: 'D',
          indexCode: 'BK-410',
          partName: 'Oil Galley Plugs, Brass Freeze Plugs & Bellhousing Dowels',
          partNumber: 'MEL-MPE-BRASS',
          category: 'Block Hardware',
          clearanceSpec: `Bellhousing Pattern: ${config.bellhousingPattern || activeFamily?.bellhousingPattern || 'GM_Chevy_V8'} (≤ 0.005" TIR)`,
          torqueSpec: 'NPT Galley Plugs: 15–18 ft-lbs w/ PTFE Thread Sealant',
          material: 'Deep-Cup Brass Freeze Plugs & Precision Ground Steel Dowels',
          notes: 'Press rear block bellhousing dowel pins 0.500" proud of rear flange.',
          targetSubassembly: 'lubrication'
        }
      ]
    };

    const headsSheet: TechDrawingSheet = {
      id: `sub_heads_${activeFamily?.id || 'custom'}`,
      domain: 'engine',
      drawingNumber: `MOD-HD-${specs.displacementCi}-${config.chamberCc.toFixed(0)}CC`,
      title: `${engineLabel} — Cylinder Heads & Valvetrain Geometry`,
      subtitle: `${config.chamberCc.toFixed(1)} cc Chambers · ${config.rockerRatio}:1 Rockers · ${specs.totalValveLift}" Net Valve Lift`,
      sourceLabel: 'MODSIM Subsystem Blueprints · Cylinder Heads',
      unitSummary: `${headSpec} paired with ${config.gasketThickness.toFixed(3)}" compressed gasket for ${specs.staticCR}:1 SCR (${specs.dynamicCR}:1 DCR) and ${specs.camData.intakeDur050}°/${specs.camData.exhDur050}° @ .050" cam timing.`,
      dimensions: {
        bore: config.bore,
        stroke: config.stroke,
        rodLength: config.rodLength,
        deckHeight: config.deckHeight,
        deckClearance: config.deckClearance,
        gasketThickness: config.gasketThickness,
        chamberCc: config.chamberCc
      },
      callouts: [
        {
          row: 'A',
          indexCode: 'HD-101',
          partName: `Combustion Chamber & Quench Pad (${config.chamberCc.toFixed(1)} cc)`,
          partNumber: `CHAMBER-${config.chamberCc.toFixed(0)}CC`,
          category: 'Cylinder Heads',
          clearanceSpec: `Chamber Volume Variance ≤ ±0.5 cc | Quench: ${specs.quenchDistance}"`,
          torqueSpec: 'Head Studs/Bolts: 3-Step Spiral (25 → 45 → 70 ft-lbs)',
          material: headSpec,
          notes: `Produces ${specs.staticCR}:1 static CR with ${config.pistonReliefCc} cc piston dish/relief.`,
          targetSubassembly: 'heads'
        },
        {
          row: 'B',
          indexCode: 'HD-210',
          partName: 'Multi-Angle Valve Job, Bronze Guides & Viton Seals',
          partNumber: 'VALVE-3ANGLE-PRO',
          category: 'Valvetrain',
          clearanceSpec: 'Guide Clearance: 0.0012"–0.0018" Int / 0.0018"–0.0025" Exh',
          torqueSpec: 'Vacuum Seal Check ≥ 22 inHg on Bench Test',
          material: 'Manganese-Bronze Guides + Stainless Swirl-Polished Valves',
          notes: 'Check piston-to-valve radial/axial clearance ≥ 0.080" Int / 0.100" Exh.',
          targetSubassembly: 'heads'
        },
        {
          row: 'C',
          indexCode: 'HD-315',
          partName: `Dual/Beehive Valve Springs & Chromoly Retainers (${specs.totalValveLift}" Lift)`,
          partNumber: 'SPR-DUAL-140',
          category: 'Valvetrain',
          clearanceSpec: 'Coil Bind Margin ≥ 0.060" at Max Lift | Installed Height ±0.015"',
          torqueSpec: 'Seat Pressure: 135–150 lbs | Open Pressure: 340–390 lbs',
          material: 'Chrome-Silicon Shot-Peened Wire + 4140 Retainers',
          notes: 'Verify spring pocket concentricity and retainer-to-seal clearance.',
          targetSubassembly: 'cam'
        },
        {
          row: 'D',
          indexCode: 'HD-420',
          partName: `Rocker Arms (${config.rockerRatio}:1 Ratio) & Hardened Pushrods`,
          partNumber: `RCK-${String(config.rockerRatio).replace('.', '')}-PRO`,
          category: 'Valvetrain',
          clearanceSpec: 'Sweep Pattern ≤ 0.045" centered on valve stem tip',
          torqueSpec: 'Stud Polylocks / Pedestal Bolts: 22–25 ft-lbs (1/2 Turn Preload)',
          material: '7075/6061 Billet Aluminum or Roller-Tip Steel + 0.080" Wall Pushrods',
          notes: 'Check pushrod-to-head slot clearance before final assembly.',
          targetSubassembly: 'heads'
        },
        {
          row: 'E',
          indexCode: 'HD-505',
          partName: `Multi-Layer / Composite Head Gasket (${config.gasketThickness.toFixed(3)}" Comp)`,
          partNumber: `GSK-${config.gasketThickness.toFixed(3).replace('.', '')}`,
          category: 'Sealing',
          clearanceSpec: `Fire-Ring Bore Ø ${(config.bore + 0.1).toFixed(3)}" | Gasket Vol ${specs.gasketVolumeCc} cc`,
          torqueSpec: 'Surface Roughness Ra ≤ 50 µin (MLS) / ≤ 80 µin (Composite)',
          material: 'Pre-Flattened Copper/Composite or 3-Layer Stainless MLS',
          notes: 'Install dry unless coating is factory specified; verify coolant steam holes.',
          targetSubassembly: 'block'
        }
      ]
    };

    const rotatingSheet: TechDrawingSheet = {
      id: `sub_rotating_${activeFamily?.id || 'custom'}`,
      domain: 'engine',
      drawingNumber: `MOD-ROT-${specs.displacementCi}-${strokeStr.replace('.', '')}`,
      title: `${engineLabel} — Crankshaft & Rotating Assembly Blueprint`,
      subtitle: `${strokeStr}" Stroke · ${config.rodLength.toFixed(3)}" Rods (R/S ${specs.rodStrokeRatio}:1) · ${config.pistonAlloy.toUpperCase()} Pistons`,
      sourceLabel: 'MODSIM Subsystem Blueprints · Rotating Assembly',
      unitSummary: `Swept volume ${specs.displacementCi} CID (${specs.displacementL} L) across ${cylCount} cylinders, max rod angle ${specs.maxRodAngleDeg}°, mean piston speed ${specs.meanPistonSpeed6000} FPM @ 6000 RPM, and ${specs.topRingGap}"/${specs.secondRingGap}"/${specs.oilRingGap.toFixed(3)}" ring end gaps.`,
      dimensions: {
        bore: config.bore,
        stroke: config.stroke,
        rodLength: config.rodLength,
        deckHeight: config.deckHeight,
        deckClearance: config.deckClearance,
        gasketThickness: config.gasketThickness,
        chamberCc: config.chamberCc
      },
      callouts: [
        {
          row: 'A',
          indexCode: 'RT-101',
          partName: `Forged / Nodular Crankshaft (${strokeStr}" Stroke)`,
          partNumber: `CRK-${strokeStr.replace('.', '')}-BAL`,
          category: 'Crankshaft',
          clearanceSpec: `Journal Runout ≤ 0.001" TIR | Crank End Play: 0.003"–0.007"`,
          torqueSpec: 'Flywheel/Flexplate Flange: 65 ft-lbs + Loctite 271 | Snout: 60–85 ft-lbs',
          material: '4340 Forged Chromoly / Nodular Cast Iron',
          notes: 'Spin balanced within ±0.5g bobweight tolerance.',
          targetSubassembly: 'crank'
        },
        {
          row: 'B',
          indexCode: 'RT-210',
          partName: `Connecting Rods (${config.rodLength.toFixed(3)}" C-to-C, R/S ${specs.rodStrokeRatio}:1)`,
          partNumber: `ROD-${config.rodLength.toFixed(3).replace('.', '')}-H`,
          category: 'Connecting Rods',
          clearanceSpec: `Rod Bearing Oil: 0.0020"–0.0025" | Side Clearance: 0.012"–0.020"`,
          torqueSpec: 'ARP 8740 Rod Bolts: 45 ft-lbs (0.0058"–0.0062" Bolt Stretch)',
          material: '4340 Forged H-Beam / Powdered-Metal Cracked Cap',
          notes: `Max rod angularity ${specs.maxRodAngleDeg}°; orient chamfer toward crank fillet.`,
          targetSubassembly: 'rotating'
        },
        {
          row: 'C',
          indexCode: 'RT-305',
          partName: `${config.pistonAlloy.toUpperCase()} Pistons (${config.pistonReliefCc} cc Dish/Relief)`,
          partNumber: `PST-${boreStr.replace('.', '')}-${config.pistonAlloy.toUpperCase()}`,
          category: 'Pistons',
          clearanceSpec: `PTW: ${specs.ptwClearance} | Pin Oil: 0.0007"–0.0010"`,
          torqueSpec: 'Full-Floating Spirolox Pin Clips Seated in Both Grooves',
          material: `${config.pistonAlloy.toUpperCase()} Aluminum Alloy`,
          notes: `Mean piston velocity @ 6000 RPM: ${specs.meanPistonSpeed6000} FPM.`,
          targetSubassembly: 'rotating'
        },
        {
          row: 'D',
          indexCode: 'RT-410',
          partName: `File-Fit Piston Ring Pack (${config.ringApplication.replace('_', ' ').toUpperCase()})`,
          partNumber: `RNG-${boreStr.replace('.', '')}-${config.ringApplication.toUpperCase()}`,
          category: 'Piston Rings',
          clearanceSpec: `Top ${specs.topRingGap}" | 2nd ${specs.secondRingGap}" | Oil ${specs.oilRingGap.toFixed(3)}"`,
          torqueSpec: 'Axial Ring-to-Groove Side Clearance: 0.0015"–0.0030"',
          material: 'Plasma-Moly Ductile Top / Napier 2nd / 3-Piece Stainless Oil',
          notes: 'File-fit square 1.0" down cylinder bore; stagger gaps 120° apart.',
          targetSubassembly: 'rotating'
        },
        {
          row: 'E',
          indexCode: 'RT-520',
          partName: 'Harmonic Damper & Neutral / External Flexplate',
          partNumber: 'DMP-SFI-18.1',
          category: 'Crank Balance',
          clearanceSpec: 'Snout Interference Press: 0.0005"–0.0010" | Ring Gear Runout ≤ 0.015"',
          torqueSpec: 'Harmonic Damper Bolt: 60–85 ft-lbs (Use Installer Tool Only)',
          material: 'SFI 18.1 Elastomer / Fluid Steel Damper',
          notes: 'Verify internal vs external balance weight matches crank casting/forging.',
          targetSubassembly: 'timingCover'
        }
      ]
    };

    return {
      block: blockSheet,
      heads: headsSheet,
      rotating: rotatingSheet
    };
  }, [activeFamily, blockMat, config, cylCount, engineLabel, headSpec, specs]);

  const activeSheet = sheetsByKind[sheetKind];
  const p = getPalette(paperTheme);

  const activeInspectCallout = useMemo(() => {
    if (
      selectedCallout &&
      activeSheet.callouts.some((c) => c.indexCode === selectedCallout.indexCode)
    ) {
      return selectedCallout;
    }
    return activeSheet.callouts[0] || null;
  }, [activeSheet, selectedCallout]);

  const rowsAvailable = useMemo(() => {
    const set = new Set<string>();
    activeSheet.callouts.forEach((c) => {
      if (c.row) set.add(c.row.toUpperCase());
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [activeSheet]);

  const filteredCallouts = useMemo(() => {
    const q = calloutFilter.trim().toLowerCase();
    return activeSheet.callouts.filter((c) => {
      const matchesRow = rowFilter === 'ALL' || c.row.toUpperCase() === rowFilter;
      if (!q) return matchesRow;
      return (
        matchesRow &&
        (c.partName.toLowerCase().includes(q) ||
          c.indexCode.toLowerCase().includes(q) ||
          (c.partNumber || '').toLowerCase().includes(q) ||
          (c.clearanceSpec || '').toLowerCase().includes(q))
      );
    });
  }, [activeSheet, calloutFilter, rowFilter]);

  const handleApplyTo3D = () => {
    onApplyEngineDrawing(activeSheet);
    if (activeSheet.dimensions) {
      onUpdateConfig({
        bore: activeSheet.dimensions.bore ?? config.bore,
        stroke: activeSheet.dimensions.stroke ?? config.stroke,
        rodLength: activeSheet.dimensions.rodLength ?? config.rodLength,
        deckHeight: activeSheet.dimensions.deckHeight ?? config.deckHeight,
        deckClearance: activeSheet.dimensions.deckClearance ?? config.deckClearance,
        gasketThickness: activeSheet.dimensions.gasketThickness ?? config.gasketThickness,
        chamberCc: activeSheet.dimensions.chamberCc ?? config.chamberCc
      });
    }
    setStatusMsg(`Synced "${activeSheet.title}" callouts & dimensions to the live 3D engine model.`);
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSheet.drawingNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderCalloutBalloon = (
    idxCode: string,
    x: number,
    y: number,
    lx: number,
    ly: number
  ) => {
    const callout = activeSheet.callouts.find((c) => c.indexCode === idxCode) || activeSheet.callouts[0];
    const isSel = activeInspectCallout?.indexCode === callout.indexCode;
    return (
      <g
        key={idxCode}
        onClick={() => setSelectedCallout(callout)}
        style={{ cursor: 'pointer' }}
      >
        <line
          x1={x}
          y1={y}
          x2={lx}
          y2={ly}
          stroke={isSel ? p.accent : p.strokeMuted}
          strokeWidth={isSel ? 2 : 1.1}
        />
        <circle cx={x} cy={y} r="3.5" fill={isSel ? p.accent : p.dimLine} />
        <rect
          x={lx - 32}
          y={ly - 12}
          width="64"
          height="24"
          rx="12"
          fill={isSel ? p.balloonActiveBg : p.balloonBg}
          stroke={isSel ? p.accent : p.dimLine}
          strokeWidth={isSel ? 2 : 1.3}
        />
        <text
          x={lx}
          y={ly + 4}
          textAnchor="middle"
          fill={isSel ? p.balloonActiveText : p.stroke}
          fontSize="10"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {idxCode}
        </text>
      </g>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1440px] mx-auto w-full space-y-5 text-xs text-slate-200">
      {/* Header & Subsystem Sheet Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <span>Subsystem Technical Blueprints — Block, Heads &amp; Rotating Assembly</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="font-mono text-cyan-300 font-semibold">{activeSheet.drawingNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{activeSheet.title}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* 3 Subsystem Sheet Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#12161c] border border-slate-800 rounded-lg">
            {(
              [
                { id: 'block', label: 'Cylinder Block' },
                { id: 'heads', label: 'Heads & Valvetrain' },
                { id: 'rotating', label: 'Crank & Rotating' }
              ] as Array<{ id: SubsystemSheetId; label: string }>
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSheetKind(item.id);
                  setSelectedCallout(null);
                  setRowFilter('ALL');
                  setStatusMsg(null);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                  sheetKind === item.id
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPaperTheme((prev) => (prev === 'blueprint' ? 'vellum' : 'blueprint'))}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-[#12161c] hover:border-slate-500 text-slate-200 text-xs font-medium transition whitespace-nowrap"
          >
            {paperTheme === 'blueprint' ? 'Vellum Paper' : 'Blueprint Dark'}
          </button>

          <button
            type="button"
            onClick={handleExportSvg}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-[#12161c] hover:border-emerald-500/60 text-slate-200 hover:text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export SVG</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-[#12161c] hover:border-slate-500 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleApplyTo3D}
            className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sync Sheet to 3D</span>
          </button>

          {onOpenMatrixForPart && (
            <button
              type="button"
              onClick={() =>
                onOpenMatrixForPart(
                  sheetKind === 'heads'
                    ? 'heads'
                    : sheetKind === 'rotating'
                    ? 'rotating_rod'
                    : 'block'
                )
              }
              className="px-3 py-2 rounded-lg border border-cyan-500/60 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 font-semibold text-xs flex items-center gap-1.5 transition whitespace-nowrap"
            >
              <Box className="w-3.5 h-3.5 text-cyan-300" />
              <span>Render Part 3D</span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-200">
          {statusMsg}
        </div>
      )}

      <div className="no-print">
        <SpecialModControlsStrip
          config={config}
          specs={specs}
          onUpdateConfig={onUpdateConfig}
          variant="compact"
        />
      </div>

      {/* Main CAD Drawing + Inspector Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-9 bg-[#091628] border border-slate-800 rounded-xl overflow-hidden">
          <div className="w-full overflow-x-auto">
            <svg
              ref={svgRef}
              viewBox="0 0 1180 580"
              className="w-full h-auto block select-none"
              role="img"
              aria-label={activeSheet.title}
            >
              <defs>
                <pattern id="moreGridMinor" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke={p.gridMinor} strokeWidth="0.7" />
                </pattern>
                <pattern id="moreGridMajor" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#moreGridMinor)" />
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke={p.gridMajor} strokeWidth="1.1" />
                </pattern>
                <pattern id="moreHatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke={p.hatch} strokeWidth="1.2" opacity="0.42" />
                </pattern>
                <marker id="mArrowBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={p.dimLine} />
                </marker>
              </defs>

              <rect width="1180" height="580" fill={p.bg} />
              <rect width="1180" height="580" fill="url(#moreGridMajor)" />
              <rect x="14" y="14" width="1152" height="552" fill="none" stroke={p.stroke} strokeWidth="1.6" />
              <rect x="19" y="19" width="1142" height="542" fill="none" stroke={p.strokeMuted} strokeWidth="0.7" opacity="0.75" />

              {sheetKind === 'block' && (
                <>
                  <text x="34" y="44" fill={p.stroke} fontSize="13" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    CYLINDER BLOCK SECTION: BORE, DECK DATUM &amp; MAIN LINE-BORE GEOMETRY
                  </text>
                  {/* V-Bank Deck Profile */}
                  <path
                    d="M 180 220 L 320 96 L 560 96 L 560 430 L 180 430 Z"
                    fill="url(#moreHatch)"
                    stroke={p.stroke}
                    strokeWidth="1.8"
                  />
                  {/* Cylinder Bore Cutout */}
                  <rect x="260" y="128" width="130" height="205" fill={p.bg} stroke={p.dimLine} strokeWidth="1.8" />
                  <line x1="325" y1="74" x2="325" y2="475" stroke={p.dimLine} strokeWidth="1" strokeDasharray="10 4 2 4" />
                  {/* Bore Dimension */}
                  <line x1="260" y1="220" x2="390" y2="220" stroke={p.dimLine} strokeWidth="1.4" markerStart="url(#mArrowBlue)" markerEnd="url(#mArrowBlue)" />
                  <rect x="282" y="210" width="86" height="18" fill={p.bg} />
                  <text x="325" y="223" textAnchor="middle" fill={p.dimLine} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    Ø {config.bore.toFixed(3)}&quot;
                  </text>

                  {/* Main Saddle & Cap */}
                  <circle cx="325" cy="405" r="34" fill={p.fillDark} stroke={p.accent} strokeWidth="2" />
                  <rect x="265" y="405" width="120" height="44" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.6" />

                  {/* Longitudinal Block Side View (Right) */}
                  <rect x="640" y="130" width="410" height="240" rx="6" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.8" />
                  {[690, 775, 860, 945].map((bx, i) => (
                    <g key={bx}>
                      <circle cx={bx} cy="220" r="24" fill={p.bg} stroke={p.dimLine} strokeWidth="1.4" />
                      <text x={bx} y="224" textAnchor="middle" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                        CYL {i * 2 + 1}
                      </text>
                    </g>
                  ))}
                  {/* Cam Tunnel */}
                  <line x1="630" y1="295" x2="1060" y2="295" stroke={p.accent} strokeWidth="2" strokeDasharray="6 3" />
                  {/* Main Journal Centerline */}
                  <line x1="630" y1="352" x2="1060" y2="352" stroke={p.dimLine} strokeWidth="1.4" strokeDasharray="10 3 2 3" />
                  {/* Deck Height Dimension */}
                  <line x1="592" y1="130" x2="592" y2="352" stroke={p.dimLine} strokeWidth="1.4" markerStart="url(#mArrowBlue)" markerEnd="url(#mArrowBlue)" />
                  <rect x="528" y="228" width="120" height="24" fill={p.bg} stroke={p.dimLine} strokeWidth="0.8" />
                  <text x="588" y="244" textAnchor="middle" fill={p.dimLine} fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    DECK {config.deckHeight.toFixed(3)}&quot;
                  </text>

                  {renderCalloutBalloon('BK-101', 260, 175, 110, 165)}
                  {renderCalloutBalloon('BK-104', 440, 96, 470, 68)}
                  {renderCalloutBalloon('BK-201', 355, 425, 110, 425)}
                  {renderCalloutBalloon('BK-305', 845, 295, 845, 448)}
                  {renderCalloutBalloon('BK-410', 1050, 250, 1105, 180)}
                </>
              )}

              {sheetKind === 'heads' && (
                <>
                  <text x="34" y="44" fill={p.stroke} fontSize="13" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    CYLINDER HEAD &amp; VALVETRAIN SECTION: CHAMBER, QUENCH &amp; VALVE SWEEP
                  </text>
                  {/* Head Casting Cross-Section */}
                  <path
                    d="M 160 110 L 540 110 L 540 310 L 420 310 L 385 256 L 265 256 L 230 310 L 160 310 Z"
                    fill="url(#moreHatch)"
                    stroke={p.stroke}
                    strokeWidth="1.8"
                  />
                  {/* Intake & Exhaust Valves */}
                  <line x1="285" y1="100" x2="298" y2="295" stroke={p.accent} strokeWidth="3" />
                  <line x1="268" y1="295" x2="328" y2="295" stroke={p.accent} strokeWidth="4" />
                  <line x1="405" y1="100" x2="392" y2="288" stroke={p.dimLine} strokeWidth="2.8" />
                  <line x1="368" y1="288" x2="416" y2="288" stroke={p.dimLine} strokeWidth="4" />

                  {/* Valve Springs */}
                  <rect x="272" y="132" width="32" height="58" fill={p.fillDark} stroke={p.accent} strokeWidth="1.6" />
                  <rect x="386" y="132" width="32" height="58" fill={p.fillDark} stroke={p.dimLine} strokeWidth="1.6" />

                  {/* Rocker Arm + Pushrod */}
                  <path d="M 285 95 L 445 78 L 452 96 L 288 108 Z" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.6" />
                  <line x1="448" y1="92" x2="468" y2="335" stroke={p.warn} strokeWidth="2.5" />

                  {/* Head Gasket Band */}
                  <rect x="160" y="312" width="380" height="16" fill={p.accent} opacity="0.6" stroke={p.stroke} strokeWidth="1" />

                  {/* Chamber & Lift Callout Box */}
                  <rect x="640" y="110" width="440" height="310" rx="6" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.6" />
                  <text x="665" y="145" fill={p.stroke} fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    COMBUSTION &amp; VALVETRAIN SUMMARY
                  </text>
                  <text x="665" y="182" fill={p.dimLine} fontSize="11.5" fontFamily="JetBrains Mono, monospace">
                    Chamber Volume: {config.chamberCc.toFixed(1)} cc | Gasket: {config.gasketThickness.toFixed(3)}&quot;
                  </text>
                  <text x="665" y="212" fill={p.ok} fontSize="11.5" fontFamily="JetBrains Mono, monospace">
                    Static CR: {specs.staticCR}:1 | Dynamic CR: {specs.dynamicCR}:1
                  </text>
                  <text x="665" y="242" fill={p.accent} fontSize="11.5" fontFamily="JetBrains Mono, monospace">
                    Rocker Ratio: {config.rockerRatio}:1 | Net Valve Lift: {specs.totalValveLift}&quot;
                  </text>
                  <text x="665" y="272" fill={p.stroke} fontSize="11.5" fontFamily="JetBrains Mono, monospace">
                    Cam @ .050&quot;: {specs.camData.intakeDur050}° / {specs.camData.exhDur050}° (LSA {activeFamily?.camBaseline.lsa ?? 110}°)
                  </text>
                  <text x="665" y="302" fill={p.warn} fontSize="11.5" fontFamily="JetBrains Mono, monospace">
                    Quench Stack: {specs.quenchDistance}&quot; ({specs.quenchStatus.split(':')[0]})
                  </text>
                  <text x="665" y="332" fill={p.dimLine} fontSize="11" fontFamily="JetBrains Mono, monospace">
                    Int Port: {config.intakePortCc ?? 185} cc ({(config.intakeValveIn ?? 2.02).toFixed(2)}&quot;) | Exh: {config.exhaustPortCc ?? 68} cc {(config.exhaustPortShape || 'd_port').replace('_', '-').toUpperCase()}
                  </text>
                  <text x="665" y="362" fill={p.ok} fontSize="11" fontFamily="JetBrains Mono, monospace">
                    Flow @ .600&quot;: {specs.intakeFlowPeakCfm} / {specs.exhaustFlowPeakCfm} CFM ({specs.eiFlowRatioPct}% E/I)
                  </text>
                  <text x="665" y="392" fill={p.accent} fontSize="11" fontFamily="JetBrains Mono, monospace">
                    Carb: {config.carbCfm} CFM ({(config.carbVenturiIn ?? 1.375).toFixed(3)}&quot;) | Header: {(config.headerPrimaryIn ?? 1.625).toFixed(3)}&quot;
                  </text>

                  {renderCalloutBalloon('HD-101', 340, 270, 95, 250)}
                  {renderCalloutBalloon('HD-210', 298, 295, 95, 345)}
                  {renderCalloutBalloon('HD-315', 288, 160, 95, 160)}
                  {renderCalloutBalloon('HD-420', 448, 88, 560, 74)}
                  {renderCalloutBalloon('HD-505', 490, 320, 585, 365)}
                </>
              )}

              {sheetKind === 'rotating' && (
                <>
                  <text x="34" y="44" fill={p.stroke} fontSize="13" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    CRANKSHAFT, H-BEAM ROD &amp; PISTON RING GEOMETRY
                  </text>
                  {/* Crank Throw Longitudinal Silhouette */}
                  <line x1="90" y1="365" x2="1090" y2="365" stroke={p.dimLine} strokeWidth="1" strokeDasharray="12 4 2 4" />
                  {/* Crank Webs & Journals */}
                  {[190, 330, 470, 610, 750].map((mx, i) => (
                    <g key={mx}>
                      <rect x={mx} y="340" width="38" height="50" fill={p.fillDark} stroke={p.stroke} strokeWidth="1.6" />
                      {i < 4 && (
                        <>
                          <rect x={mx + 38} y="295" width="24" height="130" rx="3" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.5" />
                          <rect x={mx + 62} y={i % 2 === 0 ? 310 : 385} width="46" height="36" fill={p.fillDark} stroke={p.accent} strokeWidth="1.8" />
                          <rect x={mx + 108} y="295" width="24" height="130" rx="3" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.5" />
                        </>
                      )}
                    </g>
                  ))}
                  {/* Harmonic Damper (Left) */}
                  <rect x="115" y="308" width="44" height="114" rx="4" fill={p.fillDark} stroke={p.dimLine} strokeWidth="1.8" />

                  {/* Piston & Rod Assembly on Throw #1 */}
                  <rect x="242" y="102" width="110" height="78" rx="4" fill={p.fillDark} stroke={p.stroke} strokeWidth="1.8" />
                  <line x1="242" y1="118" x2="352" y2="118" stroke={p.accent} strokeWidth="2.2" />
                  <line x1="242" y1="128" x2="352" y2="128" stroke={p.dimLine} strokeWidth="2" />
                  <line x1="242" y1="138" x2="352" y2="138" stroke={p.ok} strokeWidth="2" />
                  <circle cx="297" cy="158" r="12" fill={p.bg} stroke={p.stroke} strokeWidth="2" />
                  <path d="M 288 170 L 284 310 L 310 310 L 306 170 Z" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.7" />

                  {/* Kinematics Summary Box */}
                  <rect x="770" y="95" width="350" height="185" rx="6" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.5" />
                  <text x="790" y="125" fill={p.stroke} fontSize="11.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    ROTATING KINEMATICS &amp; RINGS
                  </text>
                  <text x="790" y="154" fill={p.dimLine} fontSize="11" fontFamily="JetBrains Mono, monospace">
                    Stroke: {config.stroke.toFixed(3)}&quot; | Rod: {config.rodLength.toFixed(3)}&quot;
                  </text>
                  <text x="790" y="178" fill={p.stroke} fontSize="11" fontFamily="JetBrains Mono, monospace">
                    R/S Ratio: {specs.rodStrokeRatio}:1 | Max Angle: {specs.maxRodAngleDeg}°
                  </text>
                  <text x="790" y="202" fill={p.accent} fontSize="11" fontFamily="JetBrains Mono, monospace">
                    Piston Speed @ 6k: {specs.meanPistonSpeed6000} FPM
                  </text>
                  <text x="790" y="226" fill={p.ok} fontSize="11" fontFamily="JetBrains Mono, monospace">
                    Gaps: {specs.topRingGap}&quot; / {specs.secondRingGap}&quot; / {specs.oilRingGap.toFixed(3)}&quot;
                  </text>
                  <text x="790" y="250" fill={p.textMuted} fontSize="10" fontFamily="JetBrains Mono, monospace">
                    Alloy: {config.pistonAlloy.toUpperCase()} ({config.pistonReliefCc} cc)
                  </text>

                  {renderCalloutBalloon('RT-101', 530, 365, 530, 465)}
                  {renderCalloutBalloon('RT-210', 297, 240, 445, 225)}
                  {renderCalloutBalloon('RT-305', 242, 155, 110, 155)}
                  {renderCalloutBalloon('RT-410', 352, 125, 485, 110)}
                  {renderCalloutBalloon('RT-520', 135, 308, 110, 255)}
                </>
              )}

              {/* Bottom ASME Title Block */}
              <rect x="19" y="505" width="1142" height="56" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.4" />
              <line x1="450" y1="505" x2="450" y2="561" stroke={p.stroke} strokeWidth="1.2" />
              <line x1="830" y1="505" x2="830" y2="561" stroke={p.stroke} strokeWidth="1.2" />
              <text x="34" y="526" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                SUBSYSTEM DRAWING TITLE
              </text>
              <text x="34" y="547" fill={p.stroke} fontSize="11.5" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">
                {activeSheet.title.slice(0, 56)}
              </text>
              <text x="466" y="526" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                PRIMARY DIMENSIONS
              </text>
              <text x="466" y="547" fill={p.dimLine} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                {specs.displacementCi} CID · {config.bore.toFixed(3)}&quot; × {config.stroke.toFixed(3)}&quot; · {specs.staticCR}:1 CR
              </text>
              <text x="846" y="526" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                DRAWING NUMBER
              </text>
              <text x="846" y="547" fill={p.accent} fontSize="11.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                {activeSheet.drawingNumber}
              </text>
            </svg>
          </div>
        </div>

        {/* Right Callout Inspector */}
        <aside className="xl:col-span-3 bg-[#12161c] border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-4">
          {activeInspectCallout && (
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
                    SKU / Ref: {activeInspectCallout.partNumber}
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
                    {activeInspectCallout.clearanceSpec}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Fastener Torque &amp; Preload</span>
                  </div>
                  <p className="font-mono text-slate-200 tabular-nums leading-relaxed">
                    {activeInspectCallout.torqueSpec}
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
                    <div className="text-[11px] font-semibold text-slate-400">Shop Inspection Notes</div>
                    <p className="text-slate-300 leading-relaxed">{activeInspectCallout.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <button
              type="button"
              onClick={() => onJumpToTab('block3d')}
              className="w-full px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <Box className="w-4 h-4" />
              <span>Inspect in 3D Engine Viewport</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              Click any blueprint balloon or schedule row below to inspect tolerances.
            </p>
          </div>
        </aside>
      </div>

      {/* Component Schedule & BOM Table */}
      <div className="bg-[#12161c] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">
              Subsystem Dimension, Clearance &amp; Torque BOM Schedule
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{activeSheet.unitSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="flex items-center gap-1 p-1 bg-[#0d1014] border border-slate-800 rounded-lg">
              {rowsAvailable.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRowFilter(r)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    rowFilter === r
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
                <th className="py-2.5 px-3 font-medium">OEM / Ref SKU</th>
                <th className="py-2.5 px-3 font-medium">Dimension &amp; Clearance Spec</th>
                <th className="py-2.5 px-3 font-medium">Torque Spec</th>
                <th className="py-2.5 px-3 font-medium">Material</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCallouts.map((c, idx) => {
                const isSelected = activeInspectCallout?.indexCode === c.indexCode;
                return (
                  <tr
                    key={`${c.indexCode}_${idx}`}
                    onClick={() => setSelectedCallout(c)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-orange-950/40 text-white' : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap tabular-nums">
                      {c.indexCode}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">{c.row}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white">{c.partName}</div>
                      {c.notes && <div className="text-[11px] text-slate-400 mt-0.5">{c.notes}</div>}
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
