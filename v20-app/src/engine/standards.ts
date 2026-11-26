/**
 * Standards and specifications loaded from v19_standards.json
 * Immutable SBC 350 Engineering Baseline & Data Rules
 */
import v19StandardsData from '../v19_standards.json';

export interface UnitPolicy {
  internalUnit: 'imperial' | 'metric';
  supportedDisplayUnits: ('imperial' | 'metric')[];
  metricRole: string;
  conversionNote: string;
}

export interface MaterialSpec {
  densityLbPerIn3: number;
  densityVerified: boolean;
  densitySource: string;
  costPerLbUsd: number;
  costIsEstimate: boolean;
  kFactor: number;
  kFactorIsEstimate: boolean;
  minBendRadiusIn: number;
  minBendRadiusIsEstimate: boolean;
  bendParamsStatus: string;
  category: string;
}

export interface FabricationTier {
  id: string;
  label: string;
  isPreset: boolean;
  isGeneralDefault?: boolean;
  neverDefault?: boolean;
  toleranceIn: number;
  toleranceIsPreset: boolean;
  minWallIn: number;
  minWallIsPreset: boolean;
  minHoleDiaIn: number;
  minHoleDiaIsPreset: boolean;
  maxAspectRatio: number;
  maxAspectRatioIsPreset: boolean;
  measurementStatus: string;
}

export interface ReferenceTarget {
  id: string;
  label: string;
  widthIn: number;
  widthVerified?: boolean;
  widthSource?: string;
  heightIn: number | null;
  heightStatus?: string;
  expectedFeatureCount?: number | null;
  featureStatus?: string;
  verified: boolean;
  source?: string;
  pxPerIn?: number;
  boreSpacingIn?: number;
}

export interface ReferenceSpecs {
  sbc_350_oem: {
    label: string;
    displacementCid: number;
    displacementVerified: boolean;
    horsepowerCarb: number;
    torqueCarbFtLb: number;
    carbRatingVerified: boolean;
    horsepowerMpfiProvisional: number;
    torqueMpfiProvisionalFtLb: number;
    mpfiRatingVerified: boolean;
    mpfiStatus: string;
    cylinders: number;
    boreIn: number;
    strokeIn: number;
    rodLengthIn: number;
    deckHeightIn: number;
    boreSpacingIn: number;
    headLengthMm: number;
    headLengthIn: number;
    firingOrder: number[];
    headBoltCount: number;
    headBoltPatternNote: string;
    stockBoltTorqueSpec: string;
    stockBoltTorqueSource: string;
    arpBoltTorqueSpec: string;
    arpBoltTorqueSource: string;
    bankAngleDeg: number;
    bankAngleDegVerified: boolean;
    bankAngleStatus: string;
    defaultTransmission: string;
    verified: boolean;
    source: string;
  };
  sbc_350_camless: {
    label: string;
    verified: boolean;
    status: string;
    headLengthMm: number;
    headLengthIn: number;
    headLengthVerified: boolean;
    boreSpacingIn: number;
    boreSpacingVerified: boolean;
    valveOrder: string;
    headBoltCount: number;
    editableDefaultsNote: string;
    editableDefaults: Record<string, { value: number; verified: boolean; note?: string }>;
  };
}

export const V19_STANDARDS = v19StandardsData;
export const MATERIALS = v19StandardsData.materials as Record<string, MaterialSpec>;
export const FABRICATION_TIERS = v19StandardsData.fabricationTiers as Record<string, FabricationTier>;
export const REFERENCE_TARGETS = v19StandardsData.referenceTargets as ReferenceTarget[];
export const REFERENCE_SPECS = v19StandardsData.referenceSpecs as unknown as ReferenceSpecs;
export const PHOTO_CALIBRATION_BASELINE = v19StandardsData.sbc_350_head_photo_calibration;
export const INDUSTRY_CATALOG = v19StandardsData.industryCatalog;
export const DESIGN_TECHNIQUES = v19StandardsData.designTechniques;

export function formatDimension(inches: number, displayMetric: boolean, precision = 3): string {
  if (displayMetric) {
    const mm = inches * 25.4;
    return `${mm.toFixed(precision)} mm`;
  }
  return `${inches.toFixed(precision)} in`;
}

export function formatTolerance(inches: number, displayMetric: boolean): string {
  if (displayMetric) {
    const mm = inches * 25.4;
    return `±${mm.toFixed(3)} mm`;
  }
  return `±${inches.toFixed(4)} in`;
}
