/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Units = "imperial" | "metric";

export interface EngineSpec {
  id: string;
  family: string; // e.g., "SBC Gen I", "Modular", "K-Series"
  cylinders: number;
  configuration: "I3" | "I4" | "I5" | "I6" | "V6" | "V8" | "V10" | "V12" | "H4" | "H6" | "Rotary" | "EV";
  boreIn?: number;
  strokeIn?: number;
  boreSpacingIn?: number;
  deckHeightIn?: number;
  overallLengthIn?: number;
  overallWidthIn?: number;
  overallHeightIn?: number;
  industryStandards?: string[]; // e.g., ["SAE J1349", "ISO 1585", "FMVSS"]
  verified?: boolean;
  // Minimal extension fields for Ray's baseline, [EST] outputs, citations & measurement flags
  make?: string;
  name?: string;
  displacementCid?: number; // Always computed via calculateDisplacementCID
  rodLengthIn?: number;
  valvetrain?: string;
  valveAngleDeg?: number;
  bankAngleDeg?: number;
  rockerRatio?: number;
  intakeValveIn?: number;
  exhaustValveIn?: number;
  firingOrder?: string;
  balance?: string;
  induction?: string;
  fuelSystem?: string;
  dynoSimulated?: {
    carbHp?: number;
    carbTq?: number;
    mpfiHp?: number;
    mpfiTq?: number;
    baseHp: number;
    baseTq: number;
    hpPeakRpm: number;
    tqPeakRpm: number;
    ve: number;
    note: string;
  };
  clearancesAndVolumes?: Record<string, string>;
  torqueSpecs?: Array<{ item: string; spec: string; source: string }>;
  bom?: Array<{ cat: string; part: string; partNum: string; priceEst?: number }>;
  estimatedFields?: string[];
  measurementNeededFields?: string[];
}

export interface TransmissionSpec {
  id: string;
  code: string; // e.g., "TH350", "4L60E", "TR-6060", "ZF-8HP"
  type: "manual" | "automatic" | "dct" | "cvt" | "single-speed";
  gears: number;
  bellhousingPattern?: string;
  lengthIn?: number;
  verified?: boolean;
  // Minimal extension fields
  name?: string;
  ratios?: number[];
  reverseRatio?: number;
  tunnelFitment?: string;
  serviceNotes?: string;
  sources?: string[];
  estimatedFields?: string[];
  measurementNeededFields?: string[];
}

export interface VehicleTrimConfig {
  id: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  engineIds: string[];
  transmissionIds: string[];
  drivetrain: ("FWD" | "RWD" | "AWD" | "4WD")[];
  // Minimal extension fields
  chassisCode?: string;
  tunnelFitment?: string;
  sources?: string[];
}

export interface PowertrainLibrary {
  engines: Record<string, EngineSpec>;
  transmissions: Record<string, TransmissionSpec>;
  vehicles: VehicleTrimConfig[];
}

export function calculateDisplacementCID(boreIn: number, strokeIn: number, cylinders: number): number {
  if (boreIn <= 0 || strokeIn <= 0 || cylinders <= 0) {
    throw new Error("Bore, stroke, and cylinder count must be positive numbers.");
  }
  return Number(((Math.PI / 4) * boreIn * boreIn * strokeIn * cylinders).toFixed(2));
}

export function validateLibrary(lib: PowertrainLibrary): string[] {
  const errors: string[] = [];
  for (const v of lib.vehicles) {
    if (v.yearStart > v.yearEnd) {
      errors.push(`Vehicle ${v.id}: yearStart (${v.yearStart}) exceeds yearEnd (${v.yearEnd}).`);
    }
    for (const eid of v.engineIds) {
      if (!lib.engines[eid]) errors.push(`Vehicle ${v.id}: missing engine "${eid}".`);
    }
    for (const tid of v.transmissionIds) {
      if (!lib.transmissions[tid]) errors.push(`Vehicle ${v.id}: missing transmission "${tid}".`);
    }
  }
  return errors;
}

export const POWERTRAIN_LIBRARY: PowertrainLibrary = {
  engines: {
    sbc_350_ray: {
      id: "sbc_350_ray",
      family: "GM Small-Block Gen I",
      make: "Chevrolet",
      name: "Chevrolet SBC 350 V8 (Ray's Baseline — Edelbrock E-Street #5089 Perf Heads)",
      cylinders: 8,
      configuration: "V8",
      boreIn: 4.000,
      strokeIn: 3.480,
      displacementCid: calculateDisplacementCID(4.000, 3.480, 8), // 349.85 CID
      boreSpacingIn: 4.400,
      deckHeightIn: 9.025,
      rodLengthIn: 5.700,
      valvetrain: "OHV 2-Valve Pushrod",
      valveAngleDeg: 23,
      bankAngleDeg: 90,
      rockerRatio: 1.5,
      intakeValveIn: 2.020, // Performance: Edelbrock E-Street #5089 (Stock GM 350 = 1.940" or 1.720")
      exhaustValveIn: 1.600, // Performance: Edelbrock E-Street #5089 (Stock GM 350 = 1.500")
      firingOrder: "1-8-4-3-6-5-7-2",
      balance: "Internal / Neutral (1967–85 2-pc rear main seal; 1986+ 1-pc seal external)",
      induction: "Carbureted (Holley 4150 650 CFM) / MPFI Retrofit Option",
      fuelSystem: "4-BBL Mechanical Secondary Carburetor / MPFI [EST]",
      industryStandards: [
        "SAE J245 / SAE J1349",
        "GM / Chevrolet Service Manual (Gen-I SBC 350)",
        "Chevrolet Power Manual (4.400\" bore spacing, 9.025\" deck, 23° valve angle, 5.700\" rod)",
        "Edelbrock Catalog #5089 (64cc aluminum head, 185cc intake runner, 2.020\"/1.600\" valves)",
        "UEM / Keith Black Catalog (KB115 +5.0cc piston spec)",
        "Federal-Mogul / Fel-Pro Catalog (#1003 / #1010 gasket specs)"
      ],
      verified: true,
      dynoSimulated: {
        carbHp: 385,
        carbTq: 414,
        mpfiHp: 408,
        mpfiTq: 431,
        baseHp: 385,
        baseTq: 415,
        hpPeakRpm: 5600,
        tqPeakRpm: 3800,
        ve: 0.90,
        note: "[EST] Simulated dyno output. Ray confirmed baseline: 385 HP / 414 TQ carb, MPFI 408 HP / 431 TQ [EST]. Stored baseTq=415 kept pending dyno module audit."
      },
      clearancesAndVolumes: {
        deckClearance: "NEEDING RAY'S MEASUREMENT (Target [EST]: 0.015\"; OEM nominal ~0.025\")",
        gasketThickness: "NEEDING RAY'S MEASUREMENT (Target [EST]: 0.039\"; Fel-Pro #1003 catalog is 0.041\", #1010/#7733PT-2 is 0.039\")",
        chamberCc: "NEEDING RAY'S MEASUREMENT via burette (Edelbrock #5089 catalog 64.0 cc; stock GM 350 was 64–76 cc)",
        pistonReliefCc: "NEEDING RAY'S MEASUREMENT via burette (KB115 catalog +5.0 cc)",
        bearingClearances: "NEEDING RAY'S MEASUREMENT (GM Service Manual OEM: #1–4 mains 0.0008\"–0.0020\", #5 0.0010\"–0.0023\", rods 0.0013\"–0.0035\"; Perf [EST] 0.0020\"–0.0025\")",
        crankshaftEndPlay: "NEEDING RAY'S MEASUREMENT (GM OEM 0.002\"–0.006\", service limit 0.008\")",
        rodSideClearance: "NEEDING RAY'S MEASUREMENT (GM OEM 0.008\"–0.014\"; Scat H-beam [EST] 0.012\"–0.020\")",
        runout: "NEEDING RAY'S MEASUREMENT (GM OEM crank journal runout max 0.0015\" TIR)",
        valveLashPreload: "NEEDING RAY'S MEASUREMENT (GM OEM flat-tappet 3/4–1 turn; Comp hyd roller [EST] 1/2 turn past zero lash)",
        oilPumpPickupClearance: "NEEDING RAY'S MEASUREMENT (Melling/pan spec [EST] 0.250\"–0.375\" via clay)",
        starterPinionBacklash: "NEEDING RAY'S MEASUREMENT (Powermaster/GM 0.020\"–0.035\" radial clearance)",
        ringEndGap: "NEEDING RAY'S MEASUREMENT (Per ring manufacturer bore × factor chart)",
        pinionAngle: "NEEDING RAY'S MEASUREMENT (Chassis inclinometer check; street target [EST] 1°–3°)"
      },
      torqueSpecs: [
        { item: "Head Bolts (17-Bolt Gen-I SBC)", spec: "65 ft-lbs OEM (70 ft-lbs w/ ARP lube; thread sealant on all holes)", source: "GM Service Manual / ARP #134-3601" },
        { item: "Main Caps (2-Bolt / 4-Bolt)", spec: "70–80 ft-lbs inner, 65–70 ft-lbs outer OEM (70–75 ft-lbs ARP)", source: "GM Service Manual / ARP" },
        { item: "Rod Bolts (3/8-24 Large-Journal)", spec: "45 ft-lbs OEM & ARP 8740 (0.0058\"–0.0062\" stretch ref)", source: "GM Service Manual / ARP" },
        { item: "Intake / Balancer / Flywheel (2-Pc)", spec: "Intake 30 ft-lbs (25 alum); Balancer 60 OEM / 70–85 ARP; Flywheel 60 OEM / 65 ARP", source: "GM Service Manual / Edelbrock" }
      ],
      bom: [
        { cat: "Engine Block", part: "GM Gen-I SBC 350 4-Bolt Main Casting (2-pc seal ref #3970010 — NOT 1-pc #10243880) [EST price]", partNum: "GM Casting #3970010 (VERIFY)", priceEst: 850.00 },
        { cat: "Crankshaft", part: "Scat Forged 4340 3.480\" Stroke 2-Pc Seal Crank [EST price]", partNum: "MAKER-SUPPLIED PLACEHOLDER (Scat 4340 3.480\" SBC)", priceEst: 495.00 },
        { cat: "Connecting Rods", part: "Scat Forged 4340 H-Beam 5.700\" Rods (Verify 3/8\" vs 7/16\" cap screws) [EST price]", partNum: "MAKER-SUPPLIED PLACEHOLDER (Scat 5.700\" H-Beam)", priceEst: 345.00 },
        { cat: "Pistons", part: "Keith Black Hypereutectic 4.000\" Flat-Top +5.0cc (UEM Catalog) [EST price]", partNum: "KB-115-000", priceEst: 360.00 },
        { cat: "Piston Rings", part: "Total Seal 4.000\" SBC Ring Set (Verify widths & SKU) [EST price]", partNum: "MAKER-SUPPLIED PLACEHOLDER (Total Seal 4.000\")", priceEst: 125.00 },
        { cat: "Cylinder Heads", part: "Edelbrock E-Street 64cc Alum 2.020\"/1.600\" Perf Heads (Qty 2; stock GM was 1.940\"/1.500\") [EST price]", partNum: "EDL-5089 (Qty 2)", priceEst: 1290.00 },
        { cat: "Head Gaskets", part: "Fel-Pro #1003 (0.041\" catalog; 0.039\" uses #1010/#7733PT-2 class) [EST price]", partNum: "FEL-1003 (Verify 0.041\" vs 0.039\")", priceEst: 98.00 },
        { cat: "Camshaft", part: "Comp Cams Xtreme Energy Hyd. Roller (CL12-422-8 is 218/224 XR270HR; verify 224/230 & retrofit lifters) [EST price]", partNum: "CCA-CL12-422-8 (Verify Grind)", priceEst: 489.00 },
        { cat: "Rockers", part: "Scorpion 1.5:1 Billet Rollers (7/16\" stud; stock #5089 heads use 3/8\" studs) [EST price]", partNum: "SCP-1024 (Verify Stud Size)", priceEst: 285.00 },
        { cat: "Oil Pump", part: "Melling M55HV High-Volume Oil Pump (Pickup sold per pan depth) [EST price]", partNum: "MEL-M55HV", priceEst: 84.00 },
        { cat: "Distributor", part: "MSD Pro-Billet Ready-to-Run SBC Distributor (Wires separate) [EST price]", partNum: "MSD-8360", priceEst: 420.00 },
        { cat: "Water Pump", part: "Edelbrock Victor Short Mechanical Alum SBC Water Pump [EST price]", partNum: "EDL-8810", priceEst: 185.00 },
        { cat: "Fuel Pump", part: "Holley 110 GPH Mechanical SBC Pump (6.5–8.0 PSI; regulate to 5.5–6.5 PSI) [EST price]", partNum: "HLY-12-327-11", priceEst: 129.00 },
        { cat: "Starter", part: "Powermaster MasterTorque Mini Starter 153/168T [EST price]", partNum: "PWM-9600", priceEst: 195.00 },
        { cat: "Alternator", part: "Powermaster 100A 1-Wire Alternator [EST price]", partNum: "PWM-17294", priceEst: 165.00 }
      ],
      estimatedFields: ["dynoSimulated", "deckClearance", "gasketThickness", "staticCR", "bomPrices"],
      measurementNeededFields: [
        "deckClearance", "gasketThickness", "chamberCc", "pistonReliefCc", "bearingClearances",
        "crankshaftEndPlay", "rodSideClearance", "runout", "valveLashPreload",
        "oilPumpPickupClearance", "starterPinionBacklash", "ringEndGap", "pinionAngle"
      ]
    },
    sbc_327: {
      id: "sbc_327",
      family: "GM Small-Block Gen I",
      make: "Chevrolet",
      name: "Chevrolet SBC 327 V8 (1962–69 — L79/L76 Perf Head Ref)",
      cylinders: 8,
      configuration: "V8",
      boreIn: 4.000,
      strokeIn: 3.250,
      displacementCid: calculateDisplacementCID(4.000, 3.250, 8), // 326.73 CID
      boreSpacingIn: 4.400,
      deckHeightIn: 9.025,
      rodLengthIn: 5.700,
      valvetrain: "OHV 2-Valve Pushrod",
      valveAngleDeg: 23,
      bankAngleDeg: 90,
      rockerRatio: 1.5,
      intakeValveIn: 2.020, // L79/L76 #461/#462 perf heads (base 327 used 1.940" or 1.720")
      exhaustValveIn: 1.600,
      firingOrder: "1-8-4-3-6-5-7-2",
      balance: "Internal / Neutral (2-pc rear seal)",
      induction: "4-BBL Carbureted",
      fuelSystem: "Holley / Rochester 4-BBL Carburetor",
      industryStandards: ["SAE J245 (Gross Era)", "GM / Chevrolet Chassis Service Manual (1962–69 327)", "Chevrolet Power Manual"],
      verified: true,
      dynoSimulated: { baseHp: 375, baseTq: 360, hpPeakRpm: 6200, tqPeakRpm: 4200, ve: 0.92, note: "[EST] Simulated estimate (OEM 327 SAE Gross ranged 250–375 HP across L30/L79/L76/L84)." },
      torqueSpecs: [
        { item: "Head Bolts (17-Bolt)", spec: "60–70 ft-lbs (65 nominal, wet thread sealant)", source: "GM Chassis Service Manual 1962–69" },
        { item: "Rod Bolts", spec: "30–35 ft-lbs (1962–67 11/32\" small-journal) / 45 ft-lbs (1968–69 3/8\" large-journal)", source: "GM Chassis Service Manual 1962–69" },
        { item: "Main Caps", spec: "65–75 ft-lbs (62–67) / 70–80 ft-lbs (68–69)", source: "GM Chassis Service Manual 1962–69" }
      ],
      bom: [],
      estimatedFields: ["dynoSimulated", "deckClearance", "gasketThickness", "chamberCc"],
      measurementNeededFields: ["deckClearance", "gasketThickness", "chamberCc", "bearingClearances", "crankshaftEndPlay", "runout"]
    },
    bbc_454: {
      id: "bbc_454",
      family: "GM Big-Block Mark IV",
      make: "Chevrolet",
      name: "Chevrolet Big-Block 454 V8 (Mark IV — LS6 Rect-Port Valve Ref)",
      cylinders: 8,
      configuration: "V8",
      boreIn: 4.250,
      strokeIn: 4.000,
      displacementCid: calculateDisplacementCID(4.250, 4.000, 8), // 453.96 CID
      boreSpacingIn: 4.840,
      deckHeightIn: 9.800,
      rodLengthIn: 6.135,
      valvetrain: "OHV 2-Valve Canted Pushrod",
      valveAngleDeg: 26,
      bankAngleDeg: 90,
      rockerRatio: 1.7,
      intakeValveIn: 2.190, // High-perf LS6 rect-port (oval-port passenger 454 = 2.060")
      exhaustValveIn: 1.880, // High-perf LS6 rect-port (oval-port passenger 454 = 1.720")
      firingOrder: "1-8-4-3-6-5-7-2",
      balance: "External Balance (454-specific counterweighted damper & flywheel)",
      induction: "4-BBL Carbureted",
      fuelSystem: "Quadrajet / Holley 4-BBL Carburetor",
      industryStandards: ["SAE J245 / SAE J1349", "GM / Chevrolet Service Manual (Mark IV BBC 454)", "Chevrolet Power Manual"],
      verified: true,
      dynoSimulated: { baseHp: 460, baseTq: 520, hpPeakRpm: 5400, tqPeakRpm: 3600, ve: 0.94, note: "[EST] Simulated estimate (1970 LS5 360 HP/500 TQ Gross; LS6 450 HP/500 TQ Gross)." },
      torqueSpecs: [
        { item: "Head Bolts (16-Bolt BBC)", spec: "80 ft-lbs w/ thread sealant on wet holes", source: "GM Mark IV Service Manual" },
        { item: "Rod Bolts", spec: "50 ft-lbs (3/8\" passenger) / 67–73 ft-lbs (7/16\" HP)", source: "GM Mark IV Service Manual" },
        { item: "Main Caps", spec: "105–110 ft-lbs (1/2\" inner/2-bolt) / 95 ft-lbs (7/16\" outer 4-bolt)", source: "GM Mark IV Service Manual" }
      ],
      bom: [],
      estimatedFields: ["dynoSimulated", "chamberCc", "deckClearance", "gasketThickness"],
      measurementNeededFields: ["deckClearance", "gasketThickness", "chamberCc", "pistonDomeCc", "bearingClearances", "crankshaftEndPlay", "runout"]
    },
    ls3_62: {
      id: "ls3_62",
      family: "GM LS Gen IV",
      make: "Chevrolet",
      name: "GM Gen-IV LS3 6.2L V8 (All-Aluminum)",
      cylinders: 8,
      configuration: "V8",
      boreIn: 4.065,
      strokeIn: 3.622,
      displacementCid: calculateDisplacementCID(4.065, 3.622, 8), // 376.04 CID
      boreSpacingIn: 4.400,
      deckHeightIn: 9.240,
      rodLengthIn: 6.098,
      valvetrain: "OHV 2-Valve Pushrod (Aluminum #821 68.4cc Heads)",
      valveAngleDeg: 15,
      bankAngleDeg: 90,
      rockerRatio: 1.7,
      intakeValveIn: 2.165,
      exhaustValveIn: 1.590,
      firingOrder: "1-8-7-2-6-5-4-3",
      balance: "Internal / Neutral Balance",
      induction: "Naturally Aspirated Composite 90mm DBW Plenum",
      fuelSystem: "Sequential Multi-Port Electronic Fuel Injection (MPFI)",
      industryStandards: ["SAE J1349", "GM Gen-IV Service Manual (6.2L LS3)", "Chevrolet Performance LS3 Crate Spec Sheet (68.4 cc #821 head, 10.7:1 CR)"],
      verified: true,
      dynoSimulated: { baseHp: 436, baseTq: 428, hpPeakRpm: 5900, tqPeakRpm: 4600, ve: 0.95, note: "[EST] Simulated curve matching C6 Corvette LS3 NPP SAE Net (436 HP / 428 TQ; standard LS3 = 430 HP / 424 TQ)." },
      clearancesAndVolumes: {
        chamberCc: "68.4 cc OEM #821 spec (corrected from 68.0) — NEEDING RAY'S MEASUREMENT on physical head",
        deckClearance: "NEEDING RAY'S MEASUREMENT (GM nominal -0.005\" proud)",
        gasketThickness: "NEEDING RAY'S MEASUREMENT (GM MLS nominal 0.051\")"
      },
      torqueSpecs: [
        { item: "Head Bolts (M11 TTY + M8)", spec: "M11: 22 ft-lbs + 90° + 90° (dry blind holes); M8: 22 ft-lbs", source: "GM Gen-IV Service Manual" },
        { item: "Main Caps (6-Bolt Cross-Bolted)", spec: "Inner M10: 15 ft-lbs + 80°; Outer M10: 15 ft-lbs + 51°; Side M8: 18 ft-lbs", source: "GM Gen-IV Service Manual" },
        { item: "Rod Bolts (M9 Cracked Cap TTY)", spec: "15 ft-lbs + 85°", source: "GM Gen-IV Service Manual" }
      ],
      bom: [],
      estimatedFields: ["dynoSimulated"],
      measurementNeededFields: ["deckClearance", "gasketThickness", "chamberCc", "bearingClearances", "crankshaftEndPlay", "runout"]
    },
    ford_302: {
      id: "ford_302",
      family: "Ford Small-Block Windsor",
      make: "Ford",
      name: "Ford 302 Small-Block Windsor V8",
      cylinders: 8,
      configuration: "V8",
      boreIn: 4.000,
      strokeIn: 3.000,
      displacementCid: calculateDisplacementCID(4.000, 3.000, 8), // 301.59 CID
      boreSpacingIn: 4.380,
      deckHeightIn: 8.206,
      rodLengthIn: 5.090,
      valvetrain: "OHV 2-Valve Pushrod",
      valveAngleDeg: 20,
      bankAngleDeg: 90,
      rockerRatio: 1.6,
      intakeValveIn: 1.780,
      exhaustValveIn: 1.450,
      firingOrder: "1-5-4-2-6-3-7-8",
      balance: "External Balance (28.2 oz-in 1968–80 / 50.0 oz-in 1981–2001)",
      induction: "Carbureted / SEFI (Model-Year Dependent)",
      fuelSystem: "Autolite/Holley Carburetor (1968–85) / SEFI (1986–2001)",
      industryStandards: ["SAE J245 / SAE J1349", "Ford Car Shop Manual (302 Windsor)", "Ford Racing SBF Technical Spec"],
      verified: true,
      dynoSimulated: { baseHp: 325, baseTq: 350, hpPeakRpm: 5500, tqPeakRpm: 3400, ve: 0.88, note: "[EST] Simulated performance estimate (OEM stock 302 was 210–250 HP Gross / 130–225 HP Net; Boss 302 290 HP Gross)." },
      torqueSpecs: [
        { item: "Head Bolts (10-Bolt Windsor)", spec: "65–72 ft-lbs in 3 steps (55, 65, 72; lower row wet sealant)", source: "Ford Car Shop Manual" },
        { item: "Main Caps", spec: "60–70 ft-lbs", source: "Ford Car Shop Manual" },
        { item: "Rod Bolts (5/16-24)", spec: "19–24 ft-lbs", source: "Ford Car Shop Manual" }
      ],
      bom: [],
      estimatedFields: ["dynoSimulated", "chamberCc", "deckClearance", "gasketThickness"],
      measurementNeededFields: ["deckClearance", "gasketThickness", "chamberCc", "pistonReliefCc", "bearingClearances", "crankshaftEndPlay", "runout"]
    },
    toyota_2jz: {
      id: "toyota_2jz",
      family: "Toyota JZ Inline-6",
      make: "Toyota",
      name: "Toyota 2JZ-GTE 3.0L Twin-Turbo Inline-6",
      cylinders: 6,
      configuration: "I6",
      boreIn: 3.386,
      strokeIn: 3.386,
      displacementCid: calculateDisplacementCID(3.386, 3.386, 6), // 182.94 CID (2,997 cc)
      boreSpacingIn: 3.661,
      deckHeightIn: 8.622,
      rodLengthIn: 5.590,
      valvetrain: "DOHC 24-Valve (4 Valves/Cyl)",
      valveAngleDeg: 22.5,
      bankAngleDeg: 0,
      intakeValveIn: 1.319,
      exhaustValveIn: 1.142,
      firingOrder: "1-5-3-6-2-4",
      balance: "Internal / Neutral Balance",
      induction: "Sequential Twin-Turbocharged + Intercooler",
      fuelSystem: "Toyota Sequential Electronic Multi-Port Fuel Injection",
      industryStandards: ["SAE J1349 / JIS D 1001", "Toyota Supra JZA80 Repair Manual", "Toyota MVMA Specifications (86x86mm, 142mm rod, 219mm deck, 93mm spacing)"],
      verified: true,
      dynoSimulated: { baseHp: 320, baseTq: 315, hpPeakRpm: 5800, tqPeakRpm: 3800, ve: 1.15, note: "[EST] Simulated curve matching USDM SAE Net rating (320 HP @ 5600 / 315 lb-ft @ 4000)." },
      torqueSpecs: [
        { item: "Head Bolts (14-Bolt M11)", spec: "36 ft-lbs (49 N·m) + 90° + 90°", source: "Toyota Supra JZA80 Repair Manual" },
        { item: "Main Bearing Caps (M12)", spec: "32 ft-lbs (44 N·m) + 90°", source: "Toyota Supra JZA80 Repair Manual" },
        { item: "Connecting Rod Caps (M9)", spec: "22 ft-lbs (29 N·m) + 90°", source: "Toyota Supra JZA80 Repair Manual" }
      ],
      bom: [],
      estimatedFields: ["dynoSimulated", "chamberCc", "deckClearance", "gasketThickness"],
      measurementNeededFields: ["deckClearance", "gasketThickness", "chamberCc", "pistonDishCc", "bearingClearances", "crankshaftEndPlay", "valveLash", "runout"]
    },
    nissan_l24: {
      id: "nissan_l24",
      family: "Nissan L-Series Inline-6",
      make: "Nissan / Datsun",
      name: "Datsun / Nissan L24 2.4L SOHC Inline-6 (240Z OEM)",
      cylinders: 6,
      configuration: "I6",
      boreIn: 3.268, // 83.0 mm (Datsun 240Z FSM)
      strokeIn: 2.902, // 73.7 mm (Datsun 240Z FSM)
      displacementCid: calculateDisplacementCID(3.268, 2.902, 6), // 146.06 CID (2,393 cc)
      valvetrain: "SOHC 12-Valve",
      bankAngleDeg: 0,
      firingOrder: "1-5-3-6-2-4",
      balance: "Internal / Neutral Balance",
      induction: "Twin Hitachi SU-Type Side-Draft Carburetors",
      fuelSystem: "Dual Side-Draft Constant-Depression Carburetors",
      industryStandards: ["SAE J245 / JIS D 1001", "Nissan / Datsun 240Z Factory Service Manual (1970–73 L24 83.0x73.7 mm, 151 HP SAE Gross)"],
      verified: true,
      dynoSimulated: { baseHp: 151, baseTq: 146, hpPeakRpm: 5600, tqPeakRpm: 4400, ve: 0.85, note: "[EST] Simulated curve from USDM 1970–71 L24 SAE Gross rating (151 HP / 146 TQ)." },
      torqueSpecs: [
        { item: "Head / Main / Rod Fasteners", spec: "Verify exact L24 bolt stage torques in Datsun 240Z FSM", source: "Datsun 240Z Factory Service Manual" }
      ],
      bom: [],
      estimatedFields: ["dynoSimulated"],
      measurementNeededFields: ["boreSpacingIn", "deckHeightIn", "rodLengthIn", "deckClearance", "gasketThickness", "chamberCc", "valveLash", "bearingClearances", "runout"]
    }
  },
  transmissions: {
    powerglide: { id: "powerglide", code: "Powerglide", type: "automatic", gears: 2, bellhousingPattern: "GM_Chevy_V8", lengthIn: 27.6, verified: true, ratios: [1.76, 1.00], reverseRatio: 1.76, tunnelFitment: "NEEDING RAY'S MEASUREMENT (Short-tail ~27.6\")", sources: ["GM Service Manual", "TCI Spec"] },
    th350: { id: "th350", code: "TH350", type: "automatic", gears: 3, bellhousingPattern: "GM_Chevy_V8", lengthIn: 27.6, verified: true, ratios: [2.52, 1.52, 1.00], reverseRatio: 1.93, tunnelFitment: "NEEDING RAY'S MEASUREMENT (Short 6\" tail ~27.6\")", serviceNotes: "Reverse corrected from 2.07 to 1.93 per GM / ATSG THM 350 Manual.", sources: ["GM Service Manual", "ATSG THM 350 Manual"] },
    th400: { id: "th400", code: "TH400", type: "automatic", gears: 3, bellhousingPattern: "GM_Chevy_V8", lengthIn: 28.4, verified: true, ratios: [2.48, 1.48, 1.00], reverseRatio: 2.08, tunnelFitment: "NEEDING RAY'S MEASUREMENT (Short 4\" tail ~28.4\")", sources: ["GM Service Manual", "TCI Spec"] },
    r2004r: { id: "r2004r", code: "200-4R", type: "automatic", gears: 4, bellhousingPattern: "GM_Dual_BOP_Chevy", lengthIn: 27.7, verified: true, ratios: [2.74, 1.57, 1.00, 0.67], reverseRatio: 2.07, tunnelFitment: "NEEDING RAY'S MEASUREMENT (OAL ~27.7\")", sources: ["GM / ATSG THM 200-4R Manual"] },
    r7004: { id: "r7004", code: "700R4 / 4L60", type: "automatic", gears: 4, bellhousingPattern: "GM_Chevy_V8", lengthIn: 30.7, verified: true, ratios: [3.06, 1.63, 1.00, 0.70], reverseRatio: 2.29, tunnelFitment: "NEEDING RAY'S MEASUREMENT (OAL ~30.7\")", sources: ["GM / ATSG THM 700-R4 Manual"] },
    r4l60e: { id: "r4l60e", code: "4L60E", type: "automatic", gears: 4, bellhousingPattern: "GM_Chevy_V8", verified: true, ratios: [3.06, 1.63, 1.00, 0.70], reverseRatio: 2.29, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn (varies by 1-pc/2-pc bellhousing & 2WD/4WD tail)"], sources: ["GM Service Manual"] },
    r4l80e: { id: "r4l80e", code: "4L80E", type: "automatic", gears: 4, bellhousingPattern: "GM_Chevy_V8", verified: true, ratios: [2.48, 1.48, 1.00, 0.75], reverseRatio: 2.08, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn (varies by tailhousing)"], sources: ["GM Service Manual"] },
    r6l80e: { id: "r6l80e", code: "6L80E", type: "automatic", gears: 6, bellhousingPattern: "GM_LS_Modular", verified: true, ratios: [4.03, 2.36, 1.53, 1.15, 0.85, 0.67], reverseRatio: 3.06, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["GM Hydra-Matic 6L80 Spec Sheet"] },
    r10l90: { id: "r10l90", code: "10L90", type: "automatic", gears: 10, bellhousingPattern: "GM_LS_Modular", verified: true, ratios: [4.70, 2.99, 2.15, 1.80, 1.52, 1.28, 1.00, 0.85, 0.69, 0.64], reverseRatio: 4.87, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["GM Hydra-Matic 10L90 Spec Sheet"] },
    allison_1000: { id: "allison_1000", code: "Allison 1000", type: "automatic", gears: 6, bellhousingPattern: "GM_Chevy_V8", verified: true, ratios: [3.10, 1.81, 1.41, 1.00, 0.71, 0.61], reverseRatio: 4.49, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["Allison 1000/2000 Spec Sheet"] },
    ford_c4: { id: "ford_c4", code: "Ford C4", type: "automatic", gears: 3, bellhousingPattern: "Ford_SBF_6Bolt", verified: true, ratios: [2.46, 1.46, 1.00], reverseRatio: 2.20, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn (case-fill vs pan-fill)"], sources: ["Ford Car Shop Manual"] },
    ford_c6: { id: "ford_c6", code: "Ford C6", type: "automatic", gears: 3, bellhousingPattern: "Ford_SBF_6Bolt", verified: true, ratios: [2.46, 1.46, 1.00], reverseRatio: 2.18, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["Ford Shop Manual"] },
    ford_aod: { id: "ford_aod", code: "Ford AOD", type: "automatic", gears: 4, bellhousingPattern: "Ford_SBF_6Bolt", verified: true, ratios: [2.40, 1.47, 1.00, 0.67], reverseRatio: 2.00, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["Ford Service Manual"] },
    ford_10r80: { id: "ford_10r80", code: "Ford 10R80", type: "automatic", gears: 10, bellhousingPattern: "Ford_Coyote_Modular", verified: true, ratios: [4.70, 2.99, 2.15, 1.80, 1.52, 1.28, 1.00, 0.85, 0.69, 0.64], reverseRatio: 4.87, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["Ford 10R80 Spec Sheet"] },
    ford_6r140: { id: "ford_6r140", code: "TorqShift 6R140", type: "automatic", gears: 6, bellhousingPattern: "Ford_Modular_Diesel", verified: true, ratios: [3.97, 2.32, 1.52, 1.15, 0.86, 0.67], reverseRatio: 3.13, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["Ford Super Duty 6R140 Spec Sheet"] },
    mopar_727: { id: "mopar_727", code: "TorqueFlite A-727", type: "automatic", gears: 3, bellhousingPattern: "Chrysler_RB_Hemi", verified: true, ratios: [2.45, 1.45, 1.00], reverseRatio: 2.20, tunnelFitment: "NEEDING RAY'S MEASUREMENT", serviceNotes: "Reverse corrected from 2.22 to 2.20 per Chrysler Service Manual / ATSG A-727.", measurementNeededFields: ["lengthIn"], sources: ["Chrysler Service Manual", "ATSG A-727 Manual"] },
    mopar_a500_42re: { id: "mopar_a500_42re", code: "A500 / 42RE", type: "automatic", gears: 4, bellhousingPattern: "Chrysler_LA_Magnum", verified: true, ratios: [2.74, 1.54, 1.00, 0.69], reverseRatio: 2.21, tunnelFitment: "NEEDING RAY'S MEASUREMENT", serviceNotes: "42RE front (kickdown) band adjustment: 72 in-lbs backed off 3 turns (NOT 2-1/4 turns).", measurementNeededFields: ["lengthIn"], sources: ["Chrysler Service Manual", "ATSG A500/42RE Manual"] },
    mopar_8hp70: { id: "mopar_8hp70", code: "TorqueFlite 8HP70", type: "automatic", gears: 8, bellhousingPattern: "Chrysler_Gen3_Hemi", verified: true, ratios: [4.71, 3.14, 2.10, 1.67, 1.29, 1.00, 0.84, 0.67], reverseRatio: 3.32, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["ZF 8HP70 Technical Spec Sheet"] },
    muncieM20: { id: "muncieM20", code: "Muncie M20", type: "manual", gears: 4, bellhousingPattern: "GM_Chevy_V8", lengthIn: 21.5, verified: true, ratios: [2.52, 1.88, 1.46, 1.00], reverseRatio: 2.59, tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["GM Service Manual (1966–74 M20)"] },
    muncieM21: { id: "muncieM21", code: "Muncie M21", type: "manual", gears: 4, bellhousingPattern: "GM_Chevy_V8", lengthIn: 21.5, verified: true, ratios: [2.20, 1.64, 1.28, 1.00], reverseRatio: 2.27, tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["GM Service Manual"] },
    muncieM22: { id: "muncieM22", code: "Muncie M22", type: "manual", gears: 4, bellhousingPattern: "GM_Chevy_V8", lengthIn: 21.5, verified: true, ratios: [2.20, 1.64, 1.28, 1.00], reverseRatio: 2.27, tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["GM Service Manual"] },
    super_t10: { id: "super_t10", code: "Super T-10", type: "manual", gears: 4, bellhousingPattern: "GM_Chevy_V8", verified: true, ratios: [2.64, 1.75, 1.34, 1.00], tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["Borg-Warner / GM Service Manual"] },
    ford_toploader: { id: "ford_toploader", code: "Ford Toploader", type: "manual", gears: 4, bellhousingPattern: "Ford_SBF_6Bolt", verified: true, ratios: [2.32, 1.69, 1.29, 1.00], reverseRatio: 2.32, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn (Mustang 24\" vs Galaxie 27\" tail)"], sources: ["Ford Shop Manual (Close-Ratio Toploader)"] },
    mopar_a833: { id: "mopar_a833", code: "Chrysler A-833", type: "manual", gears: 4, bellhousingPattern: "Chrysler_RB_Hemi", verified: true, ratios: [2.65, 1.93, 1.39, 1.00], reverseRatio: 2.57, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn (A-body vs B/E-body tail)"], sources: ["Chrysler Service Manual (18-Spline Hemi A-833)"] },
    tremecT5: { id: "tremecT5", code: "Tremec T5 WC", type: "manual", gears: 5, bellhousingPattern: "GM_Chevy_V8", verified: true, ratios: [2.95, 1.94, 1.34, 1.00, 0.63], reverseRatio: 2.76, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["Borg-Warner / Tremec T5 WC Spec Sheet"] },
    tremec_tkx: { id: "tremec_tkx", code: "Tremec TKX", type: "manual", gears: 5, bellhousingPattern: "GM_Chevy_V8", lengthIn: 24.2, verified: true, ratios: [2.87, 1.89, 1.28, 1.00, 0.68], reverseRatio: 2.56, tunnelFitment: "NEEDING RAY'S MEASUREMENT (Tremec OAL 24.16\" ex-bellhousing)", sources: ["Tremec TKX Spec Sheet"] },
    tremec_tko600: { id: "tremec_tko600", code: "Tremec TKO 600", type: "manual", gears: 5, bellhousingPattern: "GM_Chevy_V8", lengthIn: 25.1, verified: true, ratios: [2.87, 1.89, 1.28, 1.00, 0.64], reverseRatio: 2.56, tunnelFitment: "NEEDING RAY'S MEASUREMENT (Tremec OAL 25.06\" ex-bellhousing)", sources: ["Tremec TKO 600 Spec Sheet"] },
    tremecT56: { id: "tremecT56", code: "Tremec T56 Magnum", type: "manual", gears: 6, bellhousingPattern: "GM_Chevy_V8", lengthIn: 32.5, verified: true, ratios: [2.66, 1.78, 1.30, 1.00, 0.80, 0.63], reverseRatio: 2.90, tunnelFitment: "NEEDING RAY'S MEASUREMENT (Tremec OAL ~32.5\" w/ bellhousing)", sources: ["Tremec T56 Magnum Spec Sheet"] },
    nissan_cd009: { id: "nissan_cd009", code: "Nissan CD009", type: "manual", gears: 6, bellhousingPattern: "Nissan_VQ_Block", verified: true, ratios: [3.79, 2.32, 1.62, 1.27, 1.00, 0.79], reverseRatio: 3.45, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["Nissan Z33 Service Manual"] },
    toyota_v160: { id: "toyota_v160", code: "Getrag V160", type: "manual", gears: 6, bellhousingPattern: "Toyota_JZ_Block", verified: true, ratios: [3.83, 2.36, 1.69, 1.31, 1.00, 0.79], reverseRatio: 3.28, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["Toyota Supra JZA80 Repair Manual"] },
    datsun_f4w71: { id: "datsun_f4w71", code: "F4W71A / F4W71B", type: "manual", gears: 4, bellhousingPattern: "Nissan_L_Series", verified: true, tunnelFitment: "NEEDING RAY'S MEASUREMENT (OEM 240Z S30 gearbox)", measurementNeededFields: ["lengthIn", "ratios (verify 1970–73 F4W71A vs 71B chart)"], sources: ["Datsun 240Z Factory Service Manual"] },
    zf_8hp70_universal: { id: "zf_8hp70_universal", code: "ZF 8HP70", type: "automatic", gears: 8, bellhousingPattern: "Universal_Adapter_Plate", verified: true, ratios: [4.71, 3.14, 2.10, 1.67, 1.29, 1.00, 0.84, 0.67], reverseRatio: 3.32, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["ZF 8HP70 Technical Spec Sheet"] },
    subaru_ty85_6mt: { id: "subaru_ty85_6mt", code: "Subaru TY85", type: "manual", gears: 6, bellhousingPattern: "Subaru_EJ_FA_Boxer", verified: true, ratios: [3.64, 2.24, 1.52, 1.14, 0.89, 0.76], reverseRatio: 3.54, tunnelFitment: "NEEDING RAY'S MEASUREMENT", measurementNeededFields: ["lengthIn"], sources: ["Subaru WRX STI Service Manual"] },
    vw_dsg_dq381: { id: "vw_dsg_dq381", code: "VW DQ381 DSG", type: "dct", gears: 7, bellhousingPattern: "VW_Audi_Transverse", verified: true, ratios: [3.40, 2.75, 1.77, 0.92, 0.70, 0.76, 0.64], tunnelFitment: "NEEDING RAY'S MEASUREMENT (Transverse transaxle)", measurementNeededFields: ["lengthIn"], sources: ["VW Self-Study Program DQ381"] },
    getrag_dct_7: { id: "getrag_dct_7", code: "Getrag 7DCL750", type: "dct", gears: 7, bellhousingPattern: "Exotic_DCT_Transaxle", verified: true, ratios: [3.08, 2.18, 1.63, 1.29, 1.03, 0.84, 0.69], tunnelFitment: "NEEDING RAY'S MEASUREMENT (Rear transaxle)", measurementNeededFields: ["lengthIn"], sources: ["Getrag 7DCL750 Technical Spec"] }
  },
  vehicles: [
    { id: "camaro1969", make: "Chevrolet", model: "Camaro (1st Gen SS 350 / 327)", yearStart: 1967, yearEnd: 1969, engineIds: ["sbc_327", "sbc_350_ray"], transmissionIds: ["powerglide", "th350", "th400", "muncieM20", "muncieM21", "muncieM22"], drivetrain: ["RWD"], chassisCode: "1st Gen F-Body", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["Chevrolet Camaro Assembly & Chassis Manuals 1967–69"] },
    { id: "camaro1979", make: "Chevrolet", model: "Camaro (2nd Gen Z28 / LT 350)", yearStart: 1970, yearEnd: 1981, engineIds: ["sbc_350_ray"], transmissionIds: ["th350", "th400", "muncieM20", "muncieM21", "muncieM22", "super_t10"], drivetrain: ["RWD"], chassisCode: "2nd Gen F-Body", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["Chevrolet Camaro Chassis Service Manuals 1970–81"] },
    { id: "camaro1988", make: "Chevrolet", model: "Camaro IROC-Z / Z28 (3rd Gen L98 350)", yearStart: 1987, yearEnd: 1992, engineIds: ["sbc_350_ray"], transmissionIds: ["r7004"], drivetrain: ["RWD"], chassisCode: "3rd Gen F-Body (L98 350 auto-only OEM)", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["GM F-Body Service Manuals 1987–92"] },
    { id: "chevelle1970", make: "Chevrolet", model: "Chevelle SS 350 / SS 454", yearStart: 1970, yearEnd: 1972, engineIds: ["sbc_350_ray", "bbc_454"], transmissionIds: ["th350", "th400", "muncieM20", "muncieM21", "muncieM22"], drivetrain: ["RWD"], chassisCode: "2nd Gen A-Body", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["GM Chevelle Service Manuals 1970–72"] },
    { id: "corvette1969", make: "Chevrolet", model: "Corvette C3 (350)", yearStart: 1969, yearEnd: 1982, engineIds: ["sbc_350_ray"], transmissionIds: ["th350", "th400", "r7004", "muncieM20", "muncieM21", "muncieM22", "super_t10"], drivetrain: ["RWD"], chassisCode: "C3 Y-Body (700R4 in 1982)", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["Chevrolet Corvette Service Manuals 1969–82"] },
    { id: "corvette_1970_454", make: "Chevrolet", model: "Corvette C3 (454 Big-Block)", yearStart: 1970, yearEnd: 1974, engineIds: ["bbc_454"], transmissionIds: ["th400", "muncieM20", "muncieM21", "muncieM22", "super_t10"], drivetrain: ["RWD"], chassisCode: "C3 Y-Body", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["Chevrolet Corvette Service Manuals 1970–74"] },
    { id: "corvette_c6_ls3", make: "Chevrolet", model: "Corvette C6 (LS3 6.2L)", yearStart: 2008, yearEnd: 2013, engineIds: ["ls3_62"], transmissionIds: ["r6l80e"], drivetrain: ["RWD"], chassisCode: "C6 Y-Body (6L80 transaxle / TR-6060 6MT OEM)", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["GM Corvette Y-Body Service Manual 2008–13"] },
    { id: "c10truck", make: "Chevrolet", model: "C10 / K10 Squarebody Pickup", yearStart: 1973, yearEnd: 1987, engineIds: ["sbc_350_ray", "bbc_454"], transmissionIds: ["th350", "th400", "r7004"], drivetrain: ["RWD", "4WD"], chassisCode: "3rd Gen C/K (C10 454 was 1973–78; C20/C30 thru 1987)", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["GM C/K Truck Service Manuals 1973–87"] },
    { id: "mustang1967", make: "Ford", model: "Mustang (302 Windsor)", yearStart: 1968, yearEnd: 1973, engineIds: ["ford_302"], transmissionIds: ["ford_c4", "ford_toploader"], drivetrain: ["RWD"], chassisCode: "1st Gen (302 introduced 1968)", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["Ford Mustang Car Shop Manuals 1968–73"] },
    { id: "supra1994", make: "Toyota", model: "Supra Twin-Turbo (JZA80)", yearStart: 1993, yearEnd: 2002, engineIds: ["toyota_2jz"], transmissionIds: ["toyota_v160"], drivetrain: ["RWD"], chassisCode: "A80 JZA80", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["Toyota Supra JZA80 Repair Manual"] },
    { id: "datsun240z", make: "Nissan", model: "Datsun 240Z (S30 L24)", yearStart: 1969, yearEnd: 1973, engineIds: ["nissan_l24"], transmissionIds: ["datsun_f4w71"], drivetrain: ["RWD"], chassisCode: "S30 Fairlady Z", tunnelFitment: "NEEDING RAY'S MEASUREMENT", sources: ["Datsun 240Z Factory Service Manual"] }
  ]
};

export const POWERTRAIN_LIBRARY_VALIDATION_ERRORS = validateLibrary(POWERTRAIN_LIBRARY);