/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoordinatedSpecs, EngineConfig, EngineSubassemblyKey } from '../types/engine';
import { EngineFamilySpec } from './engineFamilies';

export type ManufacturingProcessCategory =
  | 'ALL'
  | '5-Axis CNC'
  | 'Grinding & Honing'
  | 'EDM & Additive'
  | 'Heat Treat & Coating'
  | 'Inspection & NDT';

export type MatrixComponentKey =
  | 'block'
  | 'crank'
  | 'rotating_rod'
  | 'rotating_piston'
  | 'heads'
  | 'cam'
  | 'valvetrain_rocker'
  | 'intake'
  | 'timingCover'
  | 'lubrication'
  | 'bellhousing'
  | 'damper';

export interface GdtCalloutSpec {
  symbol: string;
  characteristic: string;
  tolerance: string;
  datumRef: string;
  metrologyTool: string;
}

export interface KeyPartDimension {
  label: string;
  nominal: string;
  toleranceBand: string;
}

export interface ManufacturingMatrixEntry {
  id: MatrixComponentKey;
  subassemblyKey: EngineSubassemblyKey;
  drawingNumber: string;
  revision: string;
  partName: string;
  aerospaceGradeEquiv: string;
  materialSpec: string;
  materialStandard: string;
  processCategory: Exclude<ManufacturingProcessCategory, 'ALL'>;
  primaryProcess: string;
  secondaryProcesses: string[];
  surfaceFinishRa: string;
  hardnessSpec: string;
  ndtMethods: string[];
  datumScheme: string;
  toleranceStackSummary: string;
  camToolingNotes: string;
  cycleTimeEst: string;
  gdtCallouts: GdtCalloutSpec[];
  keyDimensions: KeyPartDimension[];
}

export const MATRIX_PROCESS_CATEGORIES: ManufacturingProcessCategory[] = [
  'ALL',
  '5-Axis CNC',
  'Grinding & Honing',
  'EDM & Additive',
  'Heat Treat & Coating',
  'Inspection & NDT'
];

export function getManufacturingMatrix(
  config: EngineConfig,
  specs: CoordinatedSpecs,
  family?: EngineFamilySpec
): ManufacturingMatrixEntry[] {
  const boreStr = config.bore.toFixed(3);
  const strokeStr = config.stroke.toFixed(3);
  const rodStr = config.rodLength.toFixed(3);
  const deckStr = config.deckHeight.toFixed(3);
  const chamberStr = config.chamberCc.toFixed(1);
  const cylCount = config.cylinders ?? family?.cylinders ?? 8;
  const engCode = (family?.code.split(' ')[0] || 'MOD350').toUpperCase();
  const blockMat = family?.blockMaterial || 'Class 35 High-Nickel Cast Iron';
  const headMat = family?.headType || '356-T6 Cast Aluminum / High-Flow Port';
  const bellPat = config.bellhousingPattern || family?.bellhousingPattern || 'GM_Chevy_V8';
  const intPortCc = config.intakePortCc ?? 185;
  const intValve = config.intakeValveIn ?? 2.02;
  const exhPortCc = config.exhaustPortCc ?? 68;
  const exhValve = config.exhaustValveIn ?? 1.60;
  const exhShape = config.exhaustPortShape || 'd_port';
  const headerTube = config.headerPrimaryIn ?? 1.625;
  const carbVenturi = config.carbVenturiIn ?? 1.375;
  const carbStyleLabel = (config.carbStyle || '4150_dp').toUpperCase().replace('_', ' ');

  return [
    {
      id: 'block',
      subassemblyKey: 'block',
      drawingNumber: `AS9100-${engCode}-BLK-101`,
      revision: 'REV D',
      partName: `Cylinder Block & Main Line-Bore (${cylCount}-Cyl, ${boreStr}" × ${deckStr}")`,
      aerospaceGradeEquiv: 'Propulsion Crankcase Housing · Datum Base Structure',
      materialSpec: blockMat,
      materialStandard: blockMat.toLowerCase().includes('aluminum')
        ? 'AMS 4218 (A356-T6) + 4130 Ductile Sleeves'
        : 'SAE J431 G3500 / CGI Grade 450 Cast Iron',
      processCategory: '5-Axis CNC',
      primaryProcess: '5-Axis Horizontal Machining Center (Decking, Line Boring & Bore Roughing)',
      secondaryProcesses: [
        'Rottler Torque-Plate CBN Plateau Honing (280 / 400 Grit)',
        'Thermal Stress-Relief Cycle (1,050°F × 4 hr)',
        'CMM Datum A/B/C Verification & Ultrasonic Bore Wall Mapping'
      ],
      surfaceFinishRa: 'Ra 12–16 µin (Plateau Hone Rvk 25–35 µin) | Deck Ra ≤ 32 µin',
      hardnessSpec: '215–255 HBW (Iron) / 70–85 HRB (Alum T6)',
      ndtMethods: ['Magnetic Particle (ASTM E1444)', 'Ultrasonic Bore Wall Thickness (≥ 0.180")', 'CMM 3D Touch-Probe'],
      datumScheme: 'Datum A: Crank Main Centerline | Datum B: Squared Deck Plane | Datum C: Front Cover Dowels',
      toleranceStackSummary: `Deck height ${deckStr}" ±0.001" pairs with ${config.deckClearance.toFixed(3)}" piston clearance + ${config.gasketThickness.toFixed(3)}" gasket for ${specs.quenchDistance}" total quench.`,
      camToolingNotes: 'Use 65 ft-lb cast-iron torque plates during final 0.003" CBN plateau hone; verify 45° ±2° crosshatch valley depth.',
      cycleTimeEst: '6.4 hrs setup + CNC + hone',
      gdtCallouts: [
        {
          symbol: '⌭',
          characteristic: 'Cylindricity (Bore Taper & Out-of-Round)',
          tolerance: '0.0004"',
          datumRef: 'A',
          metrologyTool: 'Mitutoyo Dial Bore Gauge + CMM Cylinder Scan'
        },
        {
          symbol: '⊥',
          characteristic: 'Bore Axis Perpendicularity to Crank Datum',
          tolerance: '0.0005"',
          datumRef: 'A | B',
          metrologyTool: 'Zeiss CMM 5-Axis Bridge Probe'
        },
        {
          symbol: '⏥',
          characteristic: 'Deck Surface Flatness (MLS Gasket Seal)',
          tolerance: '0.0015" OAL',
          datumRef: 'B',
          metrologyTool: 'Precision Straightedge + White-Light Profilometer'
        },
        {
          symbol: '⌖',
          characteristic: 'Bellhousing Dowel True Position vs Crank Axis',
          tolerance: 'Ø 0.0030"',
          datumRef: 'A | B',
          metrologyTool: 'Dial Test Indicator (TIR Sweep)'
        }
      ],
      keyDimensions: [
        { label: 'Cylinder Bore Diameter', nominal: `${boreStr}"`, toleranceBand: '+0.0004" / -0.0000"' },
        { label: 'Block Deck Height', nominal: `${deckStr}"`, toleranceBand: '±0.0010"' },
        { label: 'Main Saddle Housing Bore', nominal: '2.6410"', toleranceBand: '±0.0003"' },
        { label: 'Piston-to-Wall Spec', nominal: specs.ptwClearance.split('(')[0].trim(), toleranceBand: 'Alloy Specific' }
      ]
    },
    {
      id: 'crank',
      subassemblyKey: 'crank',
      drawingNumber: `AS9100-${engCode}-CRK-201`,
      revision: 'REV F',
      partName: `4340 Billet / Forged Crankshaft (${strokeStr}" Stroke)`,
      aerospaceGradeEquiv: 'High-Cycle Rotating Torque Shaft · VAR Steel',
      materialSpec: '4340 Vacuum-Arc Remelted (VAR) Chromoly Forging',
      materialStandard: 'AMS 6414 / MIL-S-5000 (Aerospace Grade 4340 VAR)',
      processCategory: 'Grinding & Honing',
      primaryProcess: 'CNC Turn-Mill + Dual-Wheel CBN Orbital Crankpin Grinding',
      secondaryProcesses: [
        'Deep-Case Ion / Plasma Nitriding (AMS 2759/10, 0.015"–0.020" Case)',
        'Rolled Fillet Burnishing & Tear-Drop Oil Hole Chamfering',
        'Two-Plane Dynamic Spin Balancing (±0.5 g·in)'
      ],
      surfaceFinishRa: 'Ra 4–6 µin (Micro-Polished Journals)',
      hardnessSpec: '58–62 HRC Case / 32–36 HRC Core',
      ndtMethods: ['Fluorescent Magnetic Particle (Wet MPI, ASTM E1444)', 'Ultrasonic Inclusion Scan (AMS 2630 Class AA)', 'Adcole Shaft Metrology'],
      datumScheme: 'Datum A: Front/Rear Main Axis | Datum B: Thrust Face #5 | Datum C: #1 Pin Keyway',
      toleranceStackSummary: `Throw radius ${(config.stroke * 0.5).toFixed(3)}" held to ±0.0005" prevents cylinder-to-cylinder CR scatter across ${cylCount} cylinders.`,
      camToolingNotes: 'Maintain 0.110"–0.125" undercut fillet radius; stress relieve 2 hours post-rough grind before final CBN finish pass.',
      cycleTimeEst: '8.8 hrs turn + CBN grind + nitride',
      gdtCallouts: [
        {
          symbol: '◎',
          characteristic: 'Main Journal Concentricity',
          tolerance: '0.0004" TIR',
          datumRef: 'A',
          metrologyTool: 'V-Block + 0.0001" Test Indicator / Adcole'
        },
        {
          symbol: '⌖',
          characteristic: 'Crankpin Index Angle (Cross-Plane / Throw)',
          tolerance: '±0.08°',
          datumRef: 'A | C',
          metrologyTool: 'Optical Rotary Encoder CMM'
        },
        {
          symbol: '⌰',
          characteristic: 'Thrust Flange Total Runout',
          tolerance: '0.0005"',
          datumRef: 'A',
          metrologyTool: 'Axial Dial Indicator'
        }
      ],
      keyDimensions: [
        { label: 'Crankshaft Stroke', nominal: `${strokeStr}"`, toleranceBand: '±0.0010"' },
        { label: 'Main Journal Oil Clearance', nominal: '0.0024"', toleranceBand: '0.0020"–0.0028"' },
        { label: 'Rod Journal Oil Clearance', nominal: '0.0022"', toleranceBand: '0.0018"–0.0025"' },
        { label: 'Crank Axial End Play', nominal: '0.0050"', toleranceBand: '0.0040"–0.0060"' }
      ]
    },
    {
      id: 'rotating_rod',
      subassemblyKey: 'rotating',
      drawingNumber: `AS9100-${engCode}-ROD-220`,
      revision: 'REV C',
      partName: `4340 H-Beam Connecting Rod (${rodStr}" C-to-C, R/S ${specs.rodStrokeRatio}:1)`,
      aerospaceGradeEquiv: 'Reciprocating Tension-Compression Link',
      materialSpec: '4340 Aircraft-Quality Forged Chromoly (or Ti-6Al-4V AMS 4928)',
      materialStandard: 'AMS 6415 / ARP 2000 Fastener Retention',
      processCategory: 'EDM & Additive',
      primaryProcess: '5-Axis Contour Milling + Wire-EDM Cap Split & Serrated Joint',
      secondaryProcesses: [
        'Controlled Glass-Bead / Steel Shot Peening (AMS 2430, Almen 12A)',
        'Sunnen Precision Rod Big-End & Pin Bushing Honing (Under ARP Stretch Load)',
        'Weight Matching (End-to-End Big/Small Balance ±0.5 g)'
      ],
      surfaceFinishRa: 'Ra 8–12 µin (Big-End & Pin Bushing IDs)',
      hardnessSpec: '36–40 HRC (4340 Core)',
      ndtMethods: ['Wet Fluorescent MPI (100% Cap & Beam)', 'Bolt Stretch Ultrasonic / Dial Gauge (0.0058"–0.0062")'],
      datumScheme: 'Datum A: Big-End Bore Axis | Datum B: Rod Thrust Face | Datum C: Wrist-Pin Bore Axis',
      toleranceStackSummary: `R/S ratio ${specs.rodStrokeRatio}:1 limits max rod angularity to ${specs.maxRodAngleDeg}°, controlling side-load wear on cylinder wall.`,
      camToolingNotes: 'Hone big-end housing bore strictly with ARP rod bolts torqued to 0.0060" stretch; check side clearance 0.014"–0.018".',
      cycleTimeEst: '3.2 hrs / rod set CNC + EDM + hone',
      gdtCallouts: [
        {
          symbol: '∥',
          characteristic: 'Pin-to-Big-End Bore Parallelism & Twist',
          tolerance: '0.0010"/in',
          datumRef: 'A | B',
          metrologyTool: 'Sunnen Rod Alignment Fixture'
        },
        {
          symbol: '○',
          characteristic: 'Big-End Housing Roundness (Preloaded)',
          tolerance: '0.0002"',
          datumRef: 'A',
          metrologyTool: 'Precision Split-Ball Bore Gauge'
        }
      ],
      keyDimensions: [
        { label: 'Center-to-Center Length', nominal: `${rodStr}"`, toleranceBand: '±0.0008"' },
        { label: 'Max Rod Angularity', nominal: `${specs.maxRodAngleDeg}°`, toleranceBand: 'Kinematic Bound' },
        { label: 'ARP Bolt Stretch Spec', nominal: '0.0060"', toleranceBand: '0.0058"–0.0062"' },
        { label: 'Rod Side Clearance', nominal: '0.016"', toleranceBand: '0.012"–0.020"' }
      ]
    },
    {
      id: 'rotating_piston',
      subassemblyKey: 'rotating',
      drawingNumber: `AS9100-${engCode}-PST-230`,
      revision: 'REV E',
      partName: `${config.pistonAlloy.toUpperCase()} Forged Piston & Ring Pack (${boreStr}" Bore)`,
      aerospaceGradeEquiv: 'Thermal-Barrier Reciprocating Crown',
      materialSpec:
        config.pistonAlloy === '2618'
          ? '2618-T61 Forged Aluminum (Low-Silicon Boost/Race)'
          : config.pistonAlloy === '4032'
          ? '4032-T6 Forged Aluminum (11% Si Low-Expansion)'
          : '390 Hypereutectic Cast Aluminum',
      materialStandard: 'AMS 4141 / AA 2618-T61 Forging Billet',
      processCategory: 'Heat Treat & Coating',
      primaryProcess: 'Multi-Axis CNC Cam-Elliptical Skirt Turning & Ring Groove Diamond Turn',
      secondaryProcesses: [
        'Ceramic Thermal-Barrier Crown Coating (0.0015" YSZ Plasma Spray)',
        'Moly-Disulfide Anti-Friction Skirt Coating (0.0005")',
        'Precision Ring End-Gap File-Fit & Pin Circlip Groove Broach'
      ],
      surfaceFinishRa: 'Ra 4–8 µin (Ring Groove Lands) | Ra 22 µin (Skirt Micro-Groove)',
      hardnessSpec: '115–135 HBW (Aged T6/T61)',
      ndtMethods: ['Fluorescent Penetrant FPI (ASTM E1417 Crown & Pin Boss)', 'Ring Groove Optical Comparator', 'Weight Sorting (±0.5 g)'],
      datumScheme: 'Datum A: Skirt Major Diameter Axis | Datum B: Compression Height Crown | Datum C: Pin Bore Axis',
      toleranceStackSummary: `Top/2nd/Oil ring gaps ${specs.topRingGap}" / ${specs.secondRingGap}" / ${specs.oilRingGap.toFixed(3)}" prevent ring end butting at peak thermal load.`,
      camToolingNotes: 'Cam-turn barrel profile +0.002" ovality across thrust axis; verify valve relief radial clearance ≥ 0.050".',
      cycleTimeEst: '2.6 hrs CNC cam-turn + thermal coat',
      gdtCallouts: [
        {
          symbol: '⊥',
          characteristic: 'Top Ring Groove Perpendicularity to Skirt',
          tolerance: '0.0005"',
          datumRef: 'A',
          metrologyTool: 'Optical Comparator + Gauge Block'
        },
        {
          symbol: '⌭',
          characteristic: 'Wrist-Pin Bore Alignment & Clearance',
          tolerance: '0.0007"–0.0010"',
          datumRef: 'C',
          metrologyTool: 'Air Gauge / Pin Micrometer'
        }
      ],
      keyDimensions: [
        { label: 'PTW Skirt Clearance', nominal: specs.ptwClearance.split('(')[0].trim(), toleranceBand: config.pistonAlloy.toUpperCase() },
        { label: 'Top Ring End Gap', nominal: `${specs.topRingGap}"`, toleranceBand: '+0.002" / -0.000"' },
        { label: '2nd Ring End Gap', nominal: `${specs.secondRingGap}"`, toleranceBand: '+0.002" / -0.000"' },
        { label: 'Piston Dish / Dome', nominal: `${config.pistonReliefCc} cc`, toleranceBand: '±0.3 cc' }
      ]
    },
    {
      id: 'heads',
      subassemblyKey: 'heads',
      drawingNumber: `AS9100-${engCode}-HED-340`,
      revision: 'REV E',
      partName: `Cylinder Head & 5-Axis CNC Port Assembly (${chamberStr} cc / ${intPortCc} cc Int · ${exhPortCc} cc ${exhShape.replace('_', '-').toUpperCase()})`,
      aerospaceGradeEquiv: 'High-Flux Gas-Exchange Manifold Casting',
      materialSpec: headMat,
      materialStandard: 'AMS 4218 (A356-T6 Aluminum) / SAE G3000 Iron',
      processCategory: '5-Axis CNC',
      primaryProcess: '5-Axis Simultaneous CNC Runner & Combustion Chamber Profiling',
      secondaryProcesses: [
        `Serdi 5-Angle Venturi Valve Seat Machining (${intValve}" Int / ${exhValve}" Exh)`,
        'Manganese-Bronze Guide Honing & Deck Surface Fly-Cut',
        `SuperFlow Wet-Flow Bench Verification (${specs.intakeFlowPeakCfm}/${specs.exhaustFlowPeakCfm} CFM @ .600", ${specs.eiFlowRatioPct}% E/I)`
      ],
      surfaceFinishRa: 'Ra 32–45 µin (MLS Deck) | Ra 65 µin (CNC Intake Port)',
      hardnessSpec: '75–90 HRB (T6 Aging) | Seat 38–42 HRC',
      ndtMethods: ['Hot-Tank Pressure Decay Leak Test (45 PSI)', 'FPI Crack Inspection (ASTM E1417)', 'Vacuum Valve Seat Seal (≥ 24 inHg)'],
      datumScheme: 'Datum A: Head Deck Fire Plane | Datum B: Dowel Holes | Datum C: Valve Guide Axis',
      toleranceStackSummary: `${chamberStr} cc chambers + ${intPortCc} cc intake (${specs.intakeVelocityFps} ft/s) + ${exhPortCc} cc ${exhShape.replace('_', '-')} exhaust & ${headerTube.toFixed(3)}" header deliver ${specs.staticCR}:1 SCR.`,
      camToolingNotes: '5-axis ball-nose stepover 0.018" along intake roof; hand-blend 0.040" throat transition into 45° seat.',
      cycleTimeEst: '5.5 hrs CNC porting + Serdi seats',
      gdtCallouts: [
        {
          symbol: '⏥',
          characteristic: 'Head Deck Fire-Ring Flatness',
          tolerance: '0.0015" OAL',
          datumRef: 'A',
          metrologyTool: 'Laser Profilometer / Starrett Straightedge'
        },
        {
          symbol: '◎',
          characteristic: 'Valve Seat-to-Guide Concentricity',
          tolerance: '0.0010" TIR',
          datumRef: 'C',
          metrologyTool: 'Goodson Pilot Runout Gauge'
        }
      ],
      keyDimensions: [
        { label: 'Combustion Chamber / Port', nominal: `${chamberStr} cc / ${intPortCc} cc`, toleranceBand: `Exh ${exhPortCc} cc ${exhShape.toUpperCase()}` },
        { label: 'Intake / Exhaust Valves', nominal: `${intValve.toFixed(2)}" / ${exhValve.toFixed(2)}"`, toleranceBand: `${specs.eiFlowRatioPct}% E/I Ratio` },
        { label: 'Header Primary Tube OD', nominal: `${headerTube.toFixed(3)}"`, toleranceBand: `${specs.intakeFlowPeakCfm} CFM Peak` },
        { label: 'Static Compression Ratio', nominal: `${specs.staticCR}:1`, toleranceBand: `DCR ${specs.dynamicCR}:1` }
      ]
    },
    {
      id: 'cam',
      subassemblyKey: 'cam',
      drawingNumber: `AS9100-${engCode}-CAM-305`,
      revision: 'REV B',
      partName: `Camshaft Lobe & Timing Set (${specs.camData.intakeDur050}°/${specs.camData.exhDur050}° @ .050")`,
      aerospaceGradeEquiv: 'Harmonic Motion Control Profile Shaft',
      materialSpec: '8620 Carburized Billet Steel / Austempered Ductile Iron',
      materialStandard: 'AMS 6274 (8620 Alloy) / AGMA Precision Gear Timing',
      processCategory: 'Grinding & Honing',
      primaryProcess: 'CNC Single-Point CBN Cam Lobe Grinding (Constant Velocity Ramp)',
      secondaryProcesses: [
        'Selective High-Frequency Induction Hardening (58–62 HRC Lobes)',
        'Manganese-Phosphate Break-In Surface Conversion',
        'Adcole 911 Non-Contact Optical Lobe Profile Audit'
      ],
      surfaceFinishRa: 'Ra 4–6 µin (Roller Lobe Flank)',
      hardnessSpec: '60–62 HRC (Roller Billet Core) / 54 HRC (ADI)',
      ndtMethods: ['Adcole Optical Camshaft Inspection (0.0001" Lift Step)', 'Barkhausen Grind-Burn Noise Scan', 'Wet MPI'],
      datumScheme: 'Datum A: Front/Rear Cam Journal Axis | Datum B: Thrust Plate Face | Datum C: Dowel Pin',
      toleranceStackSummary: `Lobe lift ${specs.camData.lobeLift.toFixed(3)}" × ${config.rockerRatio}:1 rocker yields ${specs.totalValveLift}" net valve lift with ${specs.camData.ivcDeg}° IVC.`,
      camToolingNotes: 'Control flank jerk curve during opening ramp at 0.006"–0.020" lift to eliminate valvetrain loft above 6,500 RPM.',
      cycleTimeEst: '4.1 hrs grind + Adcole scan',
      gdtCallouts: [
        {
          symbol: '↗',
          characteristic: 'Base Circle Radial Runout',
          tolerance: '0.0005" TIR',
          datumRef: 'A',
          metrologyTool: 'Adcole / V-Block Indicator'
        },
        {
          symbol: '⌖',
          characteristic: 'Lobe Centerline & LSA Angular Indexing',
          tolerance: '±0.25°',
          datumRef: 'A | C',
          metrologyTool: 'Cam Doctor Rotary Degree Wheel'
        }
      ],
      keyDimensions: [
        { label: 'Duration @ .050" (Int/Exh)', nominal: `${specs.camData.intakeDur050}° / ${specs.camData.exhDur050}°`, toleranceBand: '±0.5°' },
        { label: 'Net Valve Lift', nominal: `${specs.totalValveLift}"`, toleranceBand: `Lobe ${specs.camData.lobeLift.toFixed(3)}"` },
        { label: 'Lobe Separation Angle', nominal: `${config.camProfile === 'radical' ? 108 : config.camProfile === 'street' ? 110 : 112}°`, toleranceBand: '±0.5°' },
        { label: 'IVC Event Timing', nominal: `${specs.camData.ivcDeg}° ABDC`, toleranceBand: 'Degreed Spec' }
      ]
    },
    {
      id: 'valvetrain_rocker',
      subassemblyKey: 'heads',
      drawingNumber: `AS9100-${engCode}-RCK-360`,
      revision: 'REV B',
      partName: `Billet Roller Rocker Arm & Valve Spring Stack (${config.rockerRatio}:1)`,
      aerospaceGradeEquiv: '7075-T651 Aerospace Lever & Cryo-Spring Assembly',
      materialSpec: '7075-T651 Extruded Billet Aluminum + Chrome-Silicon Springs',
      materialStandard: 'AMS 4045 / MIL-A-8625 Type III Hard Anodize',
      processCategory: 'Heat Treat & Coating',
      primaryProcess: '5-Axis Pocket Milling + Precision Trunnion Needle-Bearing Press',
      secondaryProcesses: [
        'MIL-A-8625 Type III Hard-Coat Anodizing (0.002" Surface Film)',
        'Cryogenic Valve Spring Stress Relief (-300°F × 18 hr) + Shot Peen',
        'Load-Cell Spring Rate & Coil-Bind Verification'
      ],
      surfaceFinishRa: 'Ra 12 µin (Roller Tip & Trunnion Bore)',
      hardnessSpec: '87 HRB (7075-T651) / 52 HRC (8620 Trunnion)',
      ndtMethods: ['Fluorescent Penetrant FPI (ASTM E1417)', 'Rimac Valve Spring Load Tester', 'Sweep Pattern Witness Check'],
      datumScheme: 'Datum A: Trunnion Shaft Axis | Datum B: Pushrod Cup Center | Datum C: Valve Roller Contact',
      toleranceStackSummary: `Multiplies ${specs.camData.lobeLift.toFixed(3)}" cam lobe lift by ${config.rockerRatio}:1 to achieve ${specs.totalValveLift}" net valve lift.`,
      camToolingNotes: 'Verify ≥ 0.060" coil bind safety margin at max lift; center roller tip sweep ≤ 0.045" across valve stem.',
      cycleTimeEst: '2.9 hrs batch CNC + anodize',
      gdtCallouts: [
        {
          symbol: '⌖',
          characteristic: 'Ratio Lever Arm Center Distance',
          tolerance: '±0.0010"',
          datumRef: 'A',
          metrologyTool: 'CMM Feature Probe'
        },
        {
          symbol: '∥',
          characteristic: 'Roller Tip Axis Parallelism to Trunnion',
          tolerance: '0.0008"',
          datumRef: 'A',
          metrologyTool: 'Pin Gauge Fixture'
        }
      ],
      keyDimensions: [
        { label: 'Nominal Rocker Ratio', nominal: `${config.rockerRatio}:1`, toleranceBand: '±0.01:1' },
        { label: 'Net Valve Lift', nominal: `${specs.totalValveLift}"`, toleranceBand: '≥ 0.060" Coil Margin' },
        { label: 'Valve Stem Sweep Width', nominal: '≤ 0.045"', toleranceBand: 'Mid-Lift Centered' }
      ]
    },
    {
      id: 'intake',
      subassemblyKey: 'intake',
      drawingNumber: `AS9100-${engCode}-INT-410`,
      revision: 'REV C',
      partName: `${specs.intakeData.name} & ${carbStyleLabel} (${config.carbCfm} CFM · ${carbVenturi.toFixed(3)}" Venturi)`,
      aerospaceGradeEquiv: 'Aerodynamic Induction Plenum & Runner Assembly',
      materialSpec: 'A356-T6 Permanent-Mold Cast or DMLS AlSi10Mg Additive Plenum',
      materialStandard: 'AMS 4218 / SAE AMS 7004 (Optional Laser Powder Bed Fusion)',
      processCategory: 'EDM & Additive',
      primaryProcess: 'Investment Casting / DMLS Additive Plenum + 5-Axis Port-Match Flange Milling',
      secondaryProcesses: [
        `Carburetor / Throttle Body Pad CNC Surface Facing (${carbVenturi.toFixed(3)}" Venturi)`,
        'Extrude-Hone Abrasive Flow Runner Polishing',
        `CMM Port Face Alignment to ${intPortCc} cc Cylinder Head Intake Flanges`
      ],
      surfaceFinishRa: 'Ra 45 µin (Abrasive Flow Runners) | Ra 32 µin (Gasket Flanges)',
      hardnessSpec: '75–85 HRB (A356-T6)',
      ndtMethods: ['CT / X-Ray Void Inspection (ASTM E155)', 'Pressure Leak Test (30 PSI Boost Rated)', 'Flow Bench Runner Delta ≤ 2%'],
      datumScheme: 'Datum A: Carburetor / TB Mounting Pad | Datum B: Bank Port Flanges | Datum C: Distributor Bore',
      toleranceStackSummary: `Sized for ${specs.peakCfmDemand} CFM engine demand vs ${specs.effectiveCarbCfm} CFM effective (${config.carbCfm} CFM ${carbStyleLabel} + air mod) at ${config.targetAFR}:1 WOT AFR.`,
      camToolingNotes: 'Machine intake port faces at exact head bank angle (e.g. 23°/90° V-angle minus 0.015" milled head offset).',
      cycleTimeEst: '4.6 hrs cast/DMLS + 5-axis face',
      gdtCallouts: [
        {
          symbol: '⏥',
          characteristic: 'Port & Carb Flange Flatness',
          tolerance: '0.0020"',
          datumRef: 'A | B',
          metrologyTool: 'Granite Surface Plate + Feeler'
        },
        {
          symbol: '⌖',
          characteristic: 'Runner Port True Position vs Head Bolt Holes',
          tolerance: 'Ø 0.0080"',
          datumRef: 'B',
          metrologyTool: 'CMM Port Edge Trace'
        }
      ],
      keyDimensions: [
        { label: 'Engine Demand / Effective CFM', nominal: `${specs.peakCfmDemand} / ${specs.effectiveCarbCfm} CFM`, toleranceBand: `${carbVenturi.toFixed(3)}" Venturi` },
        { label: 'Intake / Head Port Volume', nominal: `${specs.intakeData.runnerCc} / ${intPortCc} cc`, toleranceBand: `${specs.intakeVelocityFps} ft/s Vel` },
        { label: 'Target WOT AFR', nominal: `${config.targetAFR}:1`, toleranceBand: `Timing ${config.ignitionTiming}° BTDC` }
      ]
    },
    {
      id: 'timingCover',
      subassemblyKey: 'timingCover',
      drawingNumber: `AS9100-${engCode}-TIM-114`,
      revision: 'REV A',
      partName: 'Billet Timing Cover & 60-2 Phased Crank Trigger Wheel',
      aerospaceGradeEquiv: 'Optical/Hall Telemetry Encoder & Seal Housing',
      materialSpec: '6061-T651 Billet Cover + 1018 Ferromagnetic Trigger Wheel',
      materialStandard: 'AMS 4027 (6061-T651) / MIL-DTL-5541 Clear Chromate',
      processCategory: '5-Axis CNC',
      primaryProcess: '4-Axis Index CNC Milling + Wire-EDM 60-2 Trigger Tooth Profile',
      secondaryProcesses: [
        'Precision Seal Bore Boring (Viton Crank Front Lip Seal)',
        'Laser-Etched Degree Ring Indexing (0°–50° BTDC)',
        'Hall-Effect Sensor Bracket Rigid Calibration'
      ],
      surfaceFinishRa: 'Ra 16 µin (Seal Bore) | Ra 32 µin (Housing Faces)',
      hardnessSpec: '60 HRB (6061-T651) / 80 HRB (1018 Tooth Wheel)',
      ndtMethods: ['Optical Comparator Tooth Pitch Verification (±0.05°)', 'Dial Concentricity Check on Crank Snout'],
      datumScheme: 'Datum A: Crank Seal Bore Axis | Datum B: Block Front Mounting Face | Datum C: Alignment Dowels',
      toleranceStackSummary: `Hold 0.030"–0.045" Hall sensor air gap and ±0.05° tooth spacing to prevent ignition jitter at ${config.ignitionTiming}° BTDC.`,
      camToolingNotes: 'Finish-bore front seal housing concentric to block dowel holes within 0.002" to prevent front seal weep.',
      cycleTimeEst: '1.8 hrs CNC + EDM wheel',
      gdtCallouts: [
        {
          symbol: '◎',
          characteristic: 'Crank Seal Bore Concentricity to Crank Axis',
          tolerance: '0.0020" TIR',
          datumRef: 'B | C',
          metrologyTool: 'Dial Indicator on Crank Snout'
        },
        {
          symbol: '⌖',
          characteristic: '60-2 Tooth Angular Spacing Accuracy',
          tolerance: '±0.05°',
          datumRef: 'A',
          metrologyTool: 'Optical Comparator / CMM Rotary'
        }
      ],
      keyDimensions: [
        { label: 'Hall Sensor Air Gap', nominal: '0.038"', toleranceBand: '0.030"–0.045"' },
        { label: 'Ignition Timing Target', nominal: `${config.ignitionTiming}° BTDC`, toleranceBand: `Plug Gap ${config.sparkPlugGap.toFixed(3)}"` },
        { label: 'Tooth Pitch Error', nominal: '6.00°', toleranceBand: '±0.05°' }
      ]
    },
    {
      id: 'lubrication',
      subassemblyKey: 'lubrication',
      drawingNumber: `AS9100-${engCode}-OIL-510`,
      revision: 'REV B',
      partName: 'High-Volume Gerotor / Spur Oil Pump & Baffled Sump',
      aerospaceGradeEquiv: 'Positive-Displacement Hydraulic Scavenge Module',
      materialSpec: '356-T6 / 6061-T6 Pump Body + 8620 Hardened Steel Rotors',
      materialStandard: 'AMS 6274 Rotors / Anti-Galling Hard Anodized Pocket',
      processCategory: 'EDM & Additive',
      primaryProcess: 'Wire-EDM Involute Gerotor Profile + Precision Double-Disc Surface Lapping',
      secondaryProcesses: [
        'Billet Anti-Cavitation Bypass Port Relief Chamfering',
        'TIG-Welded Baffled Sump Trap-Door Assembly (AWS D17.1)',
        'Hydraulic Bench Flow & Relief Crack-Pressure Calibration'
      ],
      surfaceFinishRa: 'Ra 4–8 µin (Lapped Rotor End-Faces)',
      hardnessSpec: '58–60 HRC (Rotors)',
      ndtMethods: ['Bench Flow Rig Calibration (60 PSI Hot Spec)', 'Weld Dye Penetrant (Sump Baffles)', 'Air-Gauge Pocket Clearance'],
      datumScheme: 'Datum A: Drive Shaft Bore | Datum B: Cover Mating Face | Datum C: Block Pad Dowel',
      toleranceStackSummary: 'Rotor side & tip clearances held to 0.0015"–0.0025" maintain 55–65 PSI hot oil pressure across 6,500 RPM.',
      camToolingNotes: 'Lap rotor faces flat within 0.0002" on cast-iron lapping plate; verify pickup clearance 0.250"–0.375" off sump floor.',
      cycleTimeEst: '2.4 hrs EDM + lap + TIG',
      gdtCallouts: [
        {
          symbol: '⏥',
          characteristic: 'Pump Cover & Pocket Face Flatness',
          tolerance: '0.0003"',
          datumRef: 'B',
          metrologyTool: 'Optical Flat + Monochromatic Light'
        },
        {
          symbol: '∥',
          characteristic: 'Rotor End-Play Axial Clearance',
          tolerance: '0.0015"–0.0025"',
          datumRef: 'B',
          metrologyTool: 'Plastigage / Depth Micrometer'
        }
      ],
      keyDimensions: [
        { label: 'Hot Relief Pressure', nominal: '60 PSI', toleranceBand: '55–65 PSI' },
        { label: 'Rotor Tip Clearance', nominal: '0.0020"', toleranceBand: '0.0015"–0.0030"' },
        { label: 'Pickup-to-Sump Floor', nominal: '0.312"', toleranceBand: '0.250"–0.375"' }
      ]
    },
    {
      id: 'bellhousing',
      subassemblyKey: 'chassis',
      drawingNumber: `AS9100-${engCode}-BEL-610`,
      revision: 'REV D',
      partName: `SFI 6.1 Bellhousing & Concentric Flange (${bellPat})`,
      aerospaceGradeEquiv: 'Structural Driveline Alignment Adapter',
      materialSpec: '4130 Hydroformed Steel / 6061-T6 Billet Swap Adapter',
      materialStandard: 'AMS 6350 (4130 Chromoly) / SFI Spec 6.1 Containment',
      processCategory: 'Inspection & NDT',
      primaryProcess: '5-Axis Face & Register Boring + Offset Dowel Indexing Calibration',
      secondaryProcesses: [
        'SFI 6.1 Hydroform / Spin-Form Scattershield Stress Relief',
        'Parallel Face Blanchard Grinding (Block Face to Trans Face)',
        'Dial Indicator TIR Sweeping vs Crank Pilot Axis'
      ],
      surfaceFinishRa: 'Ra 32 µin (Block & Transmission Mating Faces)',
      hardnessSpec: '28–32 HRC (4130 Normalized)',
      ndtMethods: ['Dial Test Indicator Concentricity Sweep (≤ 0.005" TIR)', 'Parallelism Sweep Across Register Face', 'SFI Ultrasonic Weld Audit'],
      datumScheme: 'Datum A: Crankshaft Pilot Axis | Datum B: Engine Rear Block Face | Datum C: Block Dowels',
      toleranceStackSummary: `${specs.compatibility.bellhousing} · ${specs.compatibility.adapterRequired}. Centering within 0.005" TIR protects transmission input bearing.`,
      camToolingNotes: 'Machine transmission pilot register bore only after clamping engine flange face flat against Datum B fixture.',
      cycleTimeEst: '2.1 hrs CNC + Blanchard grind',
      gdtCallouts: [
        {
          symbol: '◎',
          characteristic: 'Trans Input Register Bore Concentricity',
          tolerance: '≤ 0.0050" TIR',
          datumRef: 'A | B',
          metrologyTool: 'Magnetic-Base Dial Test Indicator'
        },
        {
          symbol: '∥',
          characteristic: 'Trans Face Parallelism to Block Face',
          tolerance: '0.0020"',
          datumRef: 'B',
          metrologyTool: 'Dial Indicator Face Sweep'
        }
      ],
      keyDimensions: [
        { label: 'Bellhousing Bolt Pattern', nominal: bellPat, toleranceBand: specs.compatibility.isDirectBoltOn ? 'Direct Bolt' : 'Adapter Req' },
        { label: 'Max Allowed Runout', nominal: '0.0050" TIR', toleranceBand: 'Offset Dowels if > 0.005"' },
        { label: 'Face Parallelism', nominal: '0.0020"', toleranceBand: 'Blanchard Ground' }
      ]
    },
    {
      id: 'damper',
      subassemblyKey: 'timingCover',
      drawingNumber: `AS9100-${engCode}-DMP-520`,
      revision: 'REV C',
      partName: 'SFI 18.1 Harmonic Torsional Damper & Ring Gear',
      aerospaceGradeEquiv: 'Torsional Vibration Absorber Assembly',
      materialSpec: '4140 Billet Inertia Ring + 6061 Hub / High-Temp Elastomer',
      materialStandard: 'AMS 6382 (4140 Alloy) / SFI Spec 18.1 Certification',
      processCategory: 'Inspection & NDT',
      primaryProcess: 'CNC Multi-Axis Hub Boring & Honing + Laser Timing Degree Engraving',
      secondaryProcesses: [
        'SFI 18.1 Vulcanized Elastomer / Silicone Fluid Damping Bond',
        '2-Plane Dynamic Spin Balance (≤ 0.10 oz-in Residual Unbalance)',
        'Crank Snout Interference Fit Gauge Certification'
      ],
      surfaceFinishRa: 'Ra 12 µin (Crank Snout Bore & Seal Journal)',
      hardnessSpec: '30–34 HRC (4140 Inertia Ring)',
      ndtMethods: ['2-Plane Dynamic Spin Balancer', 'Bore Air-Gauge Interference Check (0.0005"–0.0010" Press)', 'Zero-TDC Laser Verification'],
      datumScheme: 'Datum A: Crank Snout Bore | Datum B: Rear Hub Shoulder | Datum C: Crank Keyway Slot',
      toleranceStackSummary: 'Damps 1st/2nd harmonic crankshaft twist frequencies across idle-to-6,500+ RPM while preserving TDC timing accuracy.',
      camToolingNotes: 'Hone hub ID to 0.0005"–0.0010" interference press below crank snout OD; broach keyway within ±0.0005" symmetry.',
      cycleTimeEst: '1.9 hrs CNC + spin balance',
      gdtCallouts: [
        {
          symbol: '⌰',
          characteristic: 'Inertia Ring Outer Runout',
          tolerance: '0.0020" TIR',
          datumRef: 'A',
          metrologyTool: 'V-Mandrel Runout Stand'
        },
        {
          symbol: '⌖',
          characteristic: 'TDC Laser Mark Alignment to Keyway',
          tolerance: '±0.15°',
          datumRef: 'A | C',
          metrologyTool: 'Rotary Optical Indexer'
        }
      ],
      keyDimensions: [
        { label: 'Snout Press Interference', nominal: '0.0007"', toleranceBand: '0.0005"–0.0010"' },
        { label: 'Dynamic Balance Residual', nominal: '≤ 0.10 oz-in', toleranceBand: 'ISO G1.0 Grade' },
        { label: 'Mean Piston Speed @ 6k', nominal: `${specs.meanPistonSpeed6000} FPM`, toleranceBand: 'SFI 18.1 Rated' }
      ]
    }
  ];
}
