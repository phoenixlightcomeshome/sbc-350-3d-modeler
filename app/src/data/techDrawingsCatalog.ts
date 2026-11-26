/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EngineConfig,
  CoordinatedSpecs,
  TransmissionItem,
  TechDrawingSheet,
  TechDrawingCallout
} from '../types/engine';
import { ActiveStoreSelection } from '../components/AutoPartsStorePanel';

export interface DrawingMetadataHeader {
  titleBlock: string;
  revisionStatus: string;
  scale: string;
  projection: string;
  units: string;
  materialAndFinishNotes: string;
  sourceRef: string;
}

export interface EngineeringStandardsReference {
  asmeY14_5: string;
  asmeY14_100AndY14_38: string;
  stepAp242: string;
  iso2768And22081: string;
  iso8062_3: string;
  iso21940And1940: string;
  iso1302AndIso286: string;
  isoAstm52900: string;
  saeJSeriesNote: string;
  modernV8ProductionDrawingNote: string;
}

export const ENGINEERING_STANDARDS_REFERENCE: EngineeringStandardsReference = {
  asmeY14_5:
    'ASME Y14.5-2018 (superseding Y14.5-2009): Authoritative GD&T standard for symbols, rules, datum reference frames, and feature control frames (characteristic, tolerance/modifiers, datum order) [Ref: ASME Y14; True Precision Machining; GD&T Basics]',
  asmeY14_100AndY14_38:
    'ASME Y14.100 covers engineering drawing practices; ASME Y14.38 governs product definition abbreviations and acronyms [Ref: ASME Y14; ANSI/ASME Y14.38-2019]',
  stepAp242:
    'STEP AP242 (ISO 10303-242): Managed model-based 3D engineering (MBD) merging/replacing AP203 and AP214, carrying 3D B-rep/assembly data and graphical/semantic PMI [Ref: ap242.org; Spatial STEP AP242]',
  iso2768And22081:
    'ISO 2768-1 defines general linear/angular tolerance classes (f, m, c, v); ISO 2768-2 was withdrawn and replaced by ISO 22081 [Ref: Makerverse ISO 2768 & ISO 22081 Guide]',
  iso8062_3:
    'ISO 8062-3 defines Dimensional Casting Tolerance Grades (DCTG 1–16) for castings [Ref: ISO 8062-3; Redstone Manufacturing]',
  iso21940And1940:
    'ISO 1940-1 rigid-rotor balance grading was superseded by ISO 21940-11:2016 (G6.3 crankshaft/rotating-drive reference grade) [Ref: ISO 1940-1 / ISO 21940-11 Reference]',
  iso1302AndIso286:
    'ISO 1302 governs surface texture indication on drawings; ISO 286 defines hole/shaft tolerance grades and fits [Ref: ISO 1302 / ISO 286 Standards; Prototek ISO 286]',
  isoAstm52900:
    'ISO/ASTM 52900 defines additive manufacturing terminology and process categories [Ref: ISO/ASTM 52900; Epocrafter]',
  saeJSeriesNote:
    'SAE J-series automotive standards cover fasteners, materials, and powertrain practices [EST — verify specific SAE J standard number for each fastener/material/test method]',
  modernV8ProductionDrawingNote:
    'Modern V8 drawings call out plateau bore finishing, deck flatness/surface finish, dynamic rotating balance, torque-angle (TTY) fastener tightening, and OEM-published block/head machining tolerances [NEEDS RAY\'S MEASUREMENT on physical parts; verify OEM service manual]'
};

export const DEFAULT_DRAWING_METADATA: DrawingMetadataHeader = {
  titleBlock: 'Drawing Metadata Block (Populate per OEM / Shop Print)',
  revisionStatus: 'Verify current revision / ECO status [NEEDS RAY\'S MEASUREMENT / verify print]',
  scale: 'NTS / Per Sheet [EST]',
  projection: 'Per ASME Y14.3 / ISO 128 drawing sheet practice [Ref: ASME Y14]',
  units: 'Inch (in) / Metric (mm) per drawing [Ref: ASME Y14.5-2018; ISO 2768-1]',
  materialAndFinishNotes:
    'Specify alloy, heat treat, surface finish (ISO 1302 / separate from ISO 2768), GD&T (ASME Y14.5-2018 / ISO 22081), and PMI (ISO 10303-242); verify OEM print [NEEDS RAY\'S MEASUREMENT]',
  sourceRef: 'ASME Y14.5-2018; ASME Y14.100; ASME Y14.38; ISO 10303-242; ISO 2768-1; ISO 22081; ISO 1302'
};

/**
 * Full exploded technical drawing catalog & Row A-F breakdown
 * for Chrysler 40RH / 42RH / 42RE / 44RE (A500) matching the reference sheet.
 */
export const A500_42RE_REFERENCE_IMAGE = '/assets/aistudio/a500-42re_1_d7f971b5.jpg';

const MOPAR_A500_42RE_SHEET: TechDrawingSheet = {
  id: 'builtin_mopar_a500_42re',
  domain: 'transmission',
  drawingNumber: 'GANZ-218-219 / A500-42RE [Ref: v15 A500/42RE Sheet]',
  title: 'Chrysler 40RH / 42RH / 42RE / 44RE (A500) RWD 4-Speed Automatic',
  subtitle: 'Exploded Technical Catalog Breakdown (Rows A–F) & Service Manual Tolerances [Ref: v15 Sheet; ASME Y14.5-2018]',
  sourceLabel: 'Factory A500 / 42RE Exploded Parts & Service Manual [Ref: v15 Sheet; ASME Y14.5-2018 / ISO 10303-242]',
  unitSummary:
    'Lockup TorqueFlite A904 evolution featuring rear Overdrive planetary carrier (0.69:1), overdrive clutch pack, governor pressure control (hydraulic on 40RH/42RH; electronic on 42RE/44RE), and deep-sump pan [Ref: v15 Sheet; verify OEM manual].',
  referenceImageUrl: A500_42RE_REFERENCE_IMAGE,
  dimensions: {
    ratios: [2.74, 1.54, 1.00, 0.69],
    reverse: 2.21,
    lengthInches: 32.4,
    defaultStall: 2400,
    nativePattern: 'Chrysler_LA_Magnum'
  },
  callouts: [
    {
      row: 'A',
      indexCode: 'A-001 / TC',
      partName: 'Lockup Torque Converter (318 / 360 / 3.9L)',
      partNumber: 'CR-76 / A500-LU [Ref: v15 Sheet]',
      category: 'Torque Converter',
      clearanceSpec: 'Converter Hub Runout ≤ 0.015" | End-Clearance 0.080"–0.125" [Ref: v15 Sheet; NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Flexplate Bolts: 270 in-lbs (22.5 ft-lbs) + Loctite 242 [Ref: v15 Sheet; verify OEM manual]',
      material: 'Stamped Steel & Friction Clutch per OEM/converter spec [Ref: v15 Sheet]',
      notes: 'Inspect converter drive lugs & impeller hub flats prior to seating on front pump rotor [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'converter'
    },
    {
      row: 'A',
      indexCode: 'A-500 / 510',
      partName: 'Front Oil Pump Housing, Gear Set & Reaction Shaft Support',
      partNumber: '12510A / 52118636 [Ref: v15 Sheet]',
      category: 'Hydraulics',
      clearanceSpec: 'Outer Gear-to-Pocket 0.001"–0.004" | Crescent-to-Gear 0.002"–0.008" [Ref: v15 Sheet; NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Pump Cover-to-Support: 15 ft-lbs | Pump-to-Case: 175 in-lbs [Ref: v15 Sheet; verify OEM manual]',
      material: 'Cast Iron Support + Gear/Crescent per OEM spec [Ref: v15 Sheet]',
      notes: 'Verify seal rings & pump gaskets during assembly [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'frontPump'
    },
    {
      row: 'B',
      indexCode: 'B-554 / 556',
      partName: 'Direct (Front) & Forward (Rear) Multi-Disc Clutch Drums',
      partNumber: '12554 / 12556 [Ref: v15 Sheet]',
      category: 'Internal Gear Train',
      clearanceSpec: 'Front Clutch Pack 0.067"–0.134" | Rear Clutch Pack 0.025"–0.045" [Ref: v15 Sheet; NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Input Shaft End Play Spec: 0.036"–0.086" [Ref: v15 Sheet; NEEDS RAY\'S MEASUREMENT]',
      material: 'Steel Drum + Friction & Steel Discs per OEM spec [Ref: v15 Sheet]',
      notes: 'Select thrust washers #4/#5 behind reaction support to set input end play [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'clutchPack'
    },
    {
      row: 'C',
      indexCode: 'C-700',
      partName: 'Main Case Integral Bellhousing & Kickdown / Reverse Band Anchors',
      partNumber: '12700A-42RE [Ref: v15 Sheet]',
      category: 'Transmission Housing',
      clearanceSpec: 'Front Kickdown Band: 72 in-lbs backed off (verify 42RE 3 turns vs 42RH 2-1/4 turns per model year) | Rear Band: 72 in-lbs backed off 4 turns [Ref: v15 Sheet; verify OEM service manual]',
      torqueSpec: 'Bellhousing-to-Engine Block: 30 ft-lbs | Case-to-OD Bolts: 25 ft-lbs [Ref: v15 Sheet; verify OEM manual]',
      material: 'Die-Cast Aluminum Alloy [Ref: v15 Sheet; ISO 8062-3]',
      notes: 'Verify Chrysler LA/Magnum starter pocket & inspection cover clearance [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'bellhousing'
    },
    {
      row: 'C',
      indexCode: 'C-582 / 584',
      partName: 'Sun Shell, Planetary Carriers & Overdrive Sprag / Spring Pack',
      partNumber: '12582-HD / 12584 [Ref: v15 Sheet]',
      category: 'Internal Gear Train',
      clearanceSpec: 'Planetary Pinion End Play 0.006"–0.029" | OD Thrust Clearance 0.015"–0.035" [Ref: v15 Sheet; NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Use calibrated spring compression fixture before removing/installing OD snap ring [Ref: v15 Sheet]',
      material: 'Case-Hardened Alloy Steel Gearset [Ref: v15 Sheet]',
      notes: 'Use proper spring compression fixture when servicing OD direct spring snap ring.',
      targetSubassembly: 'mainCase'
    },
    {
      row: 'D',
      indexCode: 'D-740 / 420',
      partName: 'Valve Body Assembly, Governor Pressure Control & Filter',
      partNumber: '12740-42RE / 52118789 [Ref: v15 Sheet]',
      category: 'Hydraulics',
      clearanceSpec: 'Line Pressure 54–60 PSI (Idle) / 90–115 PSI (WOT) | Governor ~1 PSI per MPH [Ref: v15 Sheet; verify OEM manual]',
      torqueSpec: 'Valve Body-to-Case Bolts: 100 in-lbs | Filter Screws: 35 in-lbs [Ref: v15 Sheet; verify OEM manual]',
      material: 'Cast Aluminum Body + Solenoid/Transducer per model [Ref: v15 Sheet]',
      notes: '42RE/44RE uses electronic governor transducer & solenoid; 40RH/42RH uses hydraulic governor [Ref: v15 Sheet].',
      targetSubassembly: 'valveBody'
    },
    {
      row: 'D',
      indexCode: 'D-765',
      partName: 'Deep Sump Transmission Pan & Gasket',
      partNumber: '12765D / 2464324AC [Ref: v15 Sheet]',
      category: 'Transmission',
      clearanceSpec: 'Filter Pickup-to-Pan Bottom Clearance ≥ 0.250" [Ref: v15 Sheet; NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Pan Rail Bolts (14x): 150 in-lbs cross-pattern [Ref: v15 Sheet; verify OEM manual]',
      material: 'Stamped Steel / Cast Aluminum per pan spec [Ref: v15 Sheet]',
      notes: 'Clean pan magnet and fill with ATF+4 (MS-9602) per OEM spec [Ref: v15 Sheet].',
      targetSubassembly: 'pan'
    },
    {
      row: 'F',
      indexCode: 'F-770',
      partName: 'Overdrive Extension Housing, Output Shaft & Rear Seal',
      partNumber: '12770-OD [Ref: v15 Sheet]',
      category: 'Driveline',
      clearanceSpec: 'Extension Bushing Journal Clearance 0.0015"–0.0035" [Ref: v15 Sheet; NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Extension Housing-to-Main Case: 24 ft-lbs | Crossmember Mount: 50 ft-lbs [Ref: v15 Sheet; verify OEM manual]',
      material: 'Die-Cast Aluminum Housing + Bushing per OEM spec [Ref: v15 Sheet]',
      notes: 'Houses overdrive planetary carrier, park gear, and speed/VSS sensor [Ref: v15 Sheet].',
      targetSubassembly: 'tailhousing'
    },
    {
      row: 'F',
      indexCode: 'F-790',
      partName: 'Output Slip Yoke & U-Joint Assembly',
      partNumber: 'SY-A500-1350 [Ref: v15 Sheet]',
      category: 'Driveline',
      clearanceSpec: 'Driveshaft Slip Travel Reserve: 0.75"–1.00" compressed [Ref: v15 Sheet; NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'U-Joint Fasteners: 17–24 ft-lbs [Ref: v15 Sheet; verify fastener/OEM spec]',
      material: 'Forged Steel Slip Yoke [Ref: v15 Sheet]',
      notes: 'Verify spline count, lubrication, and working angles [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'slipYoke'
    }
  ]
};

/**
 * Generates a technical drawing BOM & reference spec sheet for transmissions in TRANSMISSIONS_DB.
 * Unverified/model-specific part numbers and clearances are flagged [NEEDS RAY'S MEASUREMENT] or [EST].
 */
export function getTransmissionDrawingSheet(trans: TransmissionItem): TechDrawingSheet {
  if (trans.id === 'mopar_a500_42re') {
    return MOPAR_A500_42RE_SHEET;
  }

  const isAuto = trans.type === 'Automatic';
  const ratioLabel = trans.ratios.map((r, i) => `G${i + 1}:${r.toFixed(2)}`).join(' · ');

  const autoCallouts: TechDrawingCallout[] = [
    {
      row: 'A',
      indexCode: 'A-001',
      partName: `${trans.name.split('(')[0].trim()} Torque Converter Assembly`,
      partNumber: 'NEEDS RAY\'S MEASUREMENT / OEM or Converter Spec',
      category: 'Torque Converter',
      clearanceSpec: `Converter End-Play / Pull-Out per OEM/converter spec | Stall: ${trans.defaultStall} RPM [NEEDS RAY\'S MEASUREMENT]`,
      torqueSpec: 'Flexplate-to-Converter Bolts: Per OEM / converter manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per OEM / converter specification [NEEDS RAY\'S MEASUREMENT]',
      notes: 'Verify converter hub engagement and runout prior to assembly [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'converter'
    },
    {
      row: 'A',
      indexCode: 'A-030',
      partName: 'Front Hydraulic Pump & Stator Support',
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Hydraulics',
      clearanceSpec: 'Pump Gear & Bushing Clearances: Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Pump Fasteners: Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per OEM / rebuild specification [NEEDS RAY\'S MEASUREMENT]',
      notes: 'Inspect pump gears, stator support, and seals per service manual [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'frontPump'
    },
    {
      row: 'B',
      indexCode: 'B-120',
      partName: `${trans.clutch} Clutch Pack`,
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Internal Gear Train',
      clearanceSpec: 'Clutch Pack Clearance & End Play: Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      material: `${trans.clutch} [Ref: TRANSMISSIONS_DB]`,
      notes: 'Verify selective clearance and apply operation per manual [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'clutchPack'
    },
    {
      row: 'C',
      indexCode: 'C-200',
      partName: `${trans.nativePattern} Bellhousing & Case Flange`,
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Transmission Housing',
      clearanceSpec: 'Bellhousing Runout & Dowel Alignment: Per OEM / SFI spec [NEEDS RAY\'S MEASUREMENT; ASME Y14.5-2018]',
      torqueSpec: 'Bellhousing-to-Engine Bolts: Per OEM / engine service manual [NEEDS RAY\'S MEASUREMENT]',
      material: 'Cast / Machined Housing per OEM spec [Ref: ISO 8062-3; NEEDS RAY\'S MEASUREMENT]',
      notes: `Native pattern ${trans.nativePattern}. ${trans.tunnelProfile} [NEEDS RAY\'S MEASUREMENT on chassis].`,
      targetSubassembly: 'bellhousing'
    },
    {
      row: 'C',
      indexCode: 'C-260',
      partName: `Planetary Gearset & Shafts (${trans.ratios.length}-Speed)`,
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Internal Gear Train',
      clearanceSpec: `Shaft End Play per manual | Ratios: ${ratioLabel} [NEEDS RAY\'S MEASUREMENT]`,
      torqueSpec: 'Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      material: 'Alloy Steel Gearset per OEM spec [NEEDS RAY\'S MEASUREMENT]',
      notes: `Forward ratios ${trans.ratios.join(' / ')}; Reverse ${trans.reverse}:1 [Ref: TRANSMISSIONS_DB].`,
      targetSubassembly: 'mainCase'
    },
    {
      row: 'D',
      indexCode: 'D-340',
      partName: 'Valve Body & Hydraulic Controls',
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Hydraulics',
      clearanceSpec: 'Line Pressure & Valve Spool Operation: Per OEM manual [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Valve Body Bolts: Per OEM service manual in sequence [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      notes: 'Verify check balls, springs, filter, and gasket mating faces [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'valveBody'
    },
    {
      row: 'E',
      indexCode: 'E-410',
      partName: 'Transmission Pan & Sump',
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Transmission',
      clearanceSpec: 'Filter Clearance & Pan Rail Flatness: Per manual [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Pan Bolts: Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per OEM / pan specification [NEEDS RAY\'S MEASUREMENT]',
      notes: 'Verify fluid type, level, and leak-free sealing [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'pan'
    },
    {
      row: 'F',
      indexCode: 'F-510',
      partName: `Extension Tailhousing (${trans.lengthInches}" Reference Length)`,
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Driveline',
      clearanceSpec: 'Extension Bushing & Seal Fit: Per OEM manual [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Tailhousing / Mount Bolts: Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      notes: `Reference length ${trans.lengthInches}" [Ref: TRANSMISSIONS_DB; verify physical OAL].`,
      targetSubassembly: 'tailhousing'
    },
    {
      row: 'F',
      indexCode: 'F-550',
      partName: 'Output Slip Yoke & U-Joint Interface',
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Driveline Spec',
      category: 'Driveline',
      clearanceSpec: 'Slip Travel & Working Angles: Per driveline setup [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'U-Joint Fasteners: Per manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per driveline specification [NEEDS RAY\'S MEASUREMENT]',
      notes: 'Verify spline count, phasing, and working angles [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'slipYoke'
    }
  ];

  const manualCallouts: TechDrawingCallout[] = [
    {
      row: 'A',
      indexCode: 'A-101',
      partName: `${trans.nativePattern} Bellhousing`,
      partNumber: 'NEEDS RAY\'S MEASUREMENT / OEM or Bellhousing Spec',
      category: 'Transmission Housing',
      clearanceSpec: 'Bellhousing Runout & Pilot Alignment: Per OEM / SFI spec [NEEDS RAY\'S MEASUREMENT; ASME Y14.5-2018]',
      torqueSpec: 'Bellhousing-to-Block Bolts: Per OEM / engine manual [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per OEM / bellhousing specification [NEEDS RAY\'S MEASUREMENT]',
      notes: `Native pattern ${trans.nativePattern}. ${trans.tunnelProfile} [NEEDS RAY\'S MEASUREMENT].`,
      targetSubassembly: 'bellhousing'
    },
    {
      row: 'A',
      indexCode: 'A-115',
      partName: `Flywheel & ${trans.clutch} Clutch Assembly`,
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Clutch Spec',
      category: 'Clutch Assembly',
      clearanceSpec: 'Release / Air Gap & Runout: Per OEM / clutch spec [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Flywheel & Pressure Plate Bolts: Per OEM / manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
      material: `${trans.clutch} [Ref: TRANSMISSIONS_DB]`,
      notes: 'Verify pilot bearing/bushing fit, friction surfaces, and release travel [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'converter'
    },
    {
      row: 'B',
      indexCode: 'B-210',
      partName: 'Front Input Bearing Retainer',
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Hydraulics',
      clearanceSpec: 'Input Shaft End Play: Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Retainer Bolts: Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      notes: 'Verify throwout bearing collar slide and input end play [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'frontPump'
    },
    {
      row: 'C',
      indexCode: 'C-310',
      partName: 'Synchronizer & Gear Engagement Pack',
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Internal Gear Train',
      clearanceSpec: 'Synchro & End-Play Clearances: Per OEM manual [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Mainshaft / Retaining Fasteners: Per OEM manual [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      notes: 'Inspect blocking rings, dog teeth, struts, and forks [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'clutchPack'
    },
    {
      row: 'D',
      indexCode: 'D-400',
      partName: `${trans.ratios.length}-Speed Main Case & Gearset`,
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Transmission',
      clearanceSpec: `Shaft / Countershaft End Play per manual | Ratios: ${ratioLabel} [NEEDS RAY\'S MEASUREMENT]`,
      torqueSpec: 'Case / Cover Bolts: Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      notes: `Forward ${trans.ratios.join(' / ')}; Reverse ${trans.reverse}:1 [Ref: TRANSMISSIONS_DB].`,
      targetSubassembly: 'mainCase'
    },
    {
      row: 'E',
      indexCode: 'E-500',
      partName: `Extension Tailhousing (${trans.lengthInches}" Reference Length) & Shifter`,
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Transmission Manual',
      category: 'Driveline',
      clearanceSpec: 'Shift Detent & Extension Fit: Per OEM manual [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'Tailhousing / Shifter Bolts: Per OEM manual [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per OEM service manual [NEEDS RAY\'S MEASUREMENT]',
      notes: `Reference length ${trans.lengthInches}" [Ref: TRANSMISSIONS_DB; verify physical OAL].`,
      targetSubassembly: 'tailhousing'
    },
    {
      row: 'F',
      indexCode: 'F-600',
      partName: 'Output Slip Yoke & U-Joint Interface',
      partNumber: 'NEEDS RAY\'S MEASUREMENT / Driveline Spec',
      category: 'Driveline',
      clearanceSpec: 'Slip Travel & Working Angles: Per driveline setup [NEEDS RAY\'S MEASUREMENT]',
      torqueSpec: 'U-Joint Fasteners: Per manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
      material: 'Per driveline specification [NEEDS RAY\'S MEASUREMENT]',
      notes: 'Verify spline count and working angles [NEEDS RAY\'S MEASUREMENT].',
      targetSubassembly: 'slipYoke'
    }
  ];

  return {
    id: `builtin_${trans.id}`,
    domain: 'transmission',
    drawingNumber: 'NEEDS RAY\'S MEASUREMENT / OEM or Shop Drawing Ref',
    title: trans.name,
    subtitle: `${trans.category} · ${trans.type} · ${trans.ratios.length}-Speed (${trans.lengthInches}" ref length) [Ref: ASME Y14.5-2018; ISO 2768-1]`,
    sourceLabel: 'Transmission Reference Sheet (OEM Manual / Standards Cited; Unverified Values Flagged)',
    unitSummary: `${trans.desc} Bellhousing Pattern: ${trans.nativePattern}. ${trans.tunnelProfile}. Standards ref: ASME Y14.5-2018, ISO 2768-1 / ISO 22081, ISO 10303-242 [Ref: TRANSMISSIONS_DB; ASME Y14; ISO].`,
    dimensions: {
      ratios: trans.ratios,
      reverse: trans.reverse,
      lengthInches: trans.lengthInches,
      defaultStall: trans.defaultStall,
      nativePattern: trans.nativePattern
    },
    callouts: isAuto ? autoCallouts : manualCallouts
  };
}

/**
 * Generates a technical drawing BOM & specification sheet for the active Engine configuration.
 * Preserves SBC 350 baseline values (349.85 CID, 385/414 carb, MPFI 408/431) and keeps SBC-only notes labeled SBC 350 ONLY.
 */
export function getEngineDrawingSheet(
  config: EngineConfig,
  specs: CoordinatedSpecs,
  storeSelection?: ActiveStoreSelection | null
): TechDrawingSheet {
  const isSbc350Baseline =
    !storeSelection &&
    Math.abs(config.bore - 4.0) < 0.002 &&
    Math.abs(config.stroke - 3.48) < 0.002;

  const unitTitle = storeSelection
    ? `${storeSelection.yearLabel !== 'ALL' ? `${storeSelection.yearLabel} ` : ''}${storeSelection.engine.name}`
    : isSbc350Baseline
      ? 'SBC 350 ONLY — Chevrolet Small-Block 350 (349.85 CID Baseline; Carb 385/414, MPFI 408/431)'
      : `Engine Configuration (${specs.displacementCi} CID)`;

  const skuByCategory = (catMatch: string) => {
    const found = storeSelection?.selectedParts.find((p) =>
      p.category.toLowerCase().includes(catMatch.toLowerCase())
    );
    return found ? `${found.brand} ${found.sku}` : 'NEEDS RAY\'S MEASUREMENT / Verify Part Number';
  };

  return {
    id: storeSelection ? `builtin_engine_${storeSelection.engine.id}` : 'builtin_sbc_350_ray',
    domain: 'engine',
    drawingNumber: 'NEEDS RAY\'S MEASUREMENT / Shop Print Ref',
    title: unitTitle,
    subtitle: `${config.bore.toFixed(3)}" Bore × ${config.stroke.toFixed(3)}" Stroke · ${config.rodLength.toFixed(3)}" Rods · ${specs.staticCR}:1 CR · ${specs.quenchDistance}" Quench [Ref: ASME Y14.5-2018; ISO 1302]`,
    sourceLabel: 'Engine Drawing & Standards Sheet (ASME Y14.5-2018 / ISO 10303-242 / ISO 21940-11; [EST] & [NEEDS RAY\'S MEASUREMENT] where noted)',
    unitSummary: `Static CR ${specs.staticCR}:1 (Dynamic ${specs.dynamicCR}:1) with ${config.chamberCc.toFixed(1)}cc chambers, ${config.gasketThickness.toFixed(3)}" compressed gasket, ${config.deckClearance.toFixed(3)}" piston-to-deck clearance, and ${specs.quenchDistance}" quench (${specs.quenchStatus}). Simulated output: ${specs.peakHp} HP @ ${specs.hpPeakRpm} RPM / ${specs.peakTq} lb-ft @ ${specs.tqPeakRpm} RPM [EST — simulated dyno output; SBC 350 baseline reference: 349.85 CID, 385/414 carb, MPFI 408/431].`,
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
        indexCode: 'A-101',
        partName: `Cylinder Block (${config.bore.toFixed(3)}" Bore × ${config.deckHeight.toFixed(3)}" Deck)`,
        partNumber: skuByCategory('gasket'),
        category: 'Block & Crankcase',
        clearanceSpec: `Main Bore, Deck & Bore Clearances: Verify OEM/block print [NEEDS RAY\'S MEASUREMENT; ASME Y14.5-2018]`,
        torqueSpec: 'Main & Head Fasteners: Verify OEM / fastener manufacturer spec & torque-angle/stretch procedure [NEEDS RAY\'S MEASUREMENT]',
        material: isSbc350Baseline
          ? 'SBC 350 ONLY baseline cast iron; A356/319 aluminum or CGI per OEM/build spec [Ref: LeClaire Mfg; WB Castings]'
          : 'Per OEM / block specification [NEEDS RAY\'S MEASUREMENT]',
        notes: 'Plateau honing evaluated via Rk/Rpk/Rvk/Rmr; deck finish/flatness per gasket & OEM spec [Ref: Digital Metrology; ISO 1302; NEEDS RAY\'S MEASUREMENT].',
        targetSubassembly: 'block'
      },
      {
        row: 'A',
        indexCode: 'A-114',
        partName: 'Timing Cover & Front Seal / Crank Trigger Interface',
        partNumber: skuByCategory('timing'),
        category: 'Front Cover',
        clearanceSpec: 'Seal Bore & Crank Snout Concentricity: Per OEM/cover spec [NEEDS RAY\'S MEASUREMENT; ASME Y14.5-2018]',
        torqueSpec: 'Cover & Damper Fasteners: Per OEM / manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
        material: 'Per OEM / cover specification [NEEDS RAY\'S MEASUREMENT]',
        notes: 'Verify TDC #1 reference and front seal/trigger clearances [NEEDS RAY\'S MEASUREMENT].',
        targetSubassembly: 'timingCover'
      },
      {
        row: 'B',
        indexCode: 'B-201',
        partName: `Crankshaft (${config.stroke.toFixed(3)}" Stroke)`,
        partNumber: skuByCategory('crank'),
        category: 'Rotating Assembly',
        clearanceSpec: `Journal Clearances, End Play & Runout: Per OEM/crank spec [NEEDS RAY\'S MEASUREMENT; ISO 21940-11]`,
        torqueSpec: 'Flywheel / Flexplate / Damper Fasteners: Per OEM / manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
        material: 'Per OEM / crankshaft specification [NEEDS RAY\'S MEASUREMENT]',
        notes: 'Balanced per ISO 1940-1 / ISO 21940-11; verify actual journals & balance card [NEEDS RAY\'S MEASUREMENT].',
        targetSubassembly: 'crank'
      },
      {
        row: 'B',
        indexCode: 'B-220',
        partName: `${config.pistonAlloy} Pistons & ${config.rodLength.toFixed(3)}" Connecting Rods`,
        partNumber: skuByCategory('piston'),
        category: 'Rotating Assembly',
        clearanceSpec: `PTW: ${specs.ptwClearance} | Ring Gaps: ${specs.topRingGap}" / ${specs.secondRingGap}" / ${specs.oilRingGap}" [EST / NEEDS RAY\'S MEASUREMENT]`,
        torqueSpec: isSbc350Baseline
          ? 'SBC 350 ONLY rod bolt stretch ref 0.0060" [EST / VERIFY exact fastener spec]; verify torque/angle/stretch [NEEDS RAY\'S MEASUREMENT]'
          : 'Rod Fasteners: Per OEM / fastener manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
        material: `Piston: ${config.pistonAlloy}; Rod: per OEM/rod spec [Ref: EngineConfig; NEEDS RAY\'S MEASUREMENT]`,
        notes: `Deck Clearance ${config.deckClearance.toFixed(3)}" + Gasket ${config.gasketThickness.toFixed(3)}" = ${specs.quenchDistance}" Quench [NEEDS RAY\'S MEASUREMENT].`,
        targetSubassembly: 'rotating'
      },
      {
        row: 'C',
        indexCode: 'C-305',
        partName: `${specs.camData.name} & Timing Drive`,
        partNumber: skuByCategory('cam'),
        category: 'Valvetrain',
        clearanceSpec: `Duration @.050": ${specs.camData.intakeDur050}°/${specs.camData.exhDur050}° | Lift ${specs.totalValveLift}" [Ref: CoordinatedSpecs; NEEDS RAY\'S MEASUREMENT when degreed]`,
        torqueSpec: 'Cam Sprocket / Drive Fasteners: Per OEM / cam spec [NEEDS RAY\'S MEASUREMENT]',
        material: 'Per OEM / camshaft specification [NEEDS RAY\'S MEASUREMENT]',
        notes: `IVC ${specs.camData.ivcDeg}° ABDC baseline; verify actual degreed timing in engine [NEEDS RAY\'S MEASUREMENT].`,
        targetSubassembly: 'cam'
      },
      {
        row: 'C',
        indexCode: 'C-340',
        partName: `Cylinder Heads (${config.chamberCc.toFixed(1)}cc Chambers, ${config.rockerRatio}:1 Rocker)`,
        partNumber: skuByCategory('head'),
        category: 'Cylinder Heads',
        clearanceSpec: `Rocker Ratio ${config.rockerRatio}:1 | Valve-to-Piston & Coil Bind: Per build [NEEDS RAY\'S MEASUREMENT]`,
        torqueSpec: 'Head Fasteners: Per OEM / fastener spec & torque/angle/stretch sequence [NEEDS RAY\'S MEASUREMENT]',
        material: 'Per OEM / cylinder head specification [NEEDS RAY\'S MEASUREMENT]',
        notes: 'Verify chamber volume, deck flatness/finish, and valvetrain geometry [NEEDS RAY\'S MEASUREMENT].',
        targetSubassembly: 'heads'
      },
      {
        row: 'D',
        indexCode: 'D-410',
        partName: `${specs.intakeData.name} & Metering (${config.carbCfm} CFM)`,
        partNumber: skuByCategory('intake'),
        category: 'Induction & Fuel',
        clearanceSpec: `Peak Demand ${specs.peakCfmDemand} CFM [EST] | Target AFR ${config.targetAFR}:1 [Ref: EngineConfig]`,
        torqueSpec: 'Intake & Metering Fasteners: Per OEM / manufacturer sequence [NEEDS RAY\'S MEASUREMENT]',
        material: 'Per OEM / intake specification [NEEDS RAY\'S MEASUREMENT]',
        notes: 'Verify port alignment, gasket sealing, and fuel/air calibration [NEEDS RAY\'S MEASUREMENT].',
        targetSubassembly: 'intake'
      },
      {
        row: 'D',
        indexCode: 'D-450',
        partName: 'Ignition System',
        partNumber: skuByCategory('ignition'),
        category: 'Ignition',
        clearanceSpec: `Total Timing ${config.ignitionTiming}° BTDC | Plug Gap ${config.sparkPlugGap.toFixed(3)}" [Ref: EngineConfig; NEEDS RAY\'S MEASUREMENT]`,
        torqueSpec: 'Ignition & Spark Plug Torque: Per OEM / manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
        material: 'Per OEM / ignition specification [NEEDS RAY\'S MEASUREMENT]',
        notes: 'Verify firing order, trigger phasing, and timing [NEEDS RAY\'S MEASUREMENT].',
        targetSubassembly: 'ignition'
      },
      {
        row: 'E',
        indexCode: 'E-510',
        partName: 'Lubrication Pump & Oil Pan',
        partNumber: skuByCategory('oil'),
        category: 'Lubrication',
        clearanceSpec: isSbc350Baseline
          ? 'SBC 350 ONLY refs: 0.312" pickup clearance & 60 PSI hot relief [EST / NEEDS RAY\'S MEASUREMENT]'
          : 'Pickup Clearance & Oil Pressure: Per OEM / pump / pan spec [NEEDS RAY\'S MEASUREMENT]',
        torqueSpec: 'Pump & Pan Fasteners: Per OEM / manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
        material: 'Per OEM / lubrication specification [NEEDS RAY\'S MEASUREMENT]',
        notes: 'Verify physical pickup clearance and oil pressure [NEEDS RAY\'S MEASUREMENT].',
        targetSubassembly: 'lubrication'
      },
      {
        row: 'E',
        indexCode: 'E-540',
        partName: 'Cooling Pump & Accessory Drive',
        partNumber: skuByCategory('water'),
        category: 'Cooling',
        clearanceSpec: 'Impeller, Fan & Belt Alignment Clearances: Per OEM / drive spec [NEEDS RAY\'S MEASUREMENT]',
        torqueSpec: 'Cooling & Pulley Fasteners: Per OEM / manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
        material: 'Per OEM / cooling specification [NEEDS RAY\'S MEASUREMENT]',
        notes: 'Verify belt alignment and leak-free cooling system [NEEDS RAY\'S MEASUREMENT].',
        targetSubassembly: 'cooling'
      },
      {
        row: 'F',
        indexCode: 'F-605',
        partName: 'Fuel Delivery & Starter System',
        partNumber: skuByCategory('fuel'),
        category: 'Fuel & Starting',
        clearanceSpec: `Fuel Flow ${specs.fuelGph} GPH ref [EST] | Starter Pinion Clearance: Per spec [NEEDS RAY\'S MEASUREMENT]`,
        torqueSpec: 'Starter & Fuel Fasteners: Per OEM / manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
        material: 'Per OEM / manufacturer specification [NEEDS RAY\'S MEASUREMENT]',
        notes: 'Verify fuel pressure/leaks and starter engagement/clearance [NEEDS RAY\'S MEASUREMENT].',
        targetSubassembly: 'starter'
      }
    ]
  };
}