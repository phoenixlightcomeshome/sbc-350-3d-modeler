/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabId = 
  | 'designstudio'
  | 'modstudio'
  | 'block3d'
  | 'rotating'
  | 'valvetrain'
  | 'induction'
  | 'ignition'
  | 'trans'
  | 'dyno'
  | 'shop'
  | 'drawings'
  | 'engconfig'
  | 'drawings2'
  | 'drawingmatrix'
  | 'aerospace';

export type DesignStudioSubPageId =
  | '3d_creator'
  | 'cad_drafting'
  | 'cam_toolpath'
  | 'render_gallery';

export type CinematicLightingPreset = 'dyno_cell' | 'showroom' | 'machine_shop';

export interface DynamicKinematicTelemetry {
  crankAngleDeg: number;
  cyl1Phase: 'INTAKE' | 'COMPRESSION' | 'POWER' | 'EXHAUST';
  pistonDepthFromTdcIn: number;
  pistonVelocityFpm: number;
  pistonVelocityMs: number;
  rodAngleDeg: number;
  intakeValveLiftIn: number;
  exhaustValveLiftIn: number;
  instantaneousTorqueLbFt: number;
  instantaneousHp: number;
  cylinderPressurePsi: number;
}

export interface HoverProbeData {
  xIn: number;
  yIn: number;
  zIn: number;
  partName: string;
}

export type CutawayMode = 'none' | 'rightBank' | 'centerLongitudinal' | 'valvetrain';
export type SubsystemIsolation = 'all' | 'rotating' | 'valvetrain' | 'ignition' | 'lubrication' | 'cooling' | 'fuel' | 'starter';
export type PistonAlloy = '4032' | '2618' | 'hypereutectic';
export type RingApplication = 'street' | 'street_strip' | 'nitrous';
export type CamProfileId = 'rv' | 'street' | 'radical';
export type InductionDressMode = 'carb_hei' | 'mpfi_cnp';
export type CarbStyle = '2bbl' | '4150_dp' | '4500_dominator' | 'dual_quad' | 'mpfi_tb';
export type ExhaustPortShape = 'oval_stock' | 'd_port' | 'raised_runner' | 'cnc_race';

export interface SelectedSubPartSpec {
  id: string;
  label: string;
  category: string;
  material: string;
  dimensions: string;
  tolerance: string;
  flowOrTorque: string;
  notes: string;
  sideHint?: 'left' | 'right';
}

export interface EngineConfig {
  engineId?: string;         // active catalog/store model id (e.g. 'sbc_350_ray')
  engineName?: string;       // active display name
  configLabel?: 'V8' | 'V6' | 'I6' | 'I4' | 'V10' | 'H4'; // cylinder layout family
  color?: number;            // catalog block paint/casting hex (e.g. 0xd83b01)
  pattern?: string;          // bellhousing pattern (e.g. 'GM_Chevy_V8')
  balance?: string;          // rotating balance spec
  flywheelTeeth?: string;    // starter ring gear spec
  boreSpacing?: number;      // cylinder center-to-center pitch in inches
  valvetrainType?: 'OHV' | 'DOHC' | 'SOHC';
  blockMaterial?: 'iron' | 'aluminum';
  headMaterial?: 'iron' | 'aluminum';
  valveAngleDeg?: number;    // degrees from cylinder axis (or half included angle)
  bankAngleDeg?: number;     // V-angle (90 for V8) or 0 for inline
  bore: number;              // inches (Ray's 4.000)
  stroke: number;            // inches (Ray's 3.480)
  rodLength: number;         // inches (Ray's 5.700)
  deckHeight: number;        // inches (Ray's 9.025)
  deckClearance: number;     // inches (Ray's 0.015)
  gasketThickness: number;   // inches (Ray's 0.039)
  chamberCc: number;         // cc (Ray's 64.0)
  pistonReliefCc: number;    // cc (5.0)
  cylinders?: number;        // cylinder count (default 8)
  pistonAlloy: PistonAlloy;  // '4032' | '2618' | 'hypereutectic'
  ringApplication: RingApplication; // 'street' | 'street_strip' | 'nitrous'
  camProfile: CamProfileId;  // 'rv' | 'street' | 'radical'
  rockerRatio: number;       // 1.5 or 1.6
  selectedIntake: string;    // 'dualplane_rpm' | 'singleplane_victor' | 'tunnelram_dual'
  carbCfm: number;           // 350 - 1250 CFM (baseline 650)
  carbStyle?: CarbStyle;     // '2bbl' | '4150_dp' | '4500_dominator' | 'dual_quad' | 'mpfi_tb'
  carbVenturiIn?: number;    // Primary throttle/venturi bore diameter in inches
  airFilterCfmBonus?: number; // Air cleaner / ram air scoop delta (-15 to +50 CFM)
  intakePortCc?: number;     // Cylinder head intake runner volume (165 - 245 cc)
  intakeValveIn?: number;    // Intake valve diameter in inches (1.94 - 2.125)
  exhaustPortCc?: number;    // Exhaust port volume (60 - 92 cc)
  exhaustPortShape?: ExhaustPortShape; // 'oval_stock' | 'd_port' | 'raised_runner' | 'cnc_race'
  exhaustValveIn?: number;   // Exhaust valve diameter in inches (1.50 - 1.625)
  headerPrimaryIn?: number;  // Primary header tube OD in inches (1.50 - 2.00)
  targetAFR: number;         // e.g. 12.9
  ignitionTiming: number;    // Total advance degrees BTDC (e.g. 36)
  sparkPlugGap: number;      // inches (0.040)
  selectedTrans: string;     // transmission key
  stallSpeed: number;        // RPM
  rearGear: number;          // e.g. 3.73
  tireDiameter: number;      // inches e.g. 26.0
  selectedVehicle: string;   // vehicle id
  engineFamilyId?: string;   // optional link to ENGINE_FAMILIES record
  firingOrder?: string;      // e.g. '1-8-4-3-6-5-7-2'
  bellhousingPattern?: string; // e.g. 'GM_Chevy_V8', 'Ford_SBF_6Bolt'
  inductionDress?: InductionDressMode;
}

export interface EngineCatalogItem {
  id: string;
  name: string;
  shortName: string;
  make: string;
  era: string;
  pattern: string;
  balance: string;
  flywheelTeeth: string;
  cylinders?: number;
  configLabel?: 'V8' | 'V6' | 'I6' | 'I4' | 'V10' | 'H4';
  valvetrainType?: 'OHV' | 'DOHC' | 'SOHC';
  blockMaterial?: 'iron' | 'aluminum';
  headMaterial?: 'iron' | 'aluminum';
  boreSpacing?: number;
  bankAngleDeg?: number;
  valveAngleDeg?: number;
  stockRockerRatio?: number;
  intakeValveIn?: number;
  exhaustValveIn?: number;
  mainCaps?: number;
  bore: number;
  stroke: number;
  rodLength: number;
  deckHeight: number;
  chamberCc: number;
  gasketThickness: number;
  deckClearance: number;
  quenchDistance: number;
  staticCR: number;
  color: number;
  firingOrder: string;
  dyno: {
    baseHp: number;
    baseTq: number;
    hpPeakRpm: number;
    tqPeakRpm: number;
    ve: number;
  };
  torqueSpecs: TorqueSpec[];
  bom: BOMItem[];
}

export interface TransmissionItem {
  id: string;
  name: string;
  category: string;
  type: 'Automatic' | 'Manual';
  ratios: number[];
  reverse: number;
  nativePattern: string;
  lengthInches: number;
  defaultStall: number;
  clutch: string;
  tunnelProfile: string;
  desc: string;
}

export interface VehicleItem {
  id: string;
  make: string;
  model: string;
  yearRange: [number, number];
  gen: string;
  tunnelSize: string;
}

export type PartsGradeTier = 'oe_standard' | 'pro_hd' | 'street_perf' | 'race_forged';

export interface StorePartOption {
  id: string;
  category: string;
  brand: string;
  sku: string;
  name: string;
  tier: PartsGradeTier;
  price: number;
  coreCharge?: number;
  warranty: string;
  specSummary: string;
  inStock: string;
}

export interface StoreVehicleModel {
  id: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  chassisCode: string;
  tunnelSize: string;
  engineIds: string[];
}

export interface StoreEngineSpec {
  id: string;
  make: string;
  family: string;
  code: string;
  name: string;
  liters: number;
  cid: number;
  cylinders: number;
  configLabel: 'V8' | 'V6' | 'I6' | 'I4' | 'V10' | 'H4';
  yearStart: number;
  yearEnd: number;
  bore: number;
  stroke: number;
  rodLength: number;
  deckHeight: number;
  deckClearance: number;
  gasketThickness: number;
  chamberCc: number;
  pistonReliefCc: number;
  firingOrder: string;
  pattern: string;
  fuelSystem: string;
  baseHp: number;
  baseTq: number;
  recommendedTransId: string;
  partsPrefix: string;
}

export interface TorqueSpec {
  item: string;
  size: string;
  stock: string;
  arp: string;
  stretch?: string;
  notes: string;
}

export interface MechanicSpec {
  label: string;
  value: string;
  notes: string;
}

export interface BOMItem {
  cat: string;
  part: string;
  num: string;
  price: number;
}

export interface HeadFlowPoint {
  lift: number;
  intakeCfm: number;
  exhaustCfm: number;
}

export interface DynoDataPoint {
  rpm: number;
  hp: number;
  tq: number;
  ve: number;
  fuelFlowLbsHr: number;
}

export interface SpeedInGearRow {
  gear: number;
  ratio: number;
  totalReduction: number;
  mphAt2500: number;
  mphAt5500: number;
  cruiseRpmAt65: number;
}

export interface CompatibilityReport {
  isDirectBoltOn: boolean;
  adapterRequired: string;
  hardwareNotes: string;
  bellhousing: string;
  tunnelClearance: string;
}

export interface CoordinatedSpecs {
  displacementCi: number;
  displacementL: number;
  cylinderCc: number;
  deckVolumeCc: number;
  gasketVolumeCc: number;
  totalClearanceCc: number;
  quenchDistance: number;
  quenchStatus: string;
  staticCR: number;
  dynamicCR: number;
  rodStrokeRatio: number;
  maxRodAngleDeg: number;
  meanPistonSpeed6000: number;
  totalValveLift: number;
  topRingGap: number;
  secondRingGap: number;
  oilRingGap: number;
  ptwClearance: string;
  peakCfmDemand: number;
  effectiveCarbCfm: number;
  carbSizingStatus: string;
  intakeFlowPeakCfm: number;
  exhaustFlowPeakCfm: number;
  eiFlowRatioPct: number;
  intakeVelocityFps: number;
  portModHpDelta: number;
  portModTqDelta: number;
  dynamicHeadFlowBench: HeadFlowPoint[];
  peakHp: number;
  peakTq: number;
  hpPeakRpm: number;
  tqPeakRpm: number;
  bsfcLbHr: number;
  fuelGph: number;
  knockRisk: boolean;
  camData: {
    name: string;
    intakeDur050: number;
    exhDur050: number;
    lobeLift: number;
    baseHp: number;
    baseTq: number;
    hpRpm: number;
    tqRpm: number;
    ve: number;
    recStall: number;
    ivcDeg: number;
  };
  intakeData: {
    id: string;
    name: string;
    style: string;
    runnerCc: number;
    flowCfm: number;
    hpMult: number;
    tqMult: number;
  };
  dynoCurve: DynoDataPoint[];
  speedInGearTable: SpeedInGearRow[];
  compatibility: CompatibilityReport;
}

export interface TechDrawingSourceUrl {
  title: string;
  uri: string;
}

export type EngineSubassemblyKey =
  | 'block'
  | 'timingCover'
  | 'oilPan'
  | 'crank'
  | 'rotating'
  | 'cam'
  | 'heads'
  | 'intake'
  | 'efiRails'
  | 'ignition'
  | 'lubrication'
  | 'cooling'
  | 'fuel'
  | 'starter'
  | 'chassis';

export type TransSubassemblyKey =
  | 'bellhousing'
  | 'converter'
  | 'frontPump'
  | 'clutchPack'
  | 'mainCase'
  | 'valveBody'
  | 'pan'
  | 'tailhousing'
  | 'slipYoke';

export interface TechDrawingCallout {
  row: string;
  indexCode: string;
  partName: string;
  partNumber?: string;
  category: string;
  clearanceSpec?: string;
  torqueSpec?: string;
  material?: string;
  notes?: string;
  targetSubassembly: EngineSubassemblyKey | TransSubassemblyKey | string;
}

export interface TechDrawingDimensions {
  bore?: number;
  stroke?: number;
  rodLength?: number;
  deckHeight?: number;
  deckClearance?: number;
  gasketThickness?: number;
  chamberCc?: number;
  ratios?: number[];
  reverse?: number;
  lengthInches?: number;
  defaultStall?: number;
  nativePattern?: string;
}

export interface TechDrawingSheet {
  id: string;
  domain: 'engine' | 'transmission';
  drawingNumber: string;
  title: string;
  subtitle: string;
  sourceLabel: string;
  unitSummary: string;
  referenceImageUrl?: string;
  dimensions?: TechDrawingDimensions;
  callouts: TechDrawingCallout[];
  sourceUrls?: TechDrawingSourceUrl[];
  updatedAt?: string;
}

export interface InspectionData {
  name: string;
  category: string;
  desc: string;
  spec?: string;
  torque?: string;
  partNumber?: string;
  drawingIndex?: string;
  material?: string;
  sourceUrls?: TechDrawingSourceUrl[];
}

export interface MeasurementState {
  active: boolean;
  mode: 'none' | 'caliper' | 'volumetric' | 'angle';
  point1: [number, number, number] | null;
  point2: [number, number, number] | null;
  distanceInches: number | null;
  distanceMm: number | null;
  surfaceLabel: string | null;
}

export interface MountedStudioDesign {
  id: string;
  title: string;
  drawingNumber: string;
  revision: string;
  partKey: string;
  sourceSubPage: DesignStudioSubPageId;
  toleranceClass: string;
  surfaceFinishRa: string;
  camOperation?: string;
  toolSpec?: string;
  spindleRpm?: number;
  feedRateIpm?: number;
  mrrIn3Min?: number;
  cycleTimeEst?: string;
  gcodeSnippet?: string;
  configUpdates?: Partial<EngineConfig>;
  drawingSheet: TechDrawingSheet;
  mountedAt: string;
}

// Phase 1: Per-part Modification Studio types
export type PartSystemId =
  | 'engine_block'
  | 'cylinder_heads'
  | 'crankshaft'
  | 'connecting_rods'
  | 'pistons'
  | 'camshaft'
  | 'valvetrain'
  | 'intake_manifold'
  | 'carb_efi'
  | 'ignition'
  | 'lubrication'
  | 'cooling'
  | 'fuel_system'
  | 'starter'
  | 'transmission'
  | 'driveline';

export type PartSpecMode = 'driving' | 'display';

export type PartSpecCategory =
  | 'dimension'
  | 'clearance'
  | 'material'
  | 'torque'
  | 'part_number'
  | 'performance'
  | 'notes';

export interface PartFieldOverride {
  fieldKey: string;
  label: string;
  value: string | number;
  unit?: string;
  factoryValue: string | number | null;
  mode: PartSpecMode;
  category: PartSpecCategory;
  configKey?: keyof EngineConfig;
  makerSupplied: boolean;
  updatedAt: string;
}

export interface PartCustomOverride {
  partId: PartSystemId;
  fields: Record<string, PartFieldOverride>;
  updatedAt: string;
}

export type PartOverridesMap = Partial<Record<PartSystemId, PartCustomOverride>>;

