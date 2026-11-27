export type AssemblyId =
  | 'sbc350'
  | 'hx900'
  | 'ares4'
  | 'sbc350_v8'
  | 'transmission_t56'
  | 'ev_axial_drive'
  | 'monoblock_brake'
  | 'active_aero_chassis'
  | 'custom_build';

export type MaterialId =
  | 'ti_6al4v'
  | 'al_7075'
  | 'al_6061_t6'
  | 'al_356_t6'
  | 'magnesium_az91d'
  | 'cast_iron_gray'
  | 'chromoly_4130'
  | 'forged_4340'
  | 'carburized_9310'
  | 'inconel_718'
  | 'cfrp_t800'
  | 'forged_carbon_smc'
  | 'carbon_ceramic_sic'
  | 'peek_cf30'
  | 'kevlar_aramid'
  | 'automotive_paint_gloss'
  | 'vulcanized_rubber'
  | 'sapphire_glass'
  | 'chevy_orange_enamel'
  | 'polished_billet_al';

export type SubsystemKey = 'airframe' | 'wings' | 'propulsion' | 'internal';

export type EnvironmentId = 'studio' | 'stratosphere' | 'wind_tunnel' | 'night_apron';

export type CameraPresetId =
  | 'iso'
  | 'hero_nose'
  | 'wingtip'
  | 'intake'
  | 'top'
  | 'side'
  | 'cutaway';

export type ActionSequenceId = 'none' | 'turntable' | 'climb' | 'exploded_sweep' | 'flyby';

export type ViewMode =
  | 'studio'
  | 'builder'
  | 'matrix'
  | 'drawing'
  | 'specs'
  | 'gallery'
  | 'dyno'
  | 'catalog'
  | 'powertrain'
  | 'futuredraw'
  | 'automatrix'
  | 'engineblock';

/** Adjustable live-readout preferences: which telemetry fields the HUD shows, units, render quality. */
export type DisplayUnits = 'imperial' | 'metric';
export type RenderQuality = 1 | 1.5 | 2;

export interface DisplayPrefs {
  showRpm: boolean;
  showHpTq: boolean;
  showCrank: boolean;
  showFiring: boolean;
  showPiston: boolean;
  showValve: boolean;
  showDeck: boolean;
  units: DisplayUnits;
  quality: RenderQuality;
}

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  showRpm: true,
  showHpTq: true,
  showCrank: true,
  showFiring: true,
  showPiston: true,
  showValve: true,
  showDeck: true,
  units: 'imperial',
  quality: 2,
};

export type RenderOverlayMode = 'pbr' | 'wireframe' | 'xray' | 'thermal';

export type CamStrategyId =
  | 'adaptive_roughing'
  | 'helical_bore'
  | 'swarf_finishing'
  | 'lpbf_additive';

export interface CamSimulationConfig {
  enabled: boolean;
  showStockEnvelope: boolean;
  strategy: CamStrategyId;
  feedOverridePct: number; // 50 to 150
}

export interface CadEnvelopeMm {
  x: number;
  y: number;
  z: number;
}

export interface ParametricConfig {
  wingspanM: number;       // Span / width / rotor diameter (m)
  sweepDeg: number;        // Sweep / valve angle / camber / rake (deg)
  fuselageLengthM: number; // Overall axial length (m)
  nacelleScale: number;    // Scale multiplier (0.75 - 1.35)
  skinGaugeMm: number;     // Structural wall/skin thickness (mm)
  ribDensity: number;      // Internal ribs / stages / cooling fins / bolts
  bypassRatio: number;     // Bypass ratio / compression / gear ratio
  exploded: number;        // 0.0 to 1.0 assembly separation
  sectionCutX: number;     // -1.0 (off) to 1.0 longitudinal/axial slice plane
}

export type SubsystemMaterials = Record<SubsystemKey, MaterialId>;

export type MaterialSurfacePattern =
  | 'brushed'
  | 'carbon'
  | 'forged_carbon'
  | 'polymer'
  | 'riveted'
  | 'ceramic'
  | 'ceramic_brake'
  | 'heat_tinted'
  | 'cast_iron'
  | 'machined_steel'
  | 'kevlar'
  | 'paint_metallic'
  | 'rubber';

export interface AerospaceMaterialSpec {
  id: MaterialId;
  name: string;
  designation: string;
  category:
    | 'Titanium Alloy'
    | 'Aluminum Alloy'
    | 'Magnesium Alloy'
    | 'Ferrous & Billet Steel'
    | 'Nickel Superalloy'
    | 'Thermoset Composite'
    | 'Ceramic Matrix'
    | 'Recyclable Polymer'
    | 'Aramid Fiber'
    | 'Coating & Elastomer'
    | 'Optical Ceramic';
  densityGCm3: number;
  yieldStrengthMPa: number;
  youngsModulusGPa: number;
  maxServiceTempC: number;
  thermalConductivityWMK: number;
  recyclabilityPct: number;
  embodiedCo2KgPerKg: number;
  recyclingMethod: string;
  sourceOrigin: string;
  colorHex: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  anisotropy: number;
  iridescence: number;
  pattern: MaterialSurfacePattern;
}

export interface AssemblyProfile {
  id: AssemblyId;
  domain: 'aerospace' | 'automotive';
  code: string;
  name: string;
  classification: string;
  role: string;
  defaults: ParametricConfig;
  defaultMaterials: SubsystemMaterials;
  bounds: {
    wingspanMin: number;
    wingspanMax: number;
    wingspanLabel: string;
    sweepMin: number;
    sweepMax: number;
    sweepLabel: string;
    lengthMin: number;
    lengthMax: number;
    lengthLabel: string;
  };
  partDescriptions: Record<
    SubsystemKey,
    { label: string; volumeSharePct: number; baselineVolumeM3: number }
  >;
}

export interface BomRow {
  partNumber: string;
  subsystem: SubsystemKey;
  componentName: string;
  materialName: string;
  materialDesignation: string;
  massKg: number;
  safetyFactor: number;
  maxTempC: number;
  recyclabilityPct: number;
  co2eKg: number;
  unitCostUsd: number;
}

export interface ComputedSpecs {
  emptyMassKg: number;
  fuelPayloadKg: number;
  mtowKg: number;
  wingAreaM2: number;
  aspectRatio: number;
  wingLoadingKgM2: number;
  totalThrustKN: number;
  thrustToWeight: number;
  cruiseMach: number;
  maxVelocityKts: number;
  serviceCeilingFt: number;
  rangeNm: number;
  cgStationM: number;
  finenessRatio: number;
  structuralSafetyFactor: number;
  thermalMarginC: number;
  compositeRecyclabilityPct: number;
  totalEmbodiedCo2Kg: number;
  tsfcKgKNH: number;
  estimatedUnitCostUsd: number;
  bom: BomRow[];
}

export interface InspectedPart {
  partName: string;
  partCode: string;
  subsystem: SubsystemKey;
  materialId: MaterialId;
  massSharePct: number;
}

export interface CapturedShot {
  id: string;
  title: string;
  timestamp: string;
  assemblyId: AssemblyId;
  assemblyName: string;
  environment: EnvironmentId;
  cameraPreset: string;
  resolution: string;
  dataUrl: string;
  machLabel: string;
  massLabel: string;
}

// Custom Design Studio Builder Types
export type CustomChassisStyle =
  | 'ladder_perimeter'
  | 'tubular_spaceframe'
  | 'carbon_monocoque'
  | 'ev_skateboard';

export type CustomPowertrainType =
  | 'v8_ohv'
  | 'inline6_dohc'
  | 'flat6_boxer'
  | 'axial_flux_ev';

export type CustomTransmissionType =
  | 'manual_6spd_t56'
  | 'auto_8hp'
  | 'dct_8spd_transaxle'
  | 'ev_planetary_reducer';

export type CustomSuspensionType =
  | 'double_wishbone'
  | 'macpherson_billet'
  | 'pushrod_inboard';

export type CustomAeroPackage =
  | 'none'
  | 'ducktail_lip'
  | 'gt_drs_swan_neck'
  | 'venturi_diffuser';

export type CustomToleranceClass =
  | 'iso_2768_mk'
  | 'iso_2768_fh'
  | 'asme_y14_5_precision'
  | 'agma_q12_motorsport';

export interface CustomDesignConfig {
  buildName: string;
  applicationProfile:
    | 'Street Restomod'
    | 'FIA GT3 Track'
    | 'Drag / Strip 2000HP'
    | '900V EV Hypercar'
    | 'OEM Series Production';
  unitSystem: 'mm' | 'in';
  showDatums: boolean;

  // 1. Chassis & Layout
  chassisStyle: CustomChassisStyle;
  wheelbaseMm: number;      // 2200 - 3300 mm
  trackWidthMm: number;     // 1400 - 1860 mm
  railGaugeMm: number;      // 2.0 - 8.0 mm
  chassisMaterial: MaterialId;

  // 2. Powertrain & Engine Mount Datums
  powertrainType: CustomPowertrainType;
  engineSetbackMm: number;  // Offset behind front axle centerline (0 - 650 mm)
  crankHeightMm: number;    // Above ground datum (260 - 460 mm)
  boreMm: number;           // 78 - 110 mm
  strokeMm: number;         // 70 - 108 mm
  bankAngleDeg: number;     // 0 (inline), 90 (V8), 180 (flat)
  engineBlockMaterial: MaterialId;
  cylinderHeadMaterial: MaterialId;
  exhaustMaterial: MaterialId;

  // 3. Transmission & Bellhousing Mate Alignment
  transmissionType: CustomTransmissionType;
  bellhousingOffsetMm: number; // Axial mate delta from Datum B (-15 to +15 mm; 0 = flush mate)
  gearboxLengthMm: number;     // 520 - 940 mm
  gearHelixDeg: number;        // 12 - 30 deg
  firstGearRatio: number;      // 2.10 - 4.71
  transmissionMaterial: MaterialId;

  // 4. Brakes, Hubs & Suspension Pickups
  brakeRotorDiaMm: number;  // 310 - 420 mm
  caliperPistons: 4 | 6 | 8;
  suspensionType: CustomSuspensionType;
  rotorMaterial: MaterialId;
  caliperMaterial: MaterialId;
  uprightMaterial: MaterialId;

  // 5. Aerodynamics & Rear Hardpoints
  aeroPackage: CustomAeroPackage;
  wingSpanMm: number;       // 1350 - 2100 mm
  wingAngleDeg: number;     // 0 - 30 deg
  aeroMaterial: MaterialId;

  // 6. GD&T Tolerance Class
  toleranceClass: CustomToleranceClass;
}

export interface AttachmentDatumSpec {
  id: string;
  name: string;
  interfaceType: string;
  coordsMm: [number, number, number]; // [X, Y, Z]
  fastenerOrPilot: string;
  toleranceSpec: string;
  mateErrorMm: number;
  aligned: boolean;
}

export interface CustomDesignTelemetry {
  totalMassKg: number;
  frontWeightPct: number;
  rearWeightPct: number;
  displacementCc: number;
  estPowerHp: number;
  estTorqueNm: number;
  totalCostUsd: number;
  torsionalStiffnessNmDeg: number;
  safetyFactor: number;
  overallAligned: boolean;
  datums: AttachmentDatumSpec[];
}

// Automotive Liberty CAD/CAM Matrix Types
export type MatrixCategoryTab =
  | 'all'
  | 'powertrain'
  | 'transmission'
  | 'chassis'
  | 'future_tech';

export type MatrixPageTab =
  | 'vehicles'
  | 'global_parts'
  | 'drivetrain_stds'
  | 'tolerances'
  | 'codes_tools';

export type GlobalRegion = 'North America' | 'Europe' | 'Asia-Pacific' | 'Global';

export type AutomotiveEra =
  | 'Brass & Pre-War (1908–1949)'
  | 'Classic & Muscle (1950–1979)'
  | 'Group A / Golden Era (1980–2004)'
  | 'Modern Supercar (2005–2021)'
  | '800V–900V Next-Gen (2022–2026)';

export type ProductionBatchTier = 'prototype' | 'low_volume' | 'series';
export type ToleranceStandard = 'iso_medium' | 'precision_cnc' | 'motorsport_ultra';

export interface AutomotivePartSpec {
  id: string;
  partNumber: string;
  oemReference: string;
  name: string;
  category: Exclude<MatrixCategoryTab, 'all'>;
  subsystem: SubsystemKey;
  linkedAssemblyId: AssemblyId;
  materialId: MaterialId;
  manufacturingProcess: string;
  camToolpath: string;
  toleranceSpec: string;
  nominalDimensionMm: string;
  cycleTimeMin: number;
  leadTimeDays: number;
  massKg: number;
  unitCostUsd: number;
  toolingCostUsd: number;
  horsepowerRating?: string;
  torqueOrLoadRating: string;
  futureTechTrl?: string;
  isFutureTech: boolean;
  dataSource: string;
}

export interface GlobalSupplierPart {
  id: string;
  region: GlobalRegion;
  country: string;
  supplier: string;
  partNumber: string;
  category: 'Engine & Rotating' | 'Transmission & Diff' | 'Brakes & Hubs' | 'Suspension & Chassis' | 'Aero & Composites' | 'EV & Controls';
  name: string;
  compatibleVehicles: string;
  materialId: MaterialId;
  exactDimensionsMm: string;
  attachmentInterface: string;
  toleranceStandard: string;
  massKg: number;
  unitCostUsd: number;
  leadTimeDays: number;
  linkedAssemblyId: AssemblyId;
  builderPatch?: Partial<CustomDesignConfig>;
  dataSource: string;
}

export interface AutomotiveVehicleEntry {
  id: string;
  year: number;
  make: string;
  model: string;
  trimCode: string;
  platform: string;
  region: Exclude<GlobalRegion, 'Global'>;
  country: string;
  era: AutomotiveEra;
  wheelbaseMm: number;
  trackWidthMm: number;
  boltPattern: string;
  drivetrain: string;
  powertrainSpec: string;
  engineCode: string;
  engineConfig: string;
  transmissionCode: string;
  transmissionConfig: string;
  curbWeightKg: number;
  outputHp: number;
  torqueNm: number;
  defaultAssemblyId: AssemblyId;
  defaultMaterials: SubsystemMaterials;
  partIds: string[];
  builderPreset?: Partial<CustomDesignConfig>;
}

export interface EngineTransmissionStandard {
  id: string;
  domain: 'Engine' | 'Transmission';
  code: string;
  name: string;
  architecture: string;
  exactDimensions: string;
  bellhousingOrMounting: string;
  ratiosOrDisplacement: string;
  toleranceStandard: string;
  torqueRating: string;
  linkedAssemblyId: AssemblyId;
  referenceSource: string;
}

export interface IndustryToleranceSpec {
  id: string;
  featureName: string;
  subsystem: string;
  nominalMm: string;
  nominalInch: string;
  bilateralTolerance: string;
  gdtCallout: string;
  surfaceFinishRa: string;
  standardRef: string;
  inspectionMethod: string;
  linkedAssemblyId: AssemblyId;
}

export interface PublicLibraryRecord {
  id: string;
  category: 'OEM Casting & RPO' | 'Industry Standard' | 'Build Clearance & Torque' | 'Public Archive & API';
  code: string;
  title: string;
  specification: string;
  dimensionsAndLimits: string;
  sourceOrganization: string;
  referenceUrl: string;
}

export type SbcHeadVariant = 'cammed_ohv' | 'camless_billet';
export type SbcInductionStyle = 'blower_671' | 'cross_ram';

export interface SbcBlockLiveConfig {
  boreIn: number;
  strokeIn: number;
  deckClearanceIn: number;
  gasketIn: number;
  headVariant: SbcHeadVariant;
  inductionStyle: SbcInductionStyle;
}

