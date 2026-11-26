/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EngineConfig,
  EngineCatalogItem,
  TransmissionItem,
  VehicleItem,
  TorqueSpec,
  MechanicSpec,
  BOMItem,
  HeadFlowPoint
} from '../types/engine';

export interface EngineCatalogAuditRecord {
  sources: string[];
  estimatedFields: string[];
  measurementNeededFields: string[];
  baselineNotes: string[];
}

export const RAY_BASELINE_AUDIT = {
  engineId: 'sbc_350_ray',
  confirmedCid: 349.85,
  confirmedDimensionsIn: { bore: 4.000, stroke: 3.480, boreSpacing: 4.400, deckHeight: 9.025, rodLength: 5.700 },
  confirmedDynoTargetsSimulated: {
    carbHp: 385,
    carbTq: 414,
    mpfiHp: 408,
    mpfiTq: 431,
    codeBaseTqStoredPendingDynoModule: 415,
    discrepancyNote: '[AUDIT] Stored baseTq=415 kept pending dyno module; Ray carb target is 414 TQ (MPFI 408/431 [EST]).'
  },
  headValveNote: '2.020"/1.600" & 64cc alum apply to Edelbrock E-Street #5089 perf heads; stock GM SBC 350 iron heads used 1.940"/1.500" or 1.720"/1.500" (GM Service Manual).',
  measurementNeededFields: [
    'deckClearance', 'gasketThickness', 'chamberCc', 'pistonReliefCc',
    'bearingClearances', 'crankshaftEndPlay', 'rodSideClearance', 'runout',
    'hydraulicValveLashPreload', 'oilPumpPickupToPanClearance', 'starterPinionBacklash',
    'ringEndGap', 'pinionAngle'
  ],
  sources: [
    'GM / Chevrolet Service Manual (Gen-I SBC 350)',
    'Chevrolet Power Manual (4.400" bore spacing, 9.025" deck, 23° valve angle, 5.700" rod)',
    'Edelbrock Catalog #5089 (E-Street 64cc, 185cc port, 2.020"/1.600" valves)',
    'UEM / Keith Black Catalog (KB115 +5.0cc relief)',
    'Fel-Pro Catalog (#1003 0.041" / #1010 0.039")'
  ]
};

export const RAY_BASELINE_CONFIG: EngineConfig = {
  engineId: 'sbc_350_ray',
  engineName: "Chevrolet SBC 350 V8 (Ray's Baseline — Edelbrock E-Street Perf Heads)",
  configLabel: 'V8',
  color: 0xd83b01,
  firingOrder: '1-8-4-3-6-5-7-2', // GM Service Manual
  pattern: 'GM_Chevy_V8',
  balance: 'Internal / Neutral (1967–85 2-pc rear seal; 1986+ 1-pc seal external — GM Service Manual)',
  flywheelTeeth: '153 or 168-Tooth (Chevrolet Performance)',
  boreSpacing: 4.400, // Chevrolet Power Manual
  valvetrainType: 'OHV',
  blockMaterial: 'iron',
  headMaterial: 'aluminum', // Perf: Edelbrock E-Street #5089 (Stock GM 350 = cast iron)
  valveAngleDeg: 23, // Chevrolet Power Manual
  bankAngleDeg: 90,
  cylinders: 8,
  bore: 4.000, // 349.85 CID
  stroke: 3.480,
  rodLength: 5.700,
  deckHeight: 9.025, // Chevrolet Power Manual
  deckClearance: 0.015, // [EST] Runtime numeric target — NEEDING RAY'S MEASUREMENT (OEM ~0.025")
  gasketThickness: 0.039, // [EST] Runtime numeric target — NEEDING RAY'S MEASUREMENT (Fel-Pro #1003 is 0.041")
  chamberCc: 64.0, // Edelbrock #5089 catalog — NEEDING RAY'S MEASUREMENT via burette
  pistonReliefCc: 5.0, // KB115 catalog — NEEDING RAY'S MEASUREMENT via burette
  pistonAlloy: '4032', // [EST]
  ringApplication: 'street_strip', // [EST] SBC street/strip factor
  camProfile: 'street', // [EST]
  rockerRatio: 1.5, // GM Service Manual
  selectedIntake: 'dualplane_rpm',
  carbCfm: 650, // [EST] SBC carb baseline (NOT default for EFI/Diesel)
  carbStyle: '4150_dp',
  carbVenturiIn: 1.375, // [EST]
  airFilterCfmBonus: 15, // [EST]
  intakePortCc: 185, // Edelbrock #5089
  intakeValveIn: 2.02, // Perf E-Street #5089 (Stock GM 350 = 1.940"/1.720" — GM Service Manual)
  exhaustPortCc: 68, // [EST]
  exhaustPortShape: 'd_port',
  exhaustValveIn: 1.60, // Perf E-Street #5089 (Stock GM 350 = 1.500" — GM Service Manual)
  headerPrimaryIn: 1.625, // [EST]
  targetAFR: 12.9, // [EST] Carb gasoline WOT (NOT diesel/E85)
  ignitionTiming: 36, // [EST] SBC 23° total target (NEEDING RAY'S MEASUREMENT)
  sparkPlugGap: 0.040, // [EST]
  selectedTrans: 'th350', // GM V8 pairing ONLY
  stallSpeed: 2400, // [EST]
  rearGear: 3.73, // [EST]
  tireDiameter: 26.0, // [EST]
  selectedVehicle: 'camaro1969',
  inductionDress: 'carb_hei'
};

export const CARB_STYLE_OPTIONS = [
  { id: '2bbl', label: '2-BBL Economizer (Holley 2300 — Carb Builds Only)', venturiIn: 1.250, defaultCfm: 500, throttleBoreIn: '1.500"', flowCoeff: 0.94, notes: '[EST] Simulated dyno coeff.' },
  { id: '4150_dp', label: '4150 4-BBL Double Pumper (SBC Baseline)', venturiIn: 1.375, defaultCfm: 650, throttleBoreIn: '1.688"', flowCoeff: 1.00, notes: 'Holley 4150 650 CFM ref.' },
  { id: '4500_dominator', label: '4500 Dominator Pro Race (Carb Builds Only)', venturiIn: 1.688, defaultCfm: 1050, throttleBoreIn: '2.000"', flowCoeff: 1.07, notes: '[EST] Simulated dyno coeff.' },
  { id: 'dual_quad', label: 'Dual-Quad (2×4150 Twin Carb)', venturiIn: 1.312, defaultCfm: 900, throttleBoreIn: '1.563"×2', flowCoeff: 1.05, notes: '[EST] Simulated dyno coeff.' },
  { id: 'mpfi_tb', label: '4-BBL Billet EFI Throttle Body (MPFI Retrofit)', venturiIn: 1.500, defaultCfm: 850, throttleBoreIn: '1.750"', flowCoeff: 1.04, notes: '[EST] SBC MPFI retrofit (408 HP / 431 TQ simulated target).' }
] as const;

export const AIR_INDUCTION_PACKAGES = [
  { id: 'stock_snorkel', label: 'OE Single-Snorkel Air Cleaner', bonusCfm: -15, desc: '[EST] Simulated (-15 CFM)' },
  { id: 'open_14x3', label: '14"×3" Open-Element Street Filter', bonusCfm: 15, desc: '[EST] Ray Baseline (+15 CFM)' },
  { id: 'cowl_coldair', label: 'Sealed Cowl / Cold-Air Duct', bonusCfm: 30, desc: '[EST] Simulated (+30 CFM)' },
  { id: 'velocity_scoop', label: 'Pro Velocity Stack / Hood Scoop', bonusCfm: 45, desc: '[EST] Simulated (+45 CFM)' }
] as const;

export const INTAKE_PORT_PRESETS = [
  { cc: 165, valveIn: 1.94, label: '165 cc · 1.940" Stock GM SBC / Vortec', flowScale: 0.89, desc: 'Stock GM 350 1.940" valve (GM Service Manual; flowScale [EST]).' },
  { cc: 185, valveIn: 2.02, label: '185 cc · 2.020" Perf Head (Edelbrock #5089)', flowScale: 1.00, desc: 'Ray Baseline Performance Head (Edelbrock #5089; NOT stock GM 350).' },
  { cc: 210, valveIn: 2.08, label: '210 cc · 2.080" Pro Comp (SBC Perf)', flowScale: 1.08, desc: '[EST] SBC 23° aftermarket port.' },
  { cc: 235, valveIn: 2.125, label: '235 cc · 2.125" Race Port (SBC Perf)', flowScale: 1.15, desc: '[EST] SBC 23° race port.' }
] as const;

export const EXHAUST_PORT_PRESETS = [
  { shape: 'oval_stock' as const, label: 'OEM Oval Exhaust (1.500" Stock GM SBC)', cc: 62, valveIn: 1.50, flowScale: 0.91, desc: 'Stock GM 350 1.500" exhaust (GM Service Manual; cc/flowScale [EST]).' },
  { shape: 'd_port' as const, label: 'Perf D-Port (1.600" — Edelbrock #5089)', cc: 68, valveIn: 1.60, flowScale: 1.00, desc: 'Edelbrock #5089 perf valve (cc/flowScale [EST]).' },
  { shape: 'raised_runner' as const, label: 'Raised Square-Port (+0.250" SBC Perf)', cc: 78, valveIn: 1.60, flowScale: 1.07, desc: '[EST] SBC aftermarket port.' },
  { shape: 'cnc_race' as const, label: 'Full CNC Spread-Port (1.625" SBC Race)', cc: 88, valveIn: 1.625, flowScale: 1.13, desc: '[EST] SBC race port.' }
] as const;

export const HEADER_PRIMARY_OPTIONS = [
  { id: 1.500, label: '1.500" Cast/Shorty (SBC)', scavengeMult: 0.96, note: '[EST] Simulated' },
  { id: 1.625, label: '1.625" Long-Tube Baseline (SBC 350)', scavengeMult: 1.00, note: 'Ray 350 baseline' },
  { id: 1.750, label: '1.750" Stepped Perf (SBC)', scavengeMult: 1.03, note: '[EST] Simulated' },
  { id: 1.875, label: '1.875" Race Merge (SBC/BBC)', scavengeMult: 1.05, note: '[EST] Simulated' },
  { id: 2.000, label: '2.000" Pro Drag Open', scavengeMult: 1.06, note: '[EST] Simulated' }
] as const;

export const INTAKE_MANIFOLDS = [
  { id: 'dualplane_rpm', name: 'Edelbrock Performer RPM Dual-Plane (#7101 SBC)', style: 'dualplane', runnerCc: 195, flowCfm: 265, hpMult: 1.00, tqMult: 1.00, carbCfmDefault: 650, price: 349.95 },
  { id: 'singleplane_victor', name: 'Edelbrock Victor Jr. Single-Plane (#2975 SBC) [EST]', style: 'singleplane', runnerCc: 215, flowCfm: 295, hpMult: 1.06, tqMult: 0.96, carbCfmDefault: 750, price: 389.95 },
  { id: 'tunnelram_dual', name: 'Weiand Hi-Ram Dual-Quad Tunnel Ram (SBC) [EST]', style: 'tunnelram', runnerCc: 235, flowCfm: 330, hpMult: 1.12, tqMult: 0.94, carbCfmDefault: 900, isDualCarb: true, price: 689.95 }
];

export const CAM_PROFILES = {
  rv: { id: 'rv', name: 'RV / High-Torque Hydraulic Flat Tappet (SBC Ref) [EST]', desc: '[EST] Simulated SBC 350 torque cam.', intakeDur050: 212, exhDur050: 218, lobeLift: 0.300, advertisedIntake: 262, advertisedExh: 268, lsa: 112, ivcDeg: 38, baseHp: 310, baseTq: 395, hpRpm: 4800, tqRpm: 3200, ve: 0.84, recStall: 1800, vacuumIdle: 19 },
  street: { id: 'street', name: "Street / Strip Hydraulic Roller (Ray's SBC 350 Spec) [EST Simulated]", desc: "Ray target: 385 HP / 414 TQ carb; MPFI [EST]: 408 HP / 431 TQ. Stored baseTq=415 kept pending dyno module audit.", intakeDur050: 224, exhDur050: 230, lobeLift: 0.340, advertisedIntake: 276, advertisedExh: 282, lsa: 110, ivcDeg: 44, baseHp: 385, baseTq: 415, hpRpm: 5600, tqRpm: 3800, ve: 0.90, recStall: 2400, vacuumIdle: 15 },
  radical: { id: 'radical', name: 'Radical Solid Roller (SBC Ref) [EST]', desc: '[EST] Simulated drag profile; PTV & spring pressure NEEDING RAY\'S MEASUREMENT.', intakeDur050: 242, exhDur050: 248, lobeLift: 0.370, advertisedIntake: 294, advertisedExh: 302, lsa: 108, ivcDeg: 52, baseHp: 445, baseTq: 425, hpRpm: 6400, tqRpm: 4600, ve: 0.98, recStall: 3500, vacuumIdle: 10 }
};

export const TRANSMISSIONS_DB: Record<string, TransmissionItem> = {
  powerglide: { id: "powerglide", name: "GM Powerglide (2-Speed)", category: "GM Classic Automatic", type: "Automatic", ratios: [1.76, 1.00], reverse: 1.76, nativePattern: "GM_Chevy_V8", lengthInches: 27.6, defaultStall: 3500, clutch: "Aftermarket 5-Clutch [EST]", tunnelProfile: "NEEDING RAY'S MEASUREMENT (Short-tail ~27.6\" per TCI/GM)", desc: "GM Service Manual (V8 1.76:1; stall [EST])." },
  th350: { id: "th350", name: "Turbo-Hydramatic 350 (TH350)", category: "GM Classic Automatic", type: "Automatic", ratios: [2.52, 1.52, 1.00], reverse: 1.93, nativePattern: "GM_Chevy_V8", lengthInches: 27.6, defaultStall: 2400, clutch: "Aftermarket 5-Clutch [EST]", tunnelProfile: "NEEDING RAY'S MEASUREMENT (Short 6\" tail ~27.6\")", desc: "GM/ATSG THM 350 Manual (Rev corrected 2.07 -> 1.93)." },
  th400: { id: "th400", name: "Turbo-Hydramatic 400 (TH400)", category: "GM Classic Automatic", type: "Automatic", ratios: [2.48, 1.48, 1.00], reverse: 2.08, nativePattern: "GM_Chevy_V8", lengthInches: 28.4, defaultStall: 3000, clutch: "Aftermarket 6-Clutch [EST]", tunnelProfile: "NEEDING RAY'S MEASUREMENT (Short 4\" tail ~28.4\")", desc: "GM Service Manual THM 400." },
  r2004r: { id: "r2004r", name: "GM 200-4R (4-Speed OD)", category: "GM Classic Automatic", type: "Automatic", ratios: [2.74, 1.57, 1.00, 0.67], reverse: 2.07, nativePattern: "GM_Dual_BOP_Chevy", lengthInches: 27.7, defaultStall: 2400, clutch: "Dual BOP/Chevy Pattern (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL ~27.7\")", desc: "GM/ATSG THM 200-4R Manual." },
  r7004: { id: "r7004", name: "700R4 / Early 4L60", category: "GM Classic Automatic", type: "Automatic", ratios: [3.06, 1.63, 1.00, 0.70], reverse: 2.29, nativePattern: "GM_Chevy_V8", lengthInches: 30.7, defaultStall: 2200, clutch: "Aftermarket Z-Pack [EST]", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL ~30.7\")", desc: "GM/ATSG THM 700-R4 Manual." },
  r4l60e: { id: "r4l60e", name: "GM 4L60E (Electronic 4-Sp OD)", category: "GM Electronic Overdrive", type: "Automatic", ratios: [3.06, 1.63, 1.00, 0.70], reverse: 2.29, nativePattern: "GM_Chevy_V8", lengthInches: 30.7, defaultStall: 2400, clutch: "PWM Lockup (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~30.7\")", desc: "GM Service Manual 4L60-E." },
  r4l80e: { id: "r4l80e", name: "GM 4L80E (HD Electronic 4-Sp OD)", category: "GM Electronic Overdrive", type: "Automatic", ratios: [2.48, 1.48, 1.00, 0.75], reverse: 2.08, nativePattern: "GM_Chevy_V8", lengthInches: 32.0, defaultStall: 2600, clutch: "OD Planetary + TH400 Gear Train (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~32.0\")", desc: "GM Service Manual 4L80-E." },
  r6l80e: { id: "r6l80e", name: "GM 6L80E (6-Speed Auto)", category: "GM Electronic Overdrive", type: "Automatic", ratios: [4.03, 2.36, 1.53, 1.15, 0.85, 0.67], reverse: 3.06, nativePattern: "GM_LS_Modular", lengthInches: 33.1, defaultStall: 2000, clutch: "Electro-Hydraulic TEHCM (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~33.1\")", desc: "GM Hydra-Matic 6L80 Spec Sheet." },
  r10l90: { id: "r10l90", name: "GM / Ford 10L90 (10-Speed Auto)", category: "GM Electronic Overdrive", type: "Automatic", ratios: [4.70, 2.99, 2.15, 1.80, 1.52, 1.28, 1.00, 0.85, 0.69, 0.64], reverse: 4.87, nativePattern: "GM_LS_Modular", lengthInches: 34.5, defaultStall: 2200, clutch: "4 Planetary / 6 Clutches (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~34.5\")", desc: "GM 10L90 Spec Sheet." },
  ford_c4: { id: "ford_c4", name: "Ford C4 (3-Speed Auto)", category: "Ford Automatic", type: "Automatic", ratios: [2.46, 1.46, 1.00], reverse: 2.20, nativePattern: "Ford_SBF_6Bolt", lengthInches: 25.5, defaultStall: 2400, clutch: "Aftermarket 5-Clutch [EST]", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~25.5\")", desc: "Ford Car Shop Manual." },
  ford_c6: { id: "ford_c6", name: "Ford C6 (HD 3-Speed Auto)", category: "Ford Automatic", type: "Automatic", ratios: [2.46, 1.46, 1.00], reverse: 2.18, nativePattern: "Ford_SBF_6Bolt", lengthInches: 28.6, defaultStall: 2800, clutch: "One-Piece Integral Bellhousing (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~28.6\"; SBF/FE/385 differ)", desc: "Ford Shop Manual." },
  ford_aod: { id: "ford_aod", name: "Ford AOD (4-Speed OD Auto)", category: "Ford Automatic", type: "Automatic", ratios: [2.40, 1.47, 1.00, 0.67], reverse: 2.00, nativePattern: "Ford_SBF_6Bolt", lengthInches: 30.2, defaultStall: 2200, clutch: "Split-Torque Mechanical Lockup (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~30.2\")", desc: "Ford Service Manual." },
  ford_10r80: { id: "ford_10r80", name: "Ford 10R80 (10-Speed Auto)", category: "Ford Automatic", type: "Automatic", ratios: [4.70, 2.99, 2.15, 1.80, 1.52, 1.28, 1.00, 0.85, 0.69, 0.64], reverse: 4.87, nativePattern: "Ford_Coyote_Modular", lengthInches: 34.5, defaultStall: 2400, clutch: "10-Speed Mechatronic (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~34.5\")", desc: "Ford 10R80 Spec Sheet." },
  mopar_727: { id: "mopar_727", name: "Chrysler Torqueflite A-727", category: "Mopar Automatic", type: "Automatic", ratios: [2.45, 1.45, 1.00], reverse: 2.20, nativePattern: "Chrysler_RB_Hemi", lengthInches: 29.0, defaultStall: 2800, clutch: "4-Clutch Direct / HD Band (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~29.0\"; LA vs B/RB cases differ)", desc: "Chrysler / ATSG A-727 Manual (Rev corrected 2.22 -> 2.20)." },
  mopar_a500_42re: { id: "mopar_a500_42re", name: "Chrysler A500 / 42RE / 44RE (4-Sp OD)", category: "Mopar Automatic", type: "Automatic", ratios: [2.74, 1.54, 1.00, 0.69], reverse: 2.21, nativePattern: "Chrysler_LA_Magnum", lengthInches: 32.4, defaultStall: 2400, clutch: "Multi-Disc OD + Lockup (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~32.4\")", desc: "Chrysler / ATSG 42RE Manual. CORRECTION: 42RE front band back-off is 3 turns (NOT 2-1/4 turns)." },
  mopar_8hp70: { id: "mopar_8hp70", name: "Torqueflite 8 / ZF 8HP70", category: "Mopar Automatic", type: "Automatic", ratios: [4.71, 3.14, 2.10, 1.67, 1.29, 1.00, 0.84, 0.67], reverse: 3.32, nativePattern: "Chrysler_Gen3_Hemi", lengthInches: 31.8, defaultStall: 2600, clutch: "ZF 8-Speed Mechatronic (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~31.8\")", desc: "ZF 8HP70 Spec Sheet." },
  muncieM20: { id: "muncieM20", name: "Muncie M20 Wide-Ratio (4-Sp Manual)", category: "Classic Muscle Manual", type: "Manual", ratios: [2.52, 1.88, 1.46, 1.00], reverse: 2.59, nativePattern: "GM_Chevy_V8", lengthInches: 21.5, defaultStall: 0, clutch: "10.5\"/11.0\" 10 or 26-Spline (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL ~21.5\")", desc: "GM Service Manual (1966–74 M20)." },
  muncieM21: { id: "muncieM21", name: "Muncie M21 Close-Ratio (4-Sp Manual)", category: "Classic Muscle Manual", type: "Manual", ratios: [2.20, 1.64, 1.28, 1.00], reverse: 2.27, nativePattern: "GM_Chevy_V8", lengthInches: 21.5, defaultStall: 0, clutch: "10.5\"/11.0\" 10 or 26-Spline (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL ~21.5\")", desc: "GM Service Manual (M21)." },
  muncieM22: { id: "muncieM22", name: "Muncie M22 'Rock Crusher' (4-Sp)", category: "Classic Muscle Manual", type: "Manual", ratios: [2.20, 1.64, 1.28, 1.00], reverse: 2.27, nativePattern: "GM_Chevy_V8", lengthInches: 21.5, defaultStall: 0, clutch: "11.0\" HD 10 or 26-Spline (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL ~21.5\")", desc: "GM Service Manual (M22)." },
  super_t10: { id: "super_t10", name: "Borg-Warner Super T-10 (4-Sp)", category: "Classic Muscle Manual", type: "Manual", ratios: [2.64, 1.75, 1.34, 1.00], reverse: 2.55, nativePattern: "GM_Chevy_V8", lengthInches: 21.8, defaultStall: 0, clutch: "26-Spline Input (Borg-Warner/GM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~21.8\")", desc: "Borg-Warner / GM Service Manual (Rev [EST])." },
  ford_toploader: { id: "ford_toploader", name: "Ford Toploader (4-Sp Manual)", category: "Classic Muscle Manual", type: "Manual", ratios: [2.32, 1.69, 1.29, 1.00], reverse: 2.32, nativePattern: "Ford_SBF_6Bolt", lengthInches: 24.0, defaultStall: 0, clutch: "10-Spline 1-1/16\" or 1-3/8\" (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (Short-tail [EST] ~24.0\")", desc: "Ford Shop Manual (close-ratio)." },
  mopar_a833: { id: "mopar_a833", name: "Chrysler A-833 (4-Sp Manual)", category: "Classic Muscle Manual", type: "Manual", ratios: [2.65, 1.93, 1.39, 1.00], reverse: 2.57, nativePattern: "Chrysler_RB_Hemi", lengthInches: 28.5, defaultStall: 0, clutch: "18-Spline Hemi / 23-Spline Std (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~28.5\" B/E-body)", desc: "Chrysler Service Manual." },
  tremecT5: { id: "tremecT5", name: "Tremec T5 WC (5-Sp OD)", category: "Modern Overdrive Manual", type: "Manual", ratios: [2.95, 1.94, 1.34, 1.00, 0.63], reverse: 2.76, nativePattern: "GM_Chevy_V8", lengthInches: 24.5, defaultStall: 0, clutch: "10.4\"/10.5\" Diaphragm", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~24.5\")", desc: "Tremec T5 WC Spec Sheet." },
  tremec_tkx: { id: "tremec_tkx", name: "Tremec TKX (5-Sp 600 lb-ft)", category: "Modern Overdrive Manual", type: "Manual", ratios: [2.87, 1.89, 1.28, 1.00, 0.68], reverse: 2.56, nativePattern: "GM_Chevy_V8", lengthInches: 24.2, defaultStall: 0, clutch: "26-Spline GM / 10 or 26-Spline Ford", tunnelProfile: "NEEDING RAY'S MEASUREMENT (Tremec OAL 24.16\" ex-bellhousing)", desc: "Tremec TKX Spec Sheet." },
  tremec_tko600: { id: "tremec_tko600", name: "Tremec TKO 600 (5-Sp HD)", category: "Modern Overdrive Manual", type: "Manual", ratios: [2.87, 1.89, 1.28, 1.00, 0.64], reverse: 2.56, nativePattern: "GM_Chevy_V8", lengthInches: 25.1, defaultStall: 0, clutch: "26-Spline / 31-Spline 600 lb-ft", tunnelProfile: "NEEDING RAY'S MEASUREMENT (Tremec OAL 25.06\" ex-bellhousing)", desc: "Tremec TKO 600 Spec Sheet." },
  tremecT56: { id: "tremecT56", name: "Tremec T56 Magnum (6-Sp)", category: "Modern Overdrive Manual", type: "Manual", ratios: [2.66, 1.78, 1.30, 1.00, 0.80, 0.63], reverse: 2.90, nativePattern: "GM_Chevy_V8", lengthInches: 32.5, defaultStall: 0, clutch: "26-Spline / 31-Spline 700 lb-ft", tunnelProfile: "NEEDING RAY'S MEASUREMENT (Tremec OAL ~32.5\" w/ bellhousing)", desc: "Tremec T56 Magnum Spec Sheet." },
  nissan_cd009: { id: "nissan_cd009", name: "Nissan CD009 (6-Sp Manual)", category: "JDM & Exotic Swap", type: "Manual", ratios: [3.79, 2.32, 1.62, 1.27, 1.00, 0.79], reverse: 3.45, nativePattern: "Nissan_VQ_Block", lengthInches: 31.5, defaultStall: 0, clutch: "Integral VQ Bellhousing (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~31.5\")", desc: "Nissan Z33 Service Manual." },
  toyota_v160: { id: "toyota_v160", name: "Toyota / Getrag V160 (6-Sp)", category: "JDM & Exotic Swap", type: "Manual", ratios: [3.83, 2.36, 1.69, 1.31, 1.00, 0.79], reverse: 3.28, nativePattern: "Toyota_JZ_Block", lengthInches: 31.0, defaultStall: 0, clutch: "Pull-Type / Integral JZ Bellhousing (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~31.0\")", desc: "Toyota Supra JZA80 Repair Manual." },
  zf_8hp70_universal: { id: "zf_8hp70_universal", name: "ZF 8HP70 Universal Swap", category: "JDM & Exotic Swap", type: "Automatic", ratios: [4.71, 3.14, 2.10, 1.67, 1.29, 1.00, 0.84, 0.67], reverse: 3.32, nativePattern: "Universal_Adapter_Plate", lengthInches: 31.8, defaultStall: 2600, clutch: "8-Speed Mechatronic + Standalone TCU [EST]", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~31.8\")", desc: "ZF 8HP70 Technical Spec Sheet." },
  allison_1000: { id: "allison_1000", name: "Allison 1000 6-Sp HD Diesel", category: "GM Electronic Overdrive", type: "Automatic", ratios: [3.10, 1.81, 1.41, 1.00, 0.71, 0.61], reverse: 4.49, nativePattern: "GM_Chevy_V8", lengthInches: 33.8, defaultStall: 1600, clutch: "C1–C5 Diesel Planetary Packs (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~33.8\")", desc: "Allison 1000/2000 Spec Sheet." },
  ford_6r140: { id: "ford_6r140", name: "Ford TorqShift 6R140 (6-Sp HD)", category: "Ford Automatic", type: "Automatic", ratios: [3.97, 2.32, 1.52, 1.15, 0.86, 0.67], reverse: 3.13, nativePattern: "Ford_Modular_Diesel", lengthInches: 34.2, defaultStall: 1700, clutch: "Multi-Plate Lockup + HD Planetary (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~34.2\")", desc: "Ford Super Duty 6R140 Spec Sheet." },
  subaru_ty85_6mt: { id: "subaru_ty85_6mt", name: "Subaru TY85 6-Sp AWD (STI)", category: "JDM & Exotic Swap", type: "Manual", ratios: [3.64, 2.24, 1.52, 1.14, 0.89, 0.76], reverse: 3.54, nativePattern: "Subaru_EJ_FA_Boxer", lengthInches: 32.0, defaultStall: 0, clutch: "240mm Diaphragm + DCCD (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (OAL [EST] ~32.0\")", desc: "Subaru WRX STI TY85 Service Manual." },
  vw_dsg_dq381: { id: "vw_dsg_dq381", name: "VW / Audi DQ381 7-Sp DSG", category: "JDM & Exotic Swap", type: "Automatic", ratios: [3.40, 2.75, 1.77, 0.92, 0.70, 0.76, 0.64], reverse: 2.90, nativePattern: "VW_Audi_Transverse", lengthInches: 20.5, defaultStall: 2200, clutch: "Wet Dual-Clutch Pack (OEM)", tunnelProfile: "NEEDING RAY'S MEASUREMENT (Transverse OAL [EST] ~20.5\")", desc: "VW Self-Study Program DQ381 (Rev [EST])." },
  getrag_dct_7: { id: "getrag_dct_7", name: "Getrag 7DCL750 (7-Sp Exotic DCT)", category: "JDM & Exotic Swap", type: "Automatic", ratios: [3.08, 2.18, 1.63, 1.29, 1.03, 0.84, 0.69], reverse: 2.75, nativePattern: "Exotic_DCT_Transaxle", lengthInches: 26.8, defaultStall: 2400, clutch: "Twin Wet Carbon-Friction Dual Clutch", tunnelProfile: "NEEDING RAY'S MEASUREMENT (Transaxle OAL [EST] ~26.8\")", desc: "Getrag 7DCL750 Technical Spec (Rev [EST])." }
};

export const VEHICLES_CATALOG: Record<string, VehicleItem> = {
  camaro1969: { id: "camaro1969", make: "Chevrolet", model: "Camaro (1st Gen SS 350 / 327 — RWD)", yearRange: [1967, 1969], gen: "1st Gen F-Body (RWD)", tunnelSize: "NEEDING RAY'S MEASUREMENT (Factory Powerglide, TH350, TH400, Saginaw/Muncie 4-sp)" },
  camaro1979: { id: "camaro1979", make: "Chevrolet", model: "Camaro (2nd Gen Z28/LT — RWD)", yearRange: [1970, 1981], gen: "2nd Gen F-Body (RWD)", tunnelSize: "NEEDING RAY'S MEASUREMENT (Factory TH350, TH400, Muncie, Super T-10)" },
  camaro1988: { id: "camaro1988", make: "Chevrolet", model: "Camaro IROC-Z / Z28 (3rd Gen L98 350 — RWD)", yearRange: [1987, 1992], gen: "3rd Gen F-Body (RWD)", tunnelSize: "NEEDING RAY'S MEASUREMENT (Factory L98 350 paired w/ 700R4 only)" },
  chevelle1970: { id: "chevelle1970", make: "Chevrolet", model: "Chevelle SS 350 / 454 (RWD)", yearRange: [1970, 1972], gen: "2nd Gen A-Body (RWD)", tunnelSize: "NEEDING RAY'S MEASUREMENT (Factory TH350, TH400, Muncie)" },
  corvette1969: { id: "corvette1969", make: "Chevrolet", model: "Corvette C3 (350 — RWD)", yearRange: [1969, 1982], gen: "C3 Y-Body (RWD)", tunnelSize: "NEEDING RAY'S MEASUREMENT (Factory TH350, TH400, 700R4 [1982], Muncie, Super T-10)" },
  c10truck: { id: "c10truck", make: "Chevrolet", model: "C10 / K10 Squarebody (RWD / 4WD)", yearRange: [1973, 1987], gen: "3rd Gen C/K (RWD / 4WD)", tunnelSize: "NEEDING RAY'S MEASUREMENT (Verify low-hump 2WD vs high-hump 4WD floorpan)" },
  mustang1967: { id: "mustang1967", make: "Ford", model: "Mustang (302 Windsor — RWD)", yearRange: [1968, 1973], gen: "1st Gen Classic (RWD)", tunnelSize: "NEEDING RAY'S MEASUREMENT (302 debuted 1968; factory C4 & Toploader)" },
  supra1994: { id: "supra1994", make: "Toyota", model: "Supra Twin Turbo A80 (RWD)", yearRange: [1993, 2002], gen: "MK4 JZA80 (RWD)", tunnelSize: "NEEDING RAY'S MEASUREMENT (Factory Getrag V160 & A340E)" },
  datsun240z: { id: "datsun240z", make: "Nissan", model: "Datsun 240Z (S30 L24 — RWD)", yearRange: [1969, 1973], gen: "S30 Fairlady Z (RWD)", tunnelSize: "NEEDING RAY'S MEASUREMENT (Factory Nissan 4/5-sp & 3N71B auto)" }
};

export const CYLINDER_HEAD_FLOW_BENCH: HeadFlowPoint[] = [
  { lift: 0.100, intakeCfm: 66, exhaustCfm: 52 },  // [EST] SBC 23° E-Street #5089 ref
  { lift: 0.200, intakeCfm: 138, exhaustCfm: 108 }, // [EST] SBC 23° E-Street #5089 ref
  { lift: 0.300, intakeCfm: 198, exhaustCfm: 148 }, // [EST] SBC 23° E-Street #5089 ref
  { lift: 0.400, intakeCfm: 242, exhaustCfm: 178 }, // [EST] SBC 23° E-Street #5089 ref
  { lift: 0.500, intakeCfm: 265, exhaustCfm: 195 }, // [EST] SBC 23° E-Street #5089 ref
  { lift: 0.600, intakeCfm: 274, exhaustCfm: 205 }  // [EST] SBC 23° E-Street #5089 ref
];

export const ARP_TORQUE_AND_STRETCH_SPECS: TorqueSpec[] = [
  { item: "Connecting Rod Bolts (SBC 350 5.700\" Rods)", size: "3/8-24", stock: "45 ft-lbs (OEM 3/8\" Large-Journal — GM Service Manual)", arp: "45 ft-lbs w/ ARP Ultra-Torque (Verify exact bolt SKU)", stretch: "0.0058\"–0.0062\" [Ref ARP 8740 — NEEDING RAY'S MEASUREMENT]", notes: "Primary check is bolt stretch per ARP sheet." },
  { item: "Cylinder Head Bolts (Gen-I SBC 17-Bolt)", size: "7/16-14", stock: "65 ft-lbs (GM Service Manual)", arp: "70 ft-lbs w/ ARP lube (Verify #134-3601)", notes: "Thread sealant required on coolant-jacket holes." },
  { item: "Main Bearing Caps (Gen-I SBC Inner/2-Bolt)", size: "7/16-14", stock: "70–80 ft-lbs (GM Service Manual)", arp: "70–75 ft-lbs w/ ARP lube", notes: "Main housing bore (2.6406\"–2.6415\" OEM) & clearance NEEDING RAY'S MEASUREMENT." },
  { item: "Main Bearing Caps (Gen-I SBC Outer 4-Bolt)", size: "7/16-14", stock: "65–70 ft-lbs (GM Service Manual)", arp: "65 ft-lbs", notes: "Torque inner before outer bolts." },
  { item: "Intake Manifold Bolts (Gen-I SBC)", size: "3/8-16", stock: "30 ft-lbs (GM Service Manual)", arp: "25 ft-lbs (Edelbrock alum spec)", notes: "Spiral sequence from center outward." },
  { item: "Harmonic Balancer Snout Bolt (Gen-I SBC)", size: "7/16-20", stock: "60 ft-lbs (GM Service Manual)", arp: "70–85 ft-lbs w/ washer", notes: "Install using balancer press tool, not bolt." },
  { item: "Flywheel / Flexplate Bolts (Pre-86 2-Pc Seal SBC)", size: "7/16-20", stock: "60 ft-lbs (GM Service Manual)", arp: "65 ft-lbs per ARP sheet", notes: "2-pc seal 3.58\" bolt circle (1986+ 1-pc = 3.00\")." }
];

export const SBC_327_TORQUE_SPECS: TorqueSpec[] = [
  { item: "Head Bolts (17-Bolt Gen-I SBC 327)", size: "7/16-14", stock: "60–70 ft-lbs (GM Chassis Service Manual 1962–69)", arp: "70 ft-lbs w/ ARP lube", notes: "Thread sealant required on coolant-jacket holes." },
  { item: "Rod Bolts (327 Small vs Large Journal)", size: "11/32-24 (62–67) / 3/8-24 (68–69)", stock: "30–35 ft-lbs (62–67) / 45 ft-lbs (68–69) — GM Manual", arp: "Verify exact ARP 11/32\" vs 3/8\" kit", notes: "Clearances NEEDING RAY'S MEASUREMENT." },
  { item: "Main Caps (SBC 327)", size: "7/16-14", stock: "65–75 ft-lbs (62–67) / 70–80 ft-lbs (68–69) — GM Manual", arp: "70–75 ft-lbs w/ ARP lube", notes: "Verify 2.300\" small vs 2.450\" large main journal." }
];

export const BBC_454_TORQUE_SPECS: TorqueSpec[] = [
  { item: "Head Bolts (Mark IV BBC 454 16-Bolt)", size: "7/16-14", stock: "80 ft-lbs (GM Mark IV Service Manual)", arp: "75–80 ft-lbs w/ ARP lube", notes: "Thread sealant required on wet holes." },
  { item: "Rod Bolts (Mark IV BBC 454)", size: "3/8-24 / 7/16-20 HP", stock: "50 ft-lbs (3/8\") / 67–73 ft-lbs (7/16\") — GM Manual", arp: "Verify ARP BBC rod sheet", notes: "Clearances NEEDING RAY'S MEASUREMENT." },
  { item: "Main Caps (Mark IV BBC 454)", size: "1/2-13 Inner / 7/16-14 Outer", stock: "105–110 ft-lbs inner / 95 ft-lbs outer — GM Manual", arp: "100–110 ft-lbs w/ ARP lube", notes: "External-balance flywheel/damper required." }
];

export const LS3_62_TORQUE_SPECS: TorqueSpec[] = [
  { item: "Head Bolts (GM LS3 TTY M11 + M8)", size: "M11×2.0 + M8×1.25", stock: "M11: 22 ft-lbs + 90° + 90°; M8: 22 ft-lbs (GM Gen-IV Manual)", arp: "ARP #134-3610: M11 70–80 ft-lbs, M8 22–28 ft-lbs", notes: "Dry blind holes required for TTY bolts." },
  { item: "Main Caps (LS3 6-Bolt Cross-Bolted)", size: "M10 Inner/Outer + M8 Side", stock: "Inner M10: 15 ft-lbs + 80°; Outer M10: 15 ft-lbs + 51°; Side M8: 18 ft-lbs", arp: "Verify ARP #234-5608 sheet", notes: "Clearances NEEDING RAY'S MEASUREMENT." },
  { item: "Rod Bolts (LS3 Cracked Cap TTY)", size: "M9×1.0", stock: "15 ft-lbs + 85° (GM Gen-IV Manual)", arp: "ARP #134-6006: 45 ft-lbs", notes: "Verify bore roundness if swapping to ARP." }
];

export const FORD_302_TORQUE_SPECS: TorqueSpec[] = [
  { item: "Head Bolts (Ford 302 10-Bolt)", size: "7/16-14", stock: "65–72 ft-lbs (55, 65, 72 — Ford Shop Manual)", arp: "70 ft-lbs w/ ARP lube", notes: "Thread sealant on lower coolant-jacket bolts." },
  { item: "Main Caps (Ford 302 Windsor)", size: "7/16-14", stock: "60–70 ft-lbs (Ford Shop Manual)", arp: "70 ft-lbs w/ ARP lube", notes: "Verify 28.2 oz-in (68–80) vs 50.0 oz-in (81–01) balance." },
  { item: "Rod Bolts (Ford 302 Windsor)", size: "5/16-24", stock: "19–24 ft-lbs (Ford Shop Manual)", arp: "26 ft-lbs (Verify ARP #154-6002)", notes: "Clearances NEEDING RAY'S MEASUREMENT." }
];

export const TOYOTA_2JZ_TORQUE_SPECS: TorqueSpec[] = [
  { item: "Head Bolts (2JZ-GTE 14-Bolt)", size: "M11×1.25", stock: "36 ft-lbs (49 N·m) + 90° + 90° (Toyota JZA80 Manual)", arp: "ARP #203-4205: 80–85 ft-lbs", notes: "Measure shank diameter (10.75 mm limit) before reuse." },
  { item: "Main Bearing Caps (2JZ-GTE)", size: "M12×1.25", stock: "32 ft-lbs (44 N·m) + 90° (Toyota JZA80 Manual)", arp: "Verify ARP #203-5405 sheet", notes: "Clearances NEEDING RAY'S MEASUREMENT." },
  { item: "Connecting Rod Caps (2JZ-GTE)", size: "M9×1.0", stock: "22 ft-lbs (29 N·m) + 90° (Toyota JZA80 Manual)", arp: "Verify ARP #203-6004 sheet", notes: "Clearances NEEDING RAY'S MEASUREMENT." }
];

export const HEAD_BOLT_17_SEQUENCE = [
  { boltNum: 1, x: 0, y: 0, row: 'top', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 2, x: 0, y: 1, row: 'bottom', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 3, x: 1, y: 0, row: 'top', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 4, x: 1, y: 1, row: 'bottom', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 5, x: -1, y: 0, row: 'top', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 6, x: -1, y: 1, row: 'bottom', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 7, x: 2, y: 0, row: 'top', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 8, x: 2, y: 1, row: 'bottom', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 9, x: -2, y: 0, row: 'top', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 10, x: -2, y: 1, row: 'bottom', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 11, x: 3, y: 0, row: 'top', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 12, x: 3, y: 1, row: 'bottom', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 13, x: -3, y: 0, row: 'top', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 14, x: -3, y: 1, row: 'bottom', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 15, x: 4, y: 0, row: 'top', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 16, x: 4, y: 1, row: 'bottom', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' },
  { boltNum: 17, x: 5, y: 0, row: 'top', ftLbs: '25 → 45 → 65 (GM OEM Gen-I SBC)' }
];

export const MECHANIC_SPECS_LIBRARY: MechanicSpec[] = [
  { label: "DECK CLEARANCE & HEAD VOLUMES (SBC 350)", value: "NEEDING RAY'S MEASUREMENT", notes: "Targets [EST]: 0.015\" deck (OEM ~0.025\"), 0.039\" gasket (Fel-Pro #1003 is 0.041\"), 64.0 cc E-Street #5089, 5.0 cc KB115. Measure w/ bridge & burette." },
  { label: "MAIN & ROD BEARING OIL CLEARANCE (SBC 350)", value: "NEEDING RAY'S MEASUREMENT", notes: "GM OEM (GM Service Manual): #1–4 mains 0.0008\"–0.0020\", #5 0.0010\"–0.0023\", rods 0.0013\"–0.0035\"; Perf [EST] 0.0020\"–0.0025\"." },
  { label: "CRANKSHAFT END PLAY (SBC 350)", value: "NEEDING RAY'S MEASUREMENT", notes: "GM OEM: 0.002\"–0.006\" (0.008\" limit, GM Service Manual); Perf [EST] 0.003\"–0.007\"." },
  { label: "ROD SIDE CLEARANCE (SBC 350)", value: "NEEDING RAY'S MEASUREMENT", notes: "GM OEM: 0.008\"–0.014\" (GM Service Manual); Scat H-Beam [EST] 0.012\"–0.020\"." },
  { label: "CRANKSHAFT & DECK RUNOUT (SBC 350)", value: "NEEDING RAY'S MEASUREMENT", notes: "GM OEM crank runout limit: 0.0015\" max TIR (GM Service Manual)." },
  { label: "HYDRAULIC VALVE LASH PRELOAD (SBC 350)", value: "NEEDING RAY'S MEASUREMENT", notes: "GM OEM flat-tappet 3/4–1 turn (GM Manual); Comp hyd roller [EST] 1/2 turn past zero lash." },
  { label: "OIL PUMP PICKUP TO PAN BOTTOM (SBC 350)", value: "NEEDING RAY'S MEASUREMENT", notes: "Melling/pan spec [EST]: 0.250\"–0.375\" (verify w/ clay on Ray's specific pan & M55HV pump)." },
  { label: "STARTER PINION BACKLASH (SBC 350)", value: "NEEDING RAY'S MEASUREMENT", notes: "Powermaster #9600 spec: 0.020\"–0.035\" radial clearance; shim pad as measured." },
  { label: "SPARK PLUG GAP (SBC 350 HEI / E-STREET)", value: "0.035\" – 0.045\" (Verify Coil/Head Spec)", notes: "Ray baseline [EST]: 0.040\" (Edelbrock #5089 uses 14mm 3/4\" reach gasketed plugs, NOT OEM R45TS tapered seat). GM stock HEI was 0.045\"–0.060\"." },
  { label: "INITIAL & TOTAL IGNITION TIMING (SBC 350 CARB)", value: "NEEDING RAY'S MEASUREMENT (Verify TDC)", notes: "SBC 350 perf target [EST]: 12° BTDC / 36° total @ 3,000 RPM (GM stock initial varied 4°–12° BTDC). Not universal." },
  { label: "FUEL PRESSURE TO CARBURETOR (SBC 350 CARB)", value: "NEEDING RAY'S MEASUREMENT (Gauge Check)", notes: "Holley 4150 spec: 5.5–6.5 PSI (7.0 PSI max). Carbureted gasoline ONLY." },
  { label: "DRIVELINE & PINION ANGLE (CHASSIS)", value: "NEEDING RAY'S MEASUREMENT", notes: "Measure tailshaft vs pinion angle w/ inclinometer at ride height (typical target [EST] 1°–3°)." }
];

export const BASE_BOM: BOMItem[] = [
  { cat: "Engine Block", part: "GM Gen-I SBC 350 4-Bolt Main Casting (9.025\" Deck, 2-Pc Seal Ref #3970010 — NOT 1-pc #10243880) [EST price]", num: "GM Casting #3970010 (VERIFY)", price: 850.00 },
  { cat: "Crankshaft", part: "Scat Forged 4340 Steel Crankshaft 3.480\" Stroke 2-Pc Seal [EST price]", num: "MAKER-SUPPLIED PLACEHOLDER (Scat 4340 3.480\" SBC)", price: 495.00 },
  { cat: "Connecting Rods", part: "Scat Forged 4340 H-Beam Rods 5.700\" (Verify 3/8\" vs 7/16\" cap screw SKU) [EST price]", num: "MAKER-SUPPLIED PLACEHOLDER (Scat 5.700\" H-Beam)", price: 345.00 },
  { cat: "Pistons", part: "Keith Black Hypereutectic 4.000\" Bore Flat-Top +5.0cc Relief (UEM Catalog) [EST price]", num: "KB-115-000", price: 360.00 },
  { cat: "Piston Rings", part: "Total Seal 4.000\" SBC Ring Set (Verify ring widths & SKU) [EST price]", num: "MAKER-SUPPLIED PLACEHOLDER (Total Seal 4.000\")", price: 125.00 },
  { cat: "Cylinder Heads", part: "Edelbrock E-Street 64cc Alum 2.020\"/1.600\" Perf Heads (Qty 2; stock GM 350 was 1.940\"/1.500\") [EST price]", num: "EDL-5089 (Qty 2)", price: 1290.00 },
  { cat: "Head Gaskets", part: "Fel-Pro #1003 Performance Gasket (0.041\" catalog; 0.039\" uses #1010/#7733PT-2 class) [EST price]", num: "FEL-1003 (Verify 0.041\" vs 0.039\")", price: 98.00 },
  { cat: "Camshaft & Lifters", part: "Comp Cams Xtreme Energy Hyd. Roller (CL12-422-8 is 218/224 XR270HR; verify 224/230 & retrofit lifters) [EST price]", num: "CCA-CL12-422-8 (Verify Grind)", price: 489.00 },
  { cat: "Rocker Arms", part: "Scorpion Endurance 1.5:1 Rollers (7/16\" stud; stock E-Street #5089 has 3/8\" studs) [EST price]", num: "SCP-1024 (Verify Stud Size)", price: 285.00 },
  { cat: "Oil Pump & Pickup", part: "Melling M55HV High-Volume Oil Pump (Pickup sold per pan depth) [EST price]", num: "MEL-M55HV", price: 84.00 },
  { cat: "Ignition Distributor", part: "MSD Pro-Billet Ready-to-Run SBC Distributor (Wires separate) [EST price]", num: "MSD-8360", price: 420.00 },
  { cat: "Water Pump", part: "Edelbrock Victor Short Mechanical Aluminum SBC Water Pump [EST price]", num: "EDL-8810", price: 185.00 },
  { cat: "Fuel Pump", part: "Holley 110 GPH Mechanical SBC Fuel Pump (6.5–8.0 PSI; regulate to 5.5–6.5 PSI) [EST price]", num: "HLY-12-327-11", price: 129.00 },
  { cat: "Starter Motor", part: "Powermaster MasterTorque Mini Starter 153/168-Tooth Dual Pattern [EST price]", num: "PWM-9600", price: 195.00 },
  { cat: "Alternator", part: "Powermaster 100A 1-Wire Chrome Alternator (Bracket separate) [EST price]", num: "PWM-17294", price: 165.00 }
];

export const ENGINE_CATALOG_AUDIT: Record<string, EngineCatalogAuditRecord> = {
  sbc_350_ray: {
    sources: RAY_BASELINE_AUDIT.sources,
    estimatedFields: ['dynoSimulated (385 HP/414 TQ carb, 408 HP/431 TQ MPFI; stored baseTq=415 pending dyno module)', 'deckClearance', 'gasketThickness', 'staticCR', 'bomPrices'],
    measurementNeededFields: RAY_BASELINE_AUDIT.measurementNeededFields,
    baselineNotes: ['349.85 CID, bore 4.000", stroke 3.480", bore spacing 4.400", deck 9.025", rod 5.700".', '2.020"/1.600" valves = Edelbrock E-Street #5089 perf heads (stock GM 350 = 1.940"/1.500").']
  },
  sbc_327: {
    sources: ['GM Chassis Service Manual 1962–69', 'Chevrolet Power Manual'],
    estimatedFields: ['dyno', 'chamberCc', 'gasketThickness', 'deckClearance', 'quenchDistance', 'staticCR'],
    measurementNeededFields: ['deckClearance', 'gasketThickness', 'chamberCc', 'bearingClearances', 'crankshaftEndPlay', 'runout'],
    baselineNotes: ['2.020"/1.600" = L79/L76 #461/#462 perf heads (base 327 used 1.940"/1.720" & 1.500").']
  },
  bbc_454: {
    sources: ['GM Mark IV Service Manual', 'Chevrolet Power Manual'],
    estimatedFields: ['dyno', 'chamberCc', 'gasketThickness', 'deckClearance', 'quenchDistance', 'staticCR'],
    measurementNeededFields: ['deckClearance', 'gasketThickness', 'chamberCc', 'pistonDomeCc', 'bearingClearances', 'crankshaftEndPlay', 'runout'],
    baselineNotes: ['2.190"/1.880" = LS6 rect-port valves (oval-port passenger = 2.060"/1.720").']
  },
  ls3_62: {
    sources: ['GM Gen-IV Service Manual', 'Chevrolet Performance LS3 Crate Spec Sheet (68.4 cc #821 head)'],
    estimatedFields: ['dyno (436/428 matches Corvette NPP SAE Net; std LS3 = 430/424)', 'gasketThickness', 'deckClearance'],
    measurementNeededFields: ['deckClearance', 'gasketThickness', 'chamberCc', 'bearingClearances', 'crankshaftEndPlay', 'runout'],
    baselineNotes: ['chamberCc corrected 68.0 -> 68.4 cc per Chevrolet Performance #821 spec.']
  },
  ford_302: {
    sources: ['Ford Car Shop Manual (302 Windsor)', 'Ford Racing SBF Technical Spec'],
    estimatedFields: ['dyno', 'chamberCc', 'gasketThickness', 'deckClearance', 'quenchDistance', 'staticCR'],
    measurementNeededFields: ['deckClearance', 'gasketThickness', 'chamberCc', 'pistonReliefCc', 'bearingClearances', 'crankshaftEndPlay', 'runout'],
    baselineNotes: ['1-5-4-2-6-3-7-8 std 302 (5.0 HO / Boss 302 used 1-3-7-2-6-5-4-8).']
  },
  toyota_2jz: {
    sources: ['Toyota Supra JZA80 Repair Manual', 'Toyota MVMA Specifications'],
    estimatedFields: ['dyno', 'chamberCc', 'gasketThickness', 'deckClearance', 'quenchDistance'],
    measurementNeededFields: ['deckClearance', 'gasketThickness', 'chamberCc', 'pistonDishCc', 'bearingClearances', 'crankshaftEndPlay', 'valveLash', 'runout'],
    baselineNotes: ['86x86 mm, 142 mm rod, 219 mm deck (8.622"), 93 mm bore spacing (3.661").']
  }
};

export const ENGINE_CATALOG: Record<string, EngineCatalogItem> = {
  sbc_350_ray: {
    id: "sbc_350_ray",
    name: "Chevrolet SBC 350 V8 (Ray's Baseline — Edelbrock E-Street #5089 Perf Heads)",
    shortName: "Chevy SBC 350",
    make: "Chevrolet",
    era: "Classic Domestic",
    pattern: "GM_Chevy_V8",
    balance: "Internal / Neutral (1967–85 2-pc rear seal — GM Service Manual)",
    flywheelTeeth: "153 or 168-Tooth (Chevrolet Performance)",
    cylinders: 8,
    configLabel: "V8",
    valvetrainType: "OHV",
    blockMaterial: "iron",
    headMaterial: "aluminum", // Perf: Edelbrock #5089 (Stock GM 350 = cast iron)
    boreSpacing: 4.400, // Chevrolet Power Manual
    bankAngleDeg: 90,
    valveAngleDeg: 23, // Chevrolet Power Manual
    stockRockerRatio: 1.5, // GM Service Manual
    intakeValveIn: 2.02, // Perf E-Street #5089 (Stock GM 350 = 1.940"/1.720")
    exhaustValveIn: 1.60, // Perf E-Street #5089 (Stock GM 350 = 1.500")
    mainCaps: 5,
    bore: 4.000, // 349.85 CID
    stroke: 3.480,
    rodLength: 5.700,
    deckHeight: 9.025,
    chamberCc: 64.0, // Edelbrock #5089 — NEEDING RAY'S MEASUREMENT
    gasketThickness: 0.039, // [EST] Target (Fel-Pro #1003 is 0.041") — NEEDING RAY'S MEASUREMENT
    deckClearance: 0.015, // [EST] Target — NEEDING RAY'S MEASUREMENT
    quenchDistance: 0.054, // [EST]
    staticCR: 9.90, // [EST]
    color: 0xd83b01,
    firingOrder: "1-8-4-3-6-5-7-2", // GM Service Manual
    dyno: { baseHp: 385, baseTq: 415, hpPeakRpm: 5600, tqPeakRpm: 3800, ve: 0.90 }, // [EST] Simulated (baseTq 415 vs 414 carb target flagged)
    torqueSpecs: ARP_TORQUE_AND_STRETCH_SPECS,
    bom: BASE_BOM
  },
  sbc_327: {
    id: "sbc_327",
    name: "Chevrolet SBC 327 V8 (1962–69 — L79/L76 Perf Head Ref)",
    shortName: "Chevy SBC 327",
    make: "Chevrolet",
    era: "Classic Domestic",
    pattern: "GM_Chevy_V8",
    balance: "Internal / Neutral (2-pc rear seal — GM Service Manual)",
    flywheelTeeth: "153-Tooth (168T also used)",
    cylinders: 8,
    configLabel: "V8",
    valvetrainType: "OHV",
    blockMaterial: "iron",
    headMaterial: "iron",
    boreSpacing: 4.400, // Chevrolet Power Manual
    bankAngleDeg: 90,
    valveAngleDeg: 23,
    stockRockerRatio: 1.5,
    intakeValveIn: 2.02, // L79/L76 perf (base 327 = 1.940"/1.720")
    exhaustValveIn: 1.60,
    mainCaps: 5,
    bore: 4.000, // GM Service Manual
    stroke: 3.250,
    rodLength: 5.700,
    deckHeight: 9.025,
    chamberCc: 64.0, // [EST] NEEDING RAY'S MEASUREMENT
    gasketThickness: 0.039, // [EST] NEEDING RAY'S MEASUREMENT
    deckClearance: 0.015, // [EST] NEEDING RAY'S MEASUREMENT
    quenchDistance: 0.054, // [EST]
    staticCR: 10.25, // [EST]
    color: 0xd83b01,
    firingOrder: "1-8-4-3-6-5-7-2",
    dyno: { baseHp: 375, baseTq: 360, hpPeakRpm: 6200, tqPeakRpm: 4200, ve: 0.92 }, // [EST] Simulated
    torqueSpecs: SBC_327_TORQUE_SPECS,
    bom: []
  },
  bbc_454: {
    id: "bbc_454",
    name: "Chevrolet Big-Block 454 V8 (Mark IV — LS6 Rect-Port Valve Ref)",
    shortName: "Chevy BBC 454",
    make: "Chevrolet",
    era: "Classic Domestic",
    pattern: "GM_Chevy_V8",
    balance: "External Balance (454 damper & flywheel — GM Service Manual)",
    flywheelTeeth: "168-Tooth",
    cylinders: 8,
    configLabel: "V8",
    valvetrainType: "OHV",
    blockMaterial: "iron",
    headMaterial: "iron",
    boreSpacing: 4.840, // Chevrolet Power Manual
    bankAngleDeg: 90,
    valveAngleDeg: 26, // 26° int / 17° exh canted
    stockRockerRatio: 1.7,
    intakeValveIn: 2.19, // LS6 rect-port (oval-port = 2.060")
    exhaustValveIn: 1.88, // LS6 rect-port (oval-port = 1.720")
    mainCaps: 5,
    bore: 4.250, // GM Service Manual
    stroke: 4.000,
    rodLength: 6.135,
    deckHeight: 9.800,
    chamberCc: 118.0, // [EST] NEEDING RAY'S MEASUREMENT
    gasketThickness: 0.041, // [EST] NEEDING RAY'S MEASUREMENT
    deckClearance: 0.020, // [EST] NEEDING RAY'S MEASUREMENT
    quenchDistance: 0.061, // [EST]
    staticCR: 10.00, // [EST]
    color: 0xd83b01,
    firingOrder: "1-8-4-3-6-5-7-2",
    dyno: { baseHp: 460, baseTq: 520, hpPeakRpm: 5400, tqPeakRpm: 3600, ve: 0.94 }, // [EST] Simulated
    torqueSpecs: BBC_454_TORQUE_SPECS,
    bom: []
  },
  ls3_62: {
    id: "ls3_62",
    name: "GM Gen-IV LS3 6.2L V8 (All-Aluminum)",
    shortName: "GM LS3 6.2L",
    make: "Chevrolet",
    era: "Modern Domestic",
    pattern: "GM_LS_Modular",
    balance: "Internal / Neutral Balance (GM Gen-IV Manual)",
    flywheelTeeth: "168-Tooth Flat Flywheel",
    cylinders: 8,
    configLabel: "V8",
    valvetrainType: "OHV",
    blockMaterial: "aluminum",
    headMaterial: "aluminum",
    boreSpacing: 4.400, // Chevrolet Performance LS3 Spec
    bankAngleDeg: 90,
    valveAngleDeg: 15, // Chevrolet Performance LS3 Spec
    stockRockerRatio: 1.7,
    intakeValveIn: 2.165, // #821 head spec
    exhaustValveIn: 1.590,
    mainCaps: 5,
    bore: 4.065, // GM Gen-IV Manual
    stroke: 3.622,
    rodLength: 6.098,
    deckHeight: 9.240,
    chamberCc: 68.4, // Corrected 68.0 -> 68.4 cc per Chevrolet Performance LS3 #821 Spec (NEEDING RAY'S MEASUREMENT)
    gasketThickness: 0.051, // OEM MLS nominal — NEEDING RAY'S MEASUREMENT
    deckClearance: -0.005, // OEM nominal — NEEDING RAY'S MEASUREMENT
    quenchDistance: 0.046, // Nominal — NEEDING RAY'S MEASUREMENT
    staticCR: 10.70, // GM Gen-IV Manual
    color: 0x8a939e,
    firingOrder: "1-8-7-2-6-5-4-3", // GM Gen-IV Manual
    dyno: { baseHp: 436, baseTq: 428, hpPeakRpm: 5900, tqPeakRpm: 4600, ve: 0.95 }, // [EST] Simulated (C6 NPP SAE Net)
    torqueSpecs: LS3_62_TORQUE_SPECS,
    bom: []
  },
  ford_302: {
    id: "ford_302",
    name: "Ford 302 Small-Block Windsor V8",
    shortName: "Ford 302 Windsor",
    make: "Ford",
    era: "Classic Domestic",
    pattern: "Ford_SBF_6Bolt",
    balance: "External Balance (28.2 oz 1968–80 / 50.0 oz 1981–01 — Ford Shop Manual)",
    flywheelTeeth: "157 or 164-Tooth",
    cylinders: 8,
    configLabel: "V8",
    valvetrainType: "OHV",
    blockMaterial: "iron",
    headMaterial: "iron",
    boreSpacing: 4.380, // Ford Shop Manual / Ford Racing
    bankAngleDeg: 90,
    valveAngleDeg: 20, // Ford Racing SBF Spec
    stockRockerRatio: 1.6,
    intakeValveIn: 1.78, // Ford Shop Manual
    exhaustValveIn: 1.45,
    mainCaps: 5,
    bore: 4.000, // Ford Shop Manual
    stroke: 3.000,
    rodLength: 5.090,
    deckHeight: 8.206,
    chamberCc: 58.0, // [EST] NEEDING RAY'S MEASUREMENT
    gasketThickness: 0.042, // [EST] NEEDING RAY'S MEASUREMENT
    deckClearance: 0.012, // [EST] NEEDING RAY'S MEASUREMENT
    quenchDistance: 0.054, // [EST]
    staticCR: 9.50, // [EST]
    color: 0x1e40af,
    firingOrder: "1-5-4-2-6-3-7-8", // Ford Shop Manual (5.0 HO = 1-3-7-2-6-5-4-8)
    dyno: { baseHp: 325, baseTq: 350, hpPeakRpm: 5500, tqPeakRpm: 3400, ve: 0.88 }, // [EST] Simulated
    torqueSpecs: FORD_302_TORQUE_SPECS,
    bom: []
  },
  toyota_2jz: {
    id: "toyota_2jz",
    name: "Toyota 2JZ-GTE 3.0L Twin-Turbo",
    shortName: "Toyota 2JZ-GTE",
    make: "Toyota",
    era: "Japanese JDM",
    pattern: "Toyota_JZ_Block",
    balance: "Internal / Neutral Balance (Toyota Repair Manual)",
    flywheelTeeth: "154-Tooth Toyota",
    cylinders: 6,
    configLabel: "I6",
    valvetrainType: "DOHC",
    blockMaterial: "iron",
    headMaterial: "aluminum",
    boreSpacing: 3.661, // 93.0 mm (Toyota MVMA Spec)
    bankAngleDeg: 0,
    valveAngleDeg: 22.5, // Half of 45° included angle
    intakeValveIn: 1.319, // 33.5 mm (Toyota MVMA Spec)
    exhaustValveIn: 1.142, // 29.0 mm (Toyota MVMA Spec)
    mainCaps: 7,
    bore: 3.386, // 86.0 mm (Toyota Repair Manual)
    stroke: 3.386, // 86.0 mm
    rodLength: 5.590, // 142.0 mm (Toyota MVMA Spec)
    deckHeight: 8.622, // 219.0 mm (Toyota MVMA Spec)
    chamberCc: 44.0, // [EST] NEEDING RAY'S MEASUREMENT
    gasketThickness: 0.051, // [EST] NEEDING RAY'S MEASUREMENT
    deckClearance: 0.010, // [EST] NEEDING RAY'S MEASUREMENT
    quenchDistance: 0.061, // [EST]
    staticCR: 8.50, // Toyota Supra JZA80 Repair Manual
    color: 0x334155,
    firingOrder: "1-5-3-6-2-4", // Toyota Supra JZA80 Repair Manual
    dyno: { baseHp: 320, baseTq: 315, hpPeakRpm: 5800, tqPeakRpm: 3800, ve: 1.15 }, // [EST] Simulated (USDM SAE Net)
    torqueSpecs: TOYOTA_2JZ_TORQUE_SPECS,
    bom: []
  }
};