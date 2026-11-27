import {
  AerospaceMaterialSpec,
  AssemblyId,
  AssemblyProfile,
  AttachmentDatumSpec,
  BomRow,
  ComputedSpecs,
  CustomDesignConfig,
  CustomDesignTelemetry,
  MaterialId,
  ParametricConfig,
  SubsystemKey,
  SubsystemMaterials,
} from '../types/aerospace';

export const AEROSPACE_MATERIALS: Record<MaterialId, AerospaceMaterialSpec> = {
  ti_6al4v: {
    id: 'ti_6al4v',
    name: 'Ti-6Al-4V Grade 5',
    designation: 'AMS 4911 / ASTM F3001',
    category: 'Titanium Alloy',
    densityGCm3: 4.43,
    yieldStrengthMPa: 880,
    youngsModulusGPa: 113.8,
    maxServiceTempC: 420,
    thermalConductivityWMK: 6.7,
    recyclabilityPct: 92,
    embodiedCo2KgPerKg: 35.4,
    recyclingMethod: 'Vacuum arc remelting (VAR) closed-loop swarf recovery',
    sourceOrigin: 'TIMET (USA) / VSMPO / ASTM B265 Titanium Mill Stock',
    colorHex: '#9ba3ae',
    metalness: 0.94,
    roughness: 0.22,
    clearcoat: 0.1,
    anisotropy: 0.85,
    iridescence: 0.08,
    pattern: 'brushed',
  },
  al_7075: {
    id: 'al_7075',
    name: '7075-T651 Billet Alloy',
    designation: 'AMS 4045 / AlZn5.5MgCu',
    category: 'Aluminum Alloy',
    densityGCm3: 2.81,
    yieldStrengthMPa: 503,
    youngsModulusGPa: 71.7,
    maxServiceTempC: 175,
    thermalConductivityWMK: 130.0,
    recyclabilityPct: 96,
    embodiedCo2KgPerKg: 8.6,
    recyclingMethod: 'Laser-induced breakdown sorting & secondary billet melt',
    sourceOrigin: 'Alcoa / Kaiser Aluminum (USA) / Constellium (France)',
    colorHex: '#cfd6df',
    metalness: 0.9,
    roughness: 0.28,
    clearcoat: 0.05,
    anisotropy: 0.45,
    iridescence: 0.0,
    pattern: 'riveted',
  },
  al_6061_t6: {
    id: 'al_6061_t6',
    name: '6061-T6 Extruded Billet',
    designation: 'ASTM B209 / AlMg1SiCu',
    category: 'Aluminum Alloy',
    densityGCm3: 2.7,
    yieldStrengthMPa: 276,
    youngsModulusGPa: 68.9,
    maxServiceTempC: 160,
    thermalConductivityWMK: 167.0,
    recyclabilityPct: 97,
    embodiedCo2KgPerKg: 6.8,
    recyclingMethod: 'Closed-loop remelt extrusion scrap recovery',
    sourceOrigin: 'Norsk Hydro (Norway) / Novelis Global Automotive Extrusions',
    colorHex: '#dce3ec',
    metalness: 0.88,
    roughness: 0.26,
    clearcoat: 0.08,
    anisotropy: 0.35,
    iridescence: 0.0,
    pattern: 'brushed',
  },
  al_356_t6: {
    id: 'al_356_t6',
    name: 'A356-T6 Cast Aluminum',
    designation: 'ASTM B108 / AlSi7Mg0.3',
    category: 'Aluminum Alloy',
    densityGCm3: 2.68,
    yieldStrengthMPa: 205,
    youngsModulusGPa: 72.4,
    maxServiceTempC: 205,
    thermalConductivityWMK: 151.0,
    recyclabilityPct: 95,
    embodiedCo2KgPerKg: 5.9,
    recyclingMethod: 'Secondary foundry ingot remelt & degassing',
    sourceOrigin: 'Nemak (Mexico/Germany) / Castool OEM Sand & Permanent Mold',
    colorHex: '#b8c0ca',
    metalness: 0.82,
    roughness: 0.42,
    clearcoat: 0.02,
    anisotropy: 0.15,
    iridescence: 0.0,
    pattern: 'cast_iron',
  },
  magnesium_az91d: {
    id: 'magnesium_az91d',
    name: 'AZ91D Forged Magnesium',
    designation: 'ASTM B94 / MgAl9Zn1',
    category: 'Magnesium Alloy',
    densityGCm3: 1.81,
    yieldStrengthMPa: 160,
    youngsModulusGPa: 45.0,
    maxServiceTempC: 150,
    thermalConductivityWMK: 72.0,
    recyclabilityPct: 93,
    embodiedCo2KgPerKg: 14.8,
    recyclingMethod: 'Fluxless SF6-free argon cover-gas remelting',
    sourceOrigin: 'BBS Motorsport (Germany) / Meridian Lightweight Tech',
    colorHex: '#b6a88a',
    metalness: 0.86,
    roughness: 0.3,
    clearcoat: 0.18,
    anisotropy: 0.4,
    iridescence: 0.04,
    pattern: 'brushed',
  },
  cast_iron_gray: {
    id: 'cast_iron_gray',
    name: 'Class 35 High-Nickel Iron',
    designation: 'ASTM A48 / SAE G3500',
    category: 'Ferrous & Billet Steel',
    densityGCm3: 7.2,
    yieldStrengthMPa: 255,
    youngsModulusGPa: 118.0,
    maxServiceTempC: 480,
    thermalConductivityWMK: 48.0,
    recyclabilityPct: 98,
    embodiedCo2KgPerKg: 2.1,
    recyclingMethod: 'Electric arc & induction cupola foundry scrap remelt',
    sourceOrigin: 'GM Saginaw Foundry / Ford Windsor / Dart Machinery Castings',
    colorHex: '#4b5058',
    metalness: 0.72,
    roughness: 0.64,
    clearcoat: 0.0,
    anisotropy: 0.05,
    iridescence: 0.0,
    pattern: 'cast_iron',
  },
  chromoly_4130: {
    id: 'chromoly_4130',
    name: '4130 Chromoly Normalized',
    designation: 'AMS 6370 / AISI 4130',
    category: 'Ferrous & Billet Steel',
    densityGCm3: 7.85,
    yieldStrengthMPa: 460,
    youngsModulusGPa: 205.0,
    maxServiceTempC: 450,
    thermalConductivityWMK: 42.7,
    recyclabilityPct: 98,
    embodiedCo2KgPerKg: 2.4,
    recyclingMethod: 'Electric arc furnace scrap steel recovery',
    sourceOrigin: 'Docol / TimkenSteel (USA) / SFI 25.1 Rollcage Tube Stock',
    colorHex: '#69727d',
    metalness: 0.9,
    roughness: 0.32,
    clearcoat: 0.08,
    anisotropy: 0.35,
    iridescence: 0.0,
    pattern: 'machined_steel',
  },
  forged_4340: {
    id: 'forged_4340',
    name: '4340 Vacuum-Melt Steel',
    designation: 'AMS 6414 / VAR 4340',
    category: 'Ferrous & Billet Steel',
    densityGCm3: 7.85,
    yieldStrengthMPa: 1120,
    youngsModulusGPa: 205.0,
    maxServiceTempC: 480,
    thermalConductivityWMK: 44.5,
    recyclabilityPct: 98,
    embodiedCo2KgPerKg: 3.1,
    recyclingMethod: 'Vacuum induction remelting (VIM-VAR) recovery',
    sourceOrigin: 'Carpenter Technology (USA) / Aubert & Duval (France)',
    colorHex: '#848d98',
    metalness: 0.95,
    roughness: 0.18,
    clearcoat: 0.12,
    anisotropy: 0.8,
    iridescence: 0.05,
    pattern: 'machined_steel',
  },
  carburized_9310: {
    id: 'carburized_9310',
    name: '9310 Case-Hardened Steel',
    designation: 'AMS 6265 / 62 HRC Case',
    category: 'Ferrous & Billet Steel',
    densityGCm3: 7.86,
    yieldStrengthMPa: 1240,
    youngsModulusGPa: 200.0,
    maxServiceTempC: 350,
    thermalConductivityWMK: 42.0,
    recyclabilityPct: 97,
    embodiedCo2KgPerKg: 3.4,
    recyclingMethod: 'Electric arc furnace alloy sorting & remelt',
    sourceOrigin: 'Böhler Edelstahl (Austria) / Latrobe Specialty Steel (USA)',
    colorHex: '#737c88',
    metalness: 0.96,
    roughness: 0.16,
    clearcoat: 0.15,
    anisotropy: 0.9,
    iridescence: 0.04,
    pattern: 'machined_steel',
  },
  inconel_718: {
    id: 'inconel_718',
    name: 'Inconel 718 Superalloy',
    designation: 'AMS 5662 / NiCr19Fe19Nb5Mo3',
    category: 'Nickel Superalloy',
    densityGCm3: 8.19,
    yieldStrengthMPa: 1035,
    youngsModulusGPa: 200.0,
    maxServiceTempC: 705,
    thermalConductivityWMK: 11.4,
    recyclabilityPct: 90,
    embodiedCo2KgPerKg: 28.9,
    recyclingMethod: 'Electron-beam cold hearth refining (EBCHR)',
    sourceOrigin: 'Special Metals Corp (USA) / VDM Metals (Germany)',
    colorHex: '#7e7872',
    metalness: 0.96,
    roughness: 0.2,
    clearcoat: 0.15,
    anisotropy: 0.75,
    iridescence: 0.42,
    pattern: 'heat_tinted',
  },
  cfrp_t800: {
    id: 'cfrp_t800',
    name: 'T800S / Epoxy CFRP',
    designation: 'Torayca Prepreg 3900-2B',
    category: 'Thermoset Composite',
    densityGCm3: 1.56,
    yieldStrengthMPa: 1520,
    youngsModulusGPa: 162.0,
    maxServiceTempC: 185,
    thermalConductivityWMK: 5.2,
    recyclabilityPct: 34,
    embodiedCo2KgPerKg: 24.8,
    recyclingMethod: 'Supercritical solvolysis / pyrolysis chopped fiber reclaim',
    sourceOrigin: 'Toray Carbon Fibers (Japan) / Hexcel HexPly Autoclave',
    colorHex: '#252a32',
    metalness: 0.18,
    roughness: 0.24,
    clearcoat: 0.82,
    anisotropy: 0.2,
    iridescence: 0.0,
    pattern: 'carbon',
  },
  forged_carbon_smc: {
    id: 'forged_carbon_smc',
    name: 'Forged Carbon Chopped SMC',
    designation: 'Automobili Forged Composite',
    category: 'Thermoset Composite',
    densityGCm3: 1.48,
    yieldStrengthMPa: 620,
    youngsModulusGPa: 58.0,
    maxServiceTempC: 175,
    thermalConductivityWMK: 4.1,
    recyclabilityPct: 48,
    embodiedCo2KgPerKg: 19.2,
    recyclingMethod: 'Compression re-molding & chopped tow reclamation',
    sourceOrigin: 'Mitsubishi Chemical Carbon Fiber / Lamborghini ACLP',
    colorHex: '#1f242c',
    metalness: 0.16,
    roughness: 0.28,
    clearcoat: 0.75,
    anisotropy: 0.0,
    iridescence: 0.06,
    pattern: 'forged_carbon',
  },
  carbon_ceramic_sic: {
    id: 'carbon_ceramic_sic',
    name: 'C/SiC Carbon-Ceramic',
    designation: 'Brembo CCM-R / SGL Carbon',
    category: 'Ceramic Matrix',
    densityGCm3: 2.38,
    yieldStrengthMPa: 310,
    youngsModulusGPa: 95.0,
    maxServiceTempC: 1150,
    thermalConductivityWMK: 42.0,
    recyclabilityPct: 52,
    embodiedCo2KgPerKg: 32.0,
    recyclingMethod: 'Crushed silicon-carbide refractory aggregate reuse',
    sourceOrigin: 'Brembo SGL Carbon Ceramic (Italy/Germany)',
    colorHex: '#31363d',
    metalness: 0.24,
    roughness: 0.52,
    clearcoat: 0.12,
    anisotropy: 0.1,
    iridescence: 0.05,
    pattern: 'ceramic_brake',
  },
  peek_cf30: {
    id: 'peek_cf30',
    name: 'Victrex PEEK-CF30',
    designation: 'Thermoplastic Matrix / 30% CF',
    category: 'Recyclable Polymer',
    densityGCm3: 1.41,
    yieldStrengthMPa: 260,
    youngsModulusGPa: 26.5,
    maxServiceTempC: 260,
    thermalConductivityWMK: 0.92,
    recyclabilityPct: 89,
    embodiedCo2KgPerKg: 14.2,
    recyclingMethod: 'Induction-weld re-consolidation & melt-regrind pelletizing',
    sourceOrigin: 'Victrex plc (UK) / Solvay KetaSpire Polymer Tech',
    colorHex: '#353e4a',
    metalness: 0.12,
    roughness: 0.34,
    clearcoat: 0.45,
    anisotropy: 0.0,
    iridescence: 0.0,
    pattern: 'polymer',
  },
  kevlar_aramid: {
    id: 'kevlar_aramid',
    name: 'Kevlar 49 Aramid Honeycomb',
    designation: 'AMS 3901 / DuPont Aramid',
    category: 'Aramid Fiber',
    densityGCm3: 1.38,
    yieldStrengthMPa: 940,
    youngsModulusGPa: 76.0,
    maxServiceTempC: 215,
    thermalConductivityWMK: 0.45,
    recyclabilityPct: 42,
    embodiedCo2KgPerKg: 17.5,
    recyclingMethod: 'Mechanical defibrillation into friction-pad pulp',
    sourceOrigin: 'DuPont Kevlar (USA) / Teijin Twaron (Netherlands)',
    colorHex: '#c89b3c',
    metalness: 0.08,
    roughness: 0.48,
    clearcoat: 0.2,
    anisotropy: 0.15,
    iridescence: 0.0,
    pattern: 'kevlar',
  },
  automotive_paint_gloss: {
    id: 'automotive_paint_gloss',
    name: 'OEM Metallic Clearcoat Steel',
    designation: 'PPG Envirobase / HS600',
    category: 'Coating & Elastomer',
    densityGCm3: 7.8,
    yieldStrengthMPa: 420,
    youngsModulusGPa: 200.0,
    maxServiceTempC: 160,
    thermalConductivityWMK: 45.0,
    recyclabilityPct: 95,
    embodiedCo2KgPerKg: 2.9,
    recyclingMethod: 'De-coated steel stamping scrap arc-furnace recovery',
    sourceOrigin: 'PPG Industries / BASF Glasurit OEM Body Coatings',
    colorHex: '#b91c1c',
    metalness: 0.55,
    roughness: 0.12,
    clearcoat: 1.0,
    anisotropy: 0.0,
    iridescence: 0.12,
    pattern: 'paint_metallic',
  },
  chevy_orange_enamel: {
    id: 'chevy_orange_enamel',
    name: 'Chevy Orange High-Temp Enamel',
    designation: 'GM-DE1620 / Class 35 Iron Block',
    category: 'Coating & Elastomer',
    densityGCm3: 7.2,
    yieldStrengthMPa: 255,
    youngsModulusGPa: 118.0,
    maxServiceTempC: 260,
    thermalConductivityWMK: 48.0,
    recyclabilityPct: 97,
    embodiedCo2KgPerKg: 2.3,
    recyclingMethod: 'Thermal de-coat + electric arc iron remelt recovery',
    sourceOrigin: 'GM Performance / Dupli-Color Ceramic Engine Enamel',
    colorHex: '#e24912',
    metalness: 0.28,
    roughness: 0.16,
    clearcoat: 1.0,
    anisotropy: 0.0,
    iridescence: 0.04,
    pattern: 'paint_metallic',
  },
  polished_billet_al: {
    id: 'polished_billet_al',
    name: 'Mirror-Polished Billet Aluminum',
    designation: 'CNC 6061-T651 / Ra 0.08 µm Buffed',
    category: 'Aluminum Alloy',
    densityGCm3: 2.71,
    yieldStrengthMPa: 310,
    youngsModulusGPa: 69.5,
    maxServiceTempC: 175,
    thermalConductivityWMK: 167.0,
    recyclabilityPct: 97,
    embodiedCo2KgPerKg: 7.4,
    recyclingMethod: 'Closed-loop CNC chip & billet remelt recovery',
    sourceOrigin: 'Weiand / Edelbrock CNC Billet / Alcoa Precision Plate',
    colorHex: '#e6edf6',
    metalness: 0.96,
    roughness: 0.1,
    clearcoat: 0.25,
    anisotropy: 0.9,
    iridescence: 0.02,
    pattern: 'brushed',
  },
  vulcanized_rubber: {
    id: 'vulcanized_rubber',
    name: 'Vulcanized Tire / Mount Rubber',
    designation: 'ASTM D2000 / SBR-NR',
    category: 'Coating & Elastomer',
    densityGCm3: 1.16,
    yieldStrengthMPa: 24,
    youngsModulusGPa: 0.08,
    maxServiceTempC: 135,
    thermalConductivityWMK: 0.25,
    recyclabilityPct: 74,
    embodiedCo2KgPerKg: 3.1,
    recyclingMethod: 'Cryogenic crumb rubber devulcanization',
    sourceOrigin: 'Michelin Motorsport (France) / Bridgestone Potenza Compound',
    colorHex: '#181b20',
    metalness: 0.02,
    roughness: 0.88,
    clearcoat: 0.0,
    anisotropy: 0.0,
    iridescence: 0.0,
    pattern: 'rubber',
  },
  sapphire_glass: {
    id: 'sapphire_glass',
    name: 'Aluminosilicate / Sapphire',
    designation: 'MIL-PRF-25690 Optical',
    category: 'Optical Ceramic',
    densityGCm3: 3.98,
    yieldStrengthMPa: 400,
    youngsModulusGPa: 345.0,
    maxServiceTempC: 980,
    thermalConductivityWMK: 27.2,
    recyclabilityPct: 68,
    embodiedCo2KgPerKg: 19.5,
    recyclingMethod: 'Crushed refractory cullet & thermal re-sintering',
    sourceOrigin: 'Saint-Gobain Sekurit / Corning Gorilla Automotive',
    colorHex: '#9ec5e8',
    metalness: 0.05,
    roughness: 0.06,
    clearcoat: 1.0,
    anisotropy: 0.0,
    iridescence: 0.2,
    pattern: 'ceramic',
  },
};

export const MATERIAL_COST_USD_PER_KG: Record<MaterialId, number> = {
  ti_6al4v: 148,
  al_7075: 24,
  al_6061_t6: 16,
  al_356_t6: 11,
  magnesium_az91d: 38,
  cast_iron_gray: 4.5,
  chromoly_4130: 14,
  forged_4340: 26,
  carburized_9310: 34,
  inconel_718: 165,
  cfrp_t800: 185,
  forged_carbon_smc: 142,
  carbon_ceramic_sic: 245,
  peek_cf30: 112,
  kevlar_aramid: 94,
  automotive_paint_gloss: 9,
  chevy_orange_enamel: 6.5,
  polished_billet_al: 28,
  vulcanized_rubber: 6,
  sapphire_glass: 290,
};

export const DEFAULT_CUSTOM_DESIGN: CustomDesignConfig = {
  buildName: 'AF-350 Custom Chassis Concept',
  applicationProfile: 'Street Restomod',
  unitSystem: 'mm',
  showDatums: true,

  chassisStyle: 'tubular_spaceframe',
  wheelbaseMm: 2743,
  trackWidthMm: 1620,
  railGaugeMm: 3.2,
  chassisMaterial: 'chromoly_4130',

  powertrainType: 'v8_ohv',
  engineSetbackMm: 210,
  crankHeightMm: 335,
  boreMm: 101.6,
  strokeMm: 88.39,
  bankAngleDeg: 90,
  engineBlockMaterial: 'chevy_orange_enamel',
  cylinderHeadMaterial: 'polished_billet_al',
  exhaustMaterial: 'inconel_718',

  transmissionType: 'manual_6spd_t56',
  bellhousingOffsetMm: 0.0,
  gearboxLengthMm: 842,
  gearHelixDeg: 22,
  firstGearRatio: 2.66,
  transmissionMaterial: 'al_7075',

  brakeRotorDiaMm: 380,
  caliperPistons: 6,
  suspensionType: 'double_wishbone',
  rotorMaterial: 'carbon_ceramic_sic',
  caliperMaterial: 'al_7075',
  uprightMaterial: 'ti_6al4v',

  aeroPackage: 'gt_drs_swan_neck',
  wingSpanMm: 1820,
  wingAngleDeg: 12,
  aeroMaterial: 'cfrp_t800',

  toleranceClass: 'asme_y14_5_precision',
};

export function computeCustomDesignTelemetry(cfg: CustomDesignConfig): CustomDesignTelemetry {
  const chassisMat = AEROSPACE_MATERIALS[cfg.chassisMaterial];
  const blockMat = AEROSPACE_MATERIALS[cfg.engineBlockMaterial];
  const headMat = AEROSPACE_MATERIALS[cfg.cylinderHeadMaterial];
  const exhMat = AEROSPACE_MATERIALS[cfg.exhaustMaterial];
  const transMat = AEROSPACE_MATERIALS[cfg.transmissionMaterial];
  const rotorMat = AEROSPACE_MATERIALS[cfg.rotorMaterial];
  const calMat = AEROSPACE_MATERIALS[cfg.caliperMaterial];
  const uprightMat = AEROSPACE_MATERIALS[cfg.uprightMaterial];
  const aeroMat = AEROSPACE_MATERIALS[cfg.aeroMaterial];

  const wbRatio = cfg.wheelbaseMm / 2743;
  const twRatio = cfg.trackWidthMm / 1620;
  const gaugeRatio = cfg.railGaugeMm / 3.2;

  const chassisBaseVolM3 =
    cfg.chassisStyle === 'carbon_monocoque'
      ? 0.072
      : cfg.chassisStyle === 'ev_skateboard'
      ? 0.095
      : cfg.chassisStyle === 'ladder_perimeter'
      ? 0.044
      : 0.036;
  const chassisMass =
    chassisBaseVolM3 *
    wbRatio *
    (0.6 + 0.4 * twRatio) *
    (0.55 + 0.45 * gaugeRatio) *
    chassisMat.densityGCm3 *
    1000;

  const cylCount =
    cfg.powertrainType === 'v8_ohv'
      ? 8
      : cfg.powertrainType === 'inline6_dohc' || cfg.powertrainType === 'flat6_boxer'
      ? 6
      : 0;
  const displacementCc =
    cylCount > 0
      ? Math.round(cylCount * Math.PI * Math.pow(cfg.boreMm / 20, 2) * (cfg.strokeMm / 10))
      : 0;

  const blockScale = cfg.powertrainType === 'axial_flux_ev' ? 0.52 : displacementCc / 5733;
  const engineBlockMass =
    (cfg.powertrainType === 'axial_flux_ev' ? 0.018 : 0.022 * (0.65 + 0.35 * blockScale)) *
    blockMat.densityGCm3 *
    1000;
  const headMass =
    (cfg.powertrainType === 'axial_flux_ev' ? 0.012 : 0.013 * (0.7 + 0.3 * blockScale)) *
    headMat.densityGCm3 *
    1000;
  const exhaustMass =
    (cfg.powertrainType === 'axial_flux_ev' ? 0.0025 : 0.0038) * exhMat.densityGCm3 * 1000;
  const powertrainTotalMass = engineBlockMass + headMass + exhaustMass + 34; // + internals/fluids

  const transLenFactor = cfg.gearboxLengthMm / 842;
  const transMass = 0.015 * transLenFactor * transMat.densityGCm3 * 1000 + 22;

  const rotorScale = Math.pow(cfg.brakeRotorDiaMm / 380, 2);
  const cornersMass =
    4 *
    (0.0032 * rotorScale * rotorMat.densityGCm3 * 1000 +
      0.0014 * (cfg.caliperPistons / 6) * calMat.densityGCm3 * 1000 +
      0.0019 * uprightMat.densityGCm3 * 1000 +
      19.5); // tire + wheel + control arms

  const aeroFactor =
    cfg.aeroPackage === 'none'
      ? 0
      : cfg.aeroPackage === 'ducktail_lip'
      ? 0.35
      : cfg.aeroPackage === 'venturi_diffuser'
      ? 0.85
      : 1.0;
  const aeroMass = aeroFactor * (cfg.wingSpanMm / 1820) * 0.014 * aeroMat.densityGCm3 * 1000;

  const totalMassKg = Math.round(
    chassisMass + powertrainTotalMass + transMass + cornersMass + aeroMass + (cfg.powertrainType === 'axial_flux_ev' ? 310 : 85)
  );

  // Weight distribution based on engineSetbackMm & wheelbaseMm
  const engineNormPos = Math.max(0.02, Math.min(0.65, cfg.engineSetbackMm / cfg.wheelbaseMm));
  const rawFrontPct =
    cfg.powertrainType === 'axial_flux_ev'
      ? 49.5 - (engineNormPos - 0.1) * 8
      : 54.5 - engineNormPos * 26;
  const frontWeightPct = Number(Math.max(41, Math.min(58, rawFrontPct)).toFixed(1));
  const rearWeightPct = Number((100 - frontWeightPct).toFixed(1));

  // Output power / torque
  const estPowerHp =
    cfg.powertrainType === 'axial_flux_ev'
      ? Math.round(780 * (cfg.boreMm / 100) + 120)
      : Math.round((displacementCc / 5733) * (cfg.powertrainType === 'v8_ohv' ? 545 : 460) * (1 + (cfg.boreMm - 95) * 0.005));
  const estTorqueNm =
    cfg.powertrainType === 'axial_flux_ev'
      ? Math.round(estPowerHp * 1.38)
      : Math.round((displacementCc / 5733) * 685 * (cfg.strokeMm / 88.4));

  // Tolerance thresholds per GD&T class
  const tolMap: Record<CustomDesignConfig['toleranceClass'], { linearMm: number; pilotMm: number; label: string }> = {
    iso_2768_mk: { linearMm: 0.3, pilotMm: 0.18, label: 'ISO 2768-mK (±0.30 mm)' },
    iso_2768_fh: { linearMm: 0.15, pilotMm: 0.12, label: 'ISO 2768-fH (±0.15 mm)' },
    asme_y14_5_precision: { linearMm: 0.08, pilotMm: 0.08, label: 'ASME Y14.5 (Ø0.08 mm)' },
    agma_q12_motorsport: { linearMm: 0.05, pilotMm: 0.05, label: 'AGMA Q12 (±0.05 mm)' },
  };
  const activeTol = tolMap[cfg.toleranceClass];

  // Exact real-world attachment datum coordinates relative to Front Axle Centerline X=0, Ground Y=0, Vehicle CL Z=0
  const halfTrack = Number((cfg.trackWidthMm / 2).toFixed(1));
  const engineBlockLenMm = cfg.powertrainType === 'inline6_dohc' ? 760 : cfg.powertrainType === 'axial_flux_ev' ? 420 : 540;
  const mountX = Number((cfg.engineSetbackMm + engineBlockLenMm * 0.45).toFixed(1));
  const bellhousingFaceX = Number((cfg.engineSetbackMm + engineBlockLenMm).toFixed(1));
  const bellMateErr = Number(Math.abs(cfg.bellhousingOffsetMm).toFixed(3));
  const bellAligned = bellMateErr <= activeTol.pilotMm;

  const rearAxleX = Number(cfg.wheelbaseMm.toFixed(1));
  const hubHeightY = Number((cfg.brakeRotorDiaMm * 0.86).toFixed(1));
  const wingPylonX = Number((cfg.wheelbaseMm + 340).toFixed(1));

  const datums: AttachmentDatumSpec[] = [
    {
      id: 'DAT-A1',
      name: 'Datum A1/A2 — Engine Cradle Motor Mounts',
      interfaceType: 'ISO-M12 Shear Pad / Polyurethane Bush',
      coordsMm: [mountX, Number((cfg.crankHeightMm - 42).toFixed(1)), 228.6],
      fastenerOrPilot: '4× M12×1.5 Class 10.9 (98 Nm)',
      toleranceSpec: activeTol.label,
      mateErrorMm: 0.015,
      aligned: true,
    },
    {
      id: 'DAT-B',
      name: 'Datum B — Engine-to-Bellhousing Pilot Flange',
      interfaceType:
        cfg.powertrainType === 'axial_flux_ev'
          ? 'Coaxial e-Axle Spline Coupler'
          : 'SFI 6.1 Dowel-Aligned Bellhousing',
      coordsMm: [Number((bellhousingFaceX + cfg.bellhousingOffsetMm).toFixed(1)), cfg.crankHeightMm, 0],
      fastenerOrPilot: '2× Ø10.90 mm Offset Dowels + 6× 3/8"-16 Bolts',
      toleranceSpec: `Max Axial Delta ≤ ±${activeTol.pilotMm.toFixed(2)} mm`,
      mateErrorMm: bellMateErr,
      aligned: bellAligned,
    },
    {
      id: 'DAT-C-FL',
      name: 'Datum C1/C2 — Front Left & Right Hub / Upright Pickups',
      interfaceType:
        cfg.suspensionType === 'double_wishbone'
          ? 'Upper/Lower Spherical A-Arm Pickups'
          : cfg.suspensionType === 'pushrod_inboard'
          ? 'Bellcrank Pushrod + Wishbone Hardpoints'
          : 'CNC Strut Knuckle + Lower Control Arm',
      coordsMm: [0, hubHeightY, halfTrack],
      fastenerOrPilot: '5×114.3 / Centerlock · 4× M14 Ball Joint Taper',
      toleranceSpec: `Camber Datum ±0.05° / ${activeTol.label}`,
      mateErrorMm: 0.02,
      aligned: true,
    },
    {
      id: 'DAT-C-RL',
      name: 'Datum C3/C4 — Rear Left & Right Hub / Axle Pickups',
      interfaceType: 'Rear Toe-Link & Subframe Upright Mount',
      coordsMm: [rearAxleX, hubHeightY, halfTrack],
      fastenerOrPilot: 'CV Halfshaft 31-Spline + M14 Eccentric Cam Bolt',
      toleranceSpec: `Track Parallelism ±${activeTol.linearMm.toFixed(2)} mm`,
      mateErrorMm: 0.025,
      aligned: true,
    },
    {
      id: 'DAT-D',
      name: 'Datum D — Rear Subframe Aero Pylon Hardpoints',
      interfaceType:
        cfg.aeroPackage === 'none'
          ? 'Plugged Rear Crash-Box Bosses'
          : 'Swan-Neck Billet Shear Clevis',
      coordsMm: [wingPylonX, 980, 445],
      fastenerOrPilot: '4× AN-6 Titanium Shear Bolts (62 Nm)',
      toleranceSpec: `Angle of Attack ±0.10° (${cfg.wingAngleDeg}°)`,
      mateErrorMm: 0.03,
      aligned: true,
    },
  ];

  const totalCostUsd = Math.round(
    chassisMass * MATERIAL_COST_USD_PER_KG[cfg.chassisMaterial] * 2.5 +
      engineBlockMass * MATERIAL_COST_USD_PER_KG[cfg.engineBlockMaterial] * 3.1 +
      headMass * MATERIAL_COST_USD_PER_KG[cfg.cylinderHeadMaterial] * 3.2 +
      exhaustMass * MATERIAL_COST_USD_PER_KG[cfg.exhaustMaterial] * 3.8 +
      transMass * MATERIAL_COST_USD_PER_KG[cfg.transmissionMaterial] * 2.9 +
      cornersMass * 0.32 * MATERIAL_COST_USD_PER_KG[cfg.rotorMaterial] * 2.4 +
      aeroMass * MATERIAL_COST_USD_PER_KG[cfg.aeroMaterial] * 3.2 +
      9800
  );

  const chassisStiffBase =
    cfg.chassisStyle === 'carbon_monocoque'
      ? 48500
      : cfg.chassisStyle === 'ev_skateboard'
      ? 36000
      : cfg.chassisStyle === 'tubular_spaceframe'
      ? 24500
      : 11200;
  const torsionalStiffnessNmDeg = Math.round(
    chassisStiffBase * (chassisMat.youngsModulusGPa / 120) * (0.7 + 0.3 * gaugeRatio)
  );

  const safetyFactor = Number(
    Math.min(
      chassisMat.yieldStrengthMPa / 165,
      blockMat.yieldStrengthMPa / 145,
      uprightMat.yieldStrengthMPa / 225
    ).toFixed(2)
  );

  return {
    totalMassKg,
    frontWeightPct,
    rearWeightPct,
    displacementCc,
    estPowerHp,
    estTorqueNm,
    totalCostUsd,
    torsionalStiffnessNmDeg,
    safetyFactor: Math.max(1.2, Math.min(4.8, safetyFactor)),
    overallAligned: datums.every((d) => d.aligned),
    datums,
  };
}

export const ASSEMBLY_PROFILES: Record<AssemblyId, AssemblyProfile> = {
  sbc350: {
    id: 'sbc350',
    domain: 'aerospace',
    code: 'SBC-350',
    name: 'SBC-350 Supersonic Business Craft',
    classification: 'Low-Boom Laminar Twinjet',
    role: 'Mach 1.45 Long-Range Transoceanic Airframe',
    defaults: {
      wingspanM: 19.6,
      sweepDeg: 38,
      fuselageLengthM: 28.4,
      nacelleScale: 1.0,
      skinGaugeMm: 2.4,
      ribDensity: 12,
      bypassRatio: 3.2,
      exploded: 0,
      sectionCutX: -1,
    },
    defaultMaterials: {
      airframe: 'cfrp_t800',
      wings: 'al_7075',
      propulsion: 'inconel_718',
      internal: 'ti_6al4v',
    },
    bounds: {
      wingspanMin: 14.0,
      wingspanMax: 26.0,
      wingspanLabel: 'Wingspan (m)',
      sweepMin: 20,
      sweepMax: 52,
      sweepLabel: 'Leading-Edge Sweep (°)',
      lengthMin: 22.0,
      lengthMax: 34.0,
      lengthLabel: 'Fuselage Length (m)',
    },
    partDescriptions: {
      airframe: { label: 'Sears-Haack Pressure Fuselage & Radome', volumeSharePct: 38, baselineVolumeM3: 2.35 },
      wings: { label: 'Supercritical Swept Wings & V-Tail', volumeSharePct: 29, baselineVolumeM3: 1.85 },
      propulsion: { label: 'Twin Low-Bypass Nacelles & Nozzles', volumeSharePct: 18, baselineVolumeM3: 0.62 },
      internal: { label: 'Titanium Wing Box Spars & Ring Bulkheads', volumeSharePct: 15, baselineVolumeM3: 0.78 },
    },
  },
  hx900: {
    id: 'hx900',
    domain: 'aerospace',
    code: 'HX-900',
    name: 'HX-900 Geared Axial Turbofan',
    classification: 'High-Bypass Propulsion Unit',
    role: '145 kN Commercial & Supersonic Testbed Core',
    defaults: {
      wingspanM: 3.1,
      sweepDeg: 32,
      fuselageLengthM: 5.4,
      nacelleScale: 1.0,
      skinGaugeMm: 3.2,
      ribDensity: 10,
      bypassRatio: 9.2,
      exploded: 0,
      sectionCutX: -1,
    },
    defaultMaterials: {
      airframe: 'cfrp_t800',
      wings: 'ti_6al4v',
      propulsion: 'inconel_718',
      internal: 'peek_cf30',
    },
    bounds: {
      wingspanMin: 2.2,
      wingspanMax: 3.9,
      wingspanLabel: 'Fan Cowl Diameter (m)',
      sweepMin: 18,
      sweepMax: 46,
      sweepLabel: 'Fan Blade Pitch (°)',
      lengthMin: 4.2,
      lengthMax: 6.8,
      lengthLabel: 'Axial Core Length (m)',
    },
    partDescriptions: {
      airframe: { label: 'Acoustic Bypass Duct & Intake Barrel', volumeSharePct: 32, baselineVolumeM3: 0.85 },
      wings: { label: '22-Blade Swept Titanium Fan Stage', volumeSharePct: 24, baselineVolumeM3: 0.42 },
      propulsion: { label: 'Annular Combustor & Chevron Nozzle', volumeSharePct: 28, baselineVolumeM3: 0.36 },
      internal: { label: '8-Stage HP Compressor & Gear Shaft', volumeSharePct: 16, baselineVolumeM3: 0.31 },
    },
  },
  ares4: {
    id: 'ares4',
    domain: 'aerospace',
    code: 'ARES-IV',
    name: 'Ares-IV Orbital Crew Vehicle',
    classification: 'LEO/Cis-Lunar Re-entry Capsule',
    role: 'Mach 25 Ablative Capsule & Service Module',
    defaults: {
      wingspanM: 14.8,
      sweepDeg: 28,
      fuselageLengthM: 8.6,
      nacelleScale: 1.0,
      skinGaugeMm: 3.8,
      ribDensity: 14,
      bypassRatio: 4.5,
      exploded: 0,
      sectionCutX: -1,
    },
    defaultMaterials: {
      airframe: 'ti_6al4v',
      wings: 'cfrp_t800',
      propulsion: 'inconel_718',
      internal: 'al_7075',
    },
    bounds: {
      wingspanMin: 10.0,
      wingspanMax: 20.0,
      wingspanLabel: 'Solar Array Span (m)',
      sweepMin: 18,
      sweepMax: 36,
      sweepLabel: 'Capsule Frustum Angle (°)',
      lengthMin: 6.8,
      lengthMax: 11.2,
      lengthLabel: 'Stack Height (m)',
    },
    partDescriptions: {
      airframe: { label: 'Pressure Hull & PICA-X Heatshield Base', volumeSharePct: 40, baselineVolumeM3: 1.45 },
      wings: { label: 'Articulated Photovoltaic Array Wings', volumeSharePct: 20, baselineVolumeM3: 0.48 },
      propulsion: { label: 'Regenerative Bell Nozzle & RCS Quads', volumeSharePct: 22, baselineVolumeM3: 0.38 },
      internal: { label: 'Orbital Docking Collar & Crew Bulkhead', volumeSharePct: 18, baselineVolumeM3: 0.64 },
    },
  },
  sbc350_v8: {
    id: 'sbc350_v8',
    domain: 'automotive',
    code: 'SBC-350-V8',
    name: 'SBC-350 5.7L Billet V8 Powertrain',
    classification: '90° Crossplane Performance Engine',
    role: '5-Axis CNC Billet Small-Block V8 (GM-3970010 CAD Spec)',
    defaults: {
      wingspanM: 0.72,
      sweepDeg: 45,
      fuselageLengthM: 0.78,
      nacelleScale: 1.0,
      skinGaugeMm: 4.2,
      ribDensity: 8,
      bypassRatio: 11.2,
      exploded: 0,
      sectionCutX: -1,
    },
    defaultMaterials: {
      airframe: 'chevy_orange_enamel',
      wings: 'polished_billet_al',
      propulsion: 'inconel_718',
      internal: 'forged_4340',
    },
    bounds: {
      wingspanMin: 0.62,
      wingspanMax: 0.88,
      wingspanLabel: 'Bank Width (m)',
      sweepMin: 30,
      sweepMax: 52,
      sweepLabel: 'V-Bank Half-Angle (°)',
      lengthMin: 0.68,
      lengthMax: 0.94,
      lengthLabel: 'Block Length (m)',
    },
    partDescriptions: {
      airframe: { label: 'GM-3970010 4-Bolt Main Billet Block & Sump', volumeSharePct: 44, baselineVolumeM3: 0.032 },
      wings: { label: 'CNC Ported Cylinder Heads & Carbon Plenum', volumeSharePct: 24, baselineVolumeM3: 0.019 },
      propulsion: { label: '4-into-1 Equal-Length Tubular Headers', volumeSharePct: 16, baselineVolumeM3: 0.0065 },
      internal: { label: '4340/Ti Forged Crankshaft, Rods & Serpentine Drive', volumeSharePct: 16, baselineVolumeM3: 0.011 },
    },
  },
  transmission_t56: {
    id: 'transmission_t56',
    domain: 'automotive',
    code: 'TRM-T56-CNC',
    name: 'Tremec T-56 / 8HP Billet Gearbox & Bellhousing',
    classification: '6-Speed Sequential / Helical Transaxle',
    role: '950 Nm Rated 5-Axis CNC Billet Case & AGMA Q12 Helical Gearset',
    defaults: {
      wingspanM: 0.44,
      sweepDeg: 22,
      fuselageLengthM: 0.84,
      nacelleScale: 1.0,
      skinGaugeMm: 4.5,
      ribDensity: 12,
      bypassRatio: 2.66,
      exploded: 0,
      sectionCutX: -1,
    },
    defaultMaterials: {
      airframe: 'al_356_t6',
      wings: 'magnesium_az91d',
      propulsion: 'al_7075',
      internal: 'carburized_9310',
    },
    bounds: {
      wingspanMin: 0.36,
      wingspanMax: 0.56,
      wingspanLabel: 'Bellhousing Ø (m)',
      sweepMin: 14,
      sweepMax: 32,
      sweepLabel: 'Gear Helix Angle (°)',
      lengthMin: 0.68,
      lengthMax: 1.08,
      lengthLabel: 'Gearbox Length (m)',
    },
    partDescriptions: {
      airframe: { label: 'Ribbed A356/7075 Main Gearbox Case & Tailhousing', volumeSharePct: 38, baselineVolumeM3: 0.016 },
      wings: { label: 'SFI 6.1 Bellhousing & Clutch Inspection Dome', volumeSharePct: 22, baselineVolumeM3: 0.0085 },
      propulsion: { label: 'Billet Shift Tower & Oil Cooler Manifold', volumeSharePct: 14, baselineVolumeM3: 0.0042 },
      internal: { label: '9310 Carburized 26-Spline Input & AGMA Q12 Gearset', volumeSharePct: 26, baselineVolumeM3: 0.0115 },
    },
  },
  ev_axial_drive: {
    id: 'ev_axial_drive',
    domain: 'automotive',
    code: 'AXF-900V',
    name: '900V Dual Axial-Flux EV Drive Unit',
    classification: 'SiC Inverter & Planetary e-Axle',
    role: '780 kW Dual-Rotor Motorsport & Hypercar Powertrain',
    defaults: {
      wingspanM: 0.58,
      sweepDeg: 24,
      fuselageLengthM: 0.66,
      nacelleScale: 1.0,
      skinGaugeMm: 3.4,
      ribDensity: 12,
      bypassRatio: 9.8,
      exploded: 0,
      sectionCutX: -1,
    },
    defaultMaterials: {
      airframe: 'al_6061_t6',
      wings: 'peek_cf30',
      propulsion: 'inconel_718',
      internal: 'ti_6al4v',
    },
    bounds: {
      wingspanMin: 0.46,
      wingspanMax: 0.74,
      wingspanLabel: 'Stator Housing Dia (m)',
      sweepMin: 14,
      sweepMax: 36,
      sweepLabel: 'Helical Gear Angle (°)',
      lengthMin: 0.52,
      lengthMax: 0.86,
      lengthLabel: 'e-Axle Span (m)',
    },
    partDescriptions: {
      airframe: { label: 'Finned Liquid-Cooled Stator Barrel', volumeSharePct: 36, baselineVolumeM3: 0.018 },
      wings: { label: '900V Silicon-Carbide Inverter Enclosure', volumeSharePct: 24, baselineVolumeM3: 0.014 },
      propulsion: { label: 'Dual Permanent-Magnet Rotor Discs', volumeSharePct: 22, baselineVolumeM3: 0.008 },
      internal: { label: 'Titanium Planetary Reduction & Output Halfshafts', volumeSharePct: 18, baselineVolumeM3: 0.0095 },
    },
  },
  monoblock_brake: {
    id: 'monoblock_brake',
    domain: 'automotive',
    code: 'CCB-6P-390',
    name: '6-Piston Monoblock & Carbon-Ceramic Corner',
    classification: 'CNC Upright & Unsprung Brake Assembly',
    role: '390mm Floating Carbon-Ceramic Rotor + 5-Axis Billet Caliper',
    defaults: {
      wingspanM: 0.42,
      sweepDeg: 18,
      fuselageLengthM: 0.46,
      nacelleScale: 1.0,
      skinGaugeMm: 3.6,
      ribDensity: 10,
      bypassRatio: 6.0,
      exploded: 0,
      sectionCutX: -1,
    },
    defaultMaterials: {
      airframe: 'carbon_ceramic_sic',
      wings: 'al_7075',
      propulsion: 'ti_6al4v',
      internal: 'ti_6al4v',
    },
    bounds: {
      wingspanMin: 0.34,
      wingspanMax: 0.48,
      wingspanLabel: 'Rotor Diameter (m)',
      sweepMin: 10,
      sweepMax: 28,
      sweepLabel: 'Vane Swept Angle (°)',
      lengthMin: 0.38,
      lengthMax: 0.56,
      lengthLabel: 'Upright Envelope (m)',
    },
    partDescriptions: {
      airframe: { label: '390mm Cross-Drilled C/SiC Friction Ring', volumeSharePct: 34, baselineVolumeM3: 0.0052 },
      wings: { label: '5-Axis Forged 6-Piston Monoblock Caliper', volumeSharePct: 26, baselineVolumeM3: 0.0024 },
      propulsion: { label: 'Ventilated Titanium Pistons & Floating Bobbins', volumeSharePct: 18, baselineVolumeM3: 0.0011 },
      internal: { label: 'DMLS Ti-6Al-4V Topology Wheel Upright', volumeSharePct: 22, baselineVolumeM3: 0.0029 },
    },
  },
  active_aero_chassis: {
    id: 'active_aero_chassis',
    domain: 'automotive',
    code: 'DRS-AERO-X',
    name: 'Active Carbon-PEEK Wing & Forged Subframe',
    classification: 'Multi-Element DRS & Rear Subframe CAD',
    role: '1,150 kg Peak Downforce Swan-Neck Active Aero & Subframe',
    defaults: {
      wingspanM: 1.92,
      sweepDeg: 14,
      fuselageLengthM: 1.35,
      nacelleScale: 1.0,
      skinGaugeMm: 2.2,
      ribDensity: 8,
      bypassRatio: 4.2,
      exploded: 0,
      sectionCutX: -1,
    },
    defaultMaterials: {
      airframe: 'al_6061_t6',
      wings: 'cfrp_t800',
      propulsion: 'ti_6al4v',
      internal: 'forged_carbon_smc',
    },
    bounds: {
      wingspanMin: 1.5,
      wingspanMax: 2.25,
      wingspanLabel: 'Wing Span (m)',
      sweepMin: 4,
      sweepMax: 28,
      sweepLabel: 'DRS Flap Angle (°)',
      lengthMin: 1.05,
      lengthMax: 1.75,
      lengthLabel: 'Subframe Length (m)',
    },
    partDescriptions: {
      airframe: { label: 'Extruded Rear Crash Subframe & Diffuser Tunnel', volumeSharePct: 36, baselineVolumeM3: 0.016 },
      wings: { label: 'Dual-Element Cambered Airfoil & DRS Flap', volumeSharePct: 32, baselineVolumeM3: 0.012 },
      propulsion: { label: 'CNC Swan-Neck Pylons & Hydraulic Actuators', volumeSharePct: 16, baselineVolumeM3: 0.0032 },
      internal: { label: 'Endplate Vortex Strakes & Titanium Mounts', volumeSharePct: 16, baselineVolumeM3: 0.0041 },
    },
  },
  custom_build: {
    id: 'custom_build',
    domain: 'automotive',
    code: 'AF-CUSTOM-01',
    name: 'Custom Engineered Vehicle Assembly',
    classification: 'Parametric Multi-Datum Vehicle Architecture',
    role: 'Full Chassis, Powertrain, Gearbox, Suspension & Aero Integration',
    defaults: {
      wingspanM: 1.62,
      sweepDeg: 12,
      fuselageLengthM: 2.74,
      nacelleScale: 1.0,
      skinGaugeMm: 3.2,
      ribDensity: 10,
      bypassRatio: 2.66,
      exploded: 0,
      sectionCutX: -1,
    },
    defaultMaterials: {
      airframe: 'chromoly_4130',
      wings: 'cfrp_t800',
      propulsion: 'inconel_718',
      internal: 'al_7075',
    },
    bounds: {
      wingspanMin: 1.35,
      wingspanMax: 1.95,
      wingspanLabel: 'Track Width (m)',
      sweepMin: 0,
      sweepMax: 30,
      sweepLabel: 'Rear Wing Angle (°)',
      lengthMin: 2.2,
      lengthMax: 3.4,
      lengthLabel: 'Wheelbase (m)',
    },
    partDescriptions: {
      airframe: { label: 'Primary Chassis Frame / Carbon Monocoque', volumeSharePct: 38, baselineVolumeM3: 0.048 },
      wings: { label: 'Cylinder Heads, Carbon Aero Wing & Diffuser', volumeSharePct: 22, baselineVolumeM3: 0.024 },
      propulsion: { label: 'Engine Block, Inconel Headers & Gearbox Housing', volumeSharePct: 24, baselineVolumeM3: 0.032 },
      internal: { label: 'Forged Rotating Assy, Gearset & 4× Hub Uprights', volumeSharePct: 16, baselineVolumeM3: 0.021 },
    },
  },
};

export function computeAerospaceSpecs(
  assemblyId: AssemblyId,
  params: ParametricConfig,
  materials: SubsystemMaterials
): ComputedSpecs {
  const profile = ASSEMBLY_PROFILES[assemblyId];
  const gaugeFactor = params.skinGaugeMm / profile.defaults.skinGaugeMm;
  const spanFactor = params.wingspanM / profile.defaults.wingspanM;
  const lengthFactor = params.fuselageLengthM / profile.defaults.fuselageLengthM;
  const ribFactor = params.ribDensity / profile.defaults.ribDensity;

  const subsystemScalars: Record<SubsystemKey, number> = {
    airframe: lengthFactor * (0.65 + 0.35 * gaugeFactor),
    wings: spanFactor * spanFactor * 0.6 + 0.4 * gaugeFactor,
    propulsion:
      params.nacelleScale *
      params.nacelleScale *
      (0.7 + 0.3 * (params.bypassRatio / Math.max(1, profile.defaults.bypassRatio))),
    internal: lengthFactor * ribFactor * (0.6 + 0.4 * gaugeFactor),
  };

  const partLabels: Record<SubsystemKey, { code: string; name: string }> = {
    airframe: { code: `${profile.code}-100`, name: profile.partDescriptions.airframe.label },
    wings: { code: `${profile.code}-200`, name: profile.partDescriptions.wings.label },
    propulsion: { code: `${profile.code}-300`, name: profile.partDescriptions.propulsion.label },
    internal: { code: `${profile.code}-400`, name: profile.partDescriptions.internal.label },
  };

  let emptyMassKg = 0;
  let weightedRecyclability = 0;
  let totalEmbodiedCo2Kg = 0;
  let estimatedUnitCostUsd = 0;
  let minSafetyFactor = 99;
  let minThermalMargin = 999;

  const expectedLoadMPa: Record<SubsystemKey, number> = {
    airframe: assemblyId === 'ares4' ? 210 : profile.domain === 'automotive' ? 145 : 185,
    wings: assemblyId === 'sbc350' ? 245 : profile.domain === 'automotive' ? 175 : 220,
    propulsion: profile.domain === 'automotive' ? 250 : 340,
    internal: 235,
  };

  const expectedOperatingTempC: Record<SubsystemKey, number> = {
    airframe: assemblyId === 'ares4' ? 240 : profile.domain === 'automotive' ? 105 : 115,
    wings: assemblyId === 'sbc350' ? 128 : profile.domain === 'automotive' ? 95 : 95,
    propulsion: assemblyId === 'sbc350_v8' ? 480 : assemblyId === 'monoblock_brake' ? 360 : 540,
    internal: 85,
  };

  const bom: BomRow[] = (['airframe', 'wings', 'propulsion', 'internal'] as SubsystemKey[]).map(
    (key) => {
      const mat = AEROSPACE_MATERIALS[materials[key]];
      const baseVol = profile.partDescriptions[key].baselineVolumeM3;
      const effectiveVolM3 = baseVol * subsystemScalars[key];
      const massKg = Math.max(1, Math.round(effectiveVolM3 * mat.densityGCm3 * 1000));
      const stressMultiplier =
        (gaugeFactor * 0.65 + 0.35) / Math.max(0.75, spanFactor * 0.55 + 0.45);
      const safetyFactor = Number(
        ((mat.yieldStrengthMPa / expectedLoadMPa[key]) * stressMultiplier).toFixed(2)
      );
      const thermalMargin = mat.maxServiceTempC - expectedOperatingTempC[key];

      if (safetyFactor < minSafetyFactor) minSafetyFactor = safetyFactor;
      if (thermalMargin < minThermalMargin) minThermalMargin = thermalMargin;

      const co2e = Math.round(massKg * mat.embodiedCo2KgPerKg);
      const camFactor = key === 'internal' || key === 'propulsion' ? 3.4 : 2.6;
      const unitCostUsd = Math.round(massKg * MATERIAL_COST_USD_PER_KG[mat.id] * camFactor + 280);

      emptyMassKg += massKg;
      weightedRecyclability += massKg * mat.recyclabilityPct;
      totalEmbodiedCo2Kg += co2e;
      estimatedUnitCostUsd += unitCostUsd;

      return {
        partNumber: partLabels[key].code,
        subsystem: key,
        componentName: partLabels[key].name,
        materialName: mat.name,
        materialDesignation: mat.designation,
        massKg,
        safetyFactor,
        maxTempC: mat.maxServiceTempC,
        recyclabilityPct: mat.recyclabilityPct,
        co2eKg: co2e,
        unitCostUsd,
      };
    }
  );

  const compositeRecyclabilityPct = Number(
    (weightedRecyclability / Math.max(1, emptyMassKg)).toFixed(1)
  );

  if (assemblyId === 'sbc350') {
    const wingAreaM2 = Number(
      (params.wingspanM * (params.wingspanM / (5.6 - (params.sweepDeg - 30) * 0.03))).toFixed(1)
    );
    const aspectRatio = Number(((params.wingspanM * params.wingspanM) / wingAreaM2).toFixed(2));
    const fuelPayloadKg = Math.round(8400 * lengthFactor);
    const mtowKg = emptyMassKg + fuelPayloadKg;
    const wingLoadingKgM2 = Number((mtowKg / wingAreaM2).toFixed(1));
    const totalThrustKN = Number(
      (
        2 *
        56.5 *
        params.nacelleScale *
        params.nacelleScale *
        (1 + 0.04 * (params.bypassRatio - 3.2))
      ).toFixed(1)
    );
    const thrustToWeight = Number(((totalThrustKN * 1000) / (mtowKg * 9.80665)).toFixed(3));
    const sweepBonus = (params.sweepDeg - 30) * 0.012;
    const cruiseMach = Number(
      Math.max(0.88, Math.min(1.85, 1.38 + sweepBonus - (params.bypassRatio - 3.2) * 0.045)).toFixed(2)
    );
    const maxVelocityKts = Math.round(cruiseMach * 573);
    const serviceCeilingFt = Math.round(49000 + (params.wingspanM - 16) * 420);
    const tsfcKgKNH = Number((0.68 - (params.bypassRatio - 3.2) * 0.042).toFixed(3));
    const rangeNm = Math.round((fuelPayloadKg / Math.max(0.35, tsfcKgKNH)) * 0.36 * (aspectRatio / 5.2));
    const cgStationM = Number((params.fuselageLengthM * 0.46 + (params.sweepDeg - 35) * 0.03).toFixed(2));
    const finenessRatio = Number((params.fuselageLengthM / 2.45).toFixed(2));

    return {
      emptyMassKg,
      fuelPayloadKg,
      mtowKg,
      wingAreaM2,
      aspectRatio,
      wingLoadingKgM2,
      totalThrustKN,
      thrustToWeight,
      cruiseMach,
      maxVelocityKts,
      serviceCeilingFt,
      rangeNm,
      cgStationM,
      finenessRatio,
      structuralSafetyFactor: minSafetyFactor,
      thermalMarginC: Math.round(minThermalMargin),
      compositeRecyclabilityPct,
      totalEmbodiedCo2Kg,
      tsfcKgKNH,
      estimatedUnitCostUsd,
      bom,
    };
  }

  if (assemblyId === 'hx900') {
    const fanArea = Math.PI * Math.pow(params.wingspanM / 2, 2);
    const wingAreaM2 = Number(fanArea.toFixed(2));
    const aspectRatio = Number((params.fuselageLengthM / params.wingspanM).toFixed(2));
    const mtowKg = emptyMassKg;
    const totalThrustKN = Number(
      (
        145 *
        Math.pow(params.wingspanM / 3.1, 2) *
        params.nacelleScale *
        (0.85 + 0.02 * params.bypassRatio)
      ).toFixed(1)
    );
    const wingLoadingKgM2 = Number((totalThrustKN / fanArea).toFixed(1));
    const thrustToWeight = Number(((totalThrustKN * 1000) / (emptyMassKg * 9.80665)).toFixed(2));
    const cruiseMach = Number(Math.max(0.76, Math.min(1.15, 0.92 - (params.bypassRatio - 8) * 0.02)).toFixed(2));
    const tsfcKgKNH = Number(Math.max(0.28, 0.54 - (params.bypassRatio - 4) * 0.028).toFixed(3));
    return {
      emptyMassKg,
      fuelPayloadKg: 0,
      mtowKg,
      wingAreaM2,
      aspectRatio,
      wingLoadingKgM2,
      totalThrustKN,
      thrustToWeight,
      cruiseMach,
      maxVelocityKts: Math.round(cruiseMach * 573),
      serviceCeilingFt: 45000,
      rangeNm: Math.round(6200 * (0.5 / tsfcKgKNH)),
      cgStationM: Number((params.fuselageLengthM * 0.41).toFixed(2)),
      finenessRatio: Number((params.fuselageLengthM / params.wingspanM).toFixed(2)),
      structuralSafetyFactor: minSafetyFactor,
      thermalMarginC: Math.round(minThermalMargin),
      compositeRecyclabilityPct,
      totalEmbodiedCo2Kg,
      tsfcKgKNH,
      estimatedUnitCostUsd,
      bom,
    };
  }

  if (assemblyId === 'ares4') {
    const wingAreaM2 = Number((params.wingspanM * 1.9).toFixed(1));
    const aspectRatio = Number(((params.wingspanM * params.wingspanM) / wingAreaM2).toFixed(2));
    const fuelPayloadKg = Math.round(6900 * lengthFactor);
    const mtowKg = emptyMassKg + fuelPayloadKg;
    const totalThrustKN = Number((38.5 * params.nacelleScale * params.nacelleScale).toFixed(1));
    return {
      emptyMassKg,
      fuelPayloadKg,
      mtowKg,
      wingAreaM2,
      aspectRatio,
      wingLoadingKgM2: Number((mtowKg / wingAreaM2).toFixed(1)),
      totalThrustKN,
      thrustToWeight: Number(((totalThrustKN * 1000) / (mtowKg * 9.80665)).toFixed(3)),
      cruiseMach: 25.4,
      maxVelocityKts: 15100,
      serviceCeilingFt: 1312000,
      rangeNm: 2450,
      cgStationM: Number((params.fuselageLengthM * 0.54).toFixed(2)),
      finenessRatio: Number((params.fuselageLengthM / 4.8).toFixed(2)),
      structuralSafetyFactor: minSafetyFactor,
      thermalMarginC: Math.round(minThermalMargin),
      compositeRecyclabilityPct,
      totalEmbodiedCo2Kg,
      tsfcKgKNH: 0.312,
      estimatedUnitCostUsd,
      bom,
    };
  }

  // Automotive CAD/CAM Assemblies (including custom_build)
  const areaM2 = Number((params.wingspanM * params.fuselageLengthM).toFixed(2));
  const powerEquivalentKN =
    assemblyId === 'sbc350_v8'
      ? Number((5.2 * params.nacelleScale * (params.bypassRatio / 10)).toFixed(1))
      : assemblyId === 'transmission_t56'
      ? Number((9.5 * params.nacelleScale * (params.bypassRatio / 2.66)).toFixed(1))
      : assemblyId === 'ev_axial_drive'
      ? Number((7.8 * params.nacelleScale).toFixed(1))
      : assemblyId === 'active_aero_chassis'
      ? Number((11.4 * spanFactor * (params.sweepDeg / 14)).toFixed(1))
      : assemblyId === 'custom_build'
      ? Number((12.4 * params.nacelleScale * spanFactor).toFixed(1))
      : Number((18.5 * spanFactor).toFixed(1));

  return {
    emptyMassKg,
    fuelPayloadKg: 0,
    mtowKg: emptyMassKg,
    wingAreaM2: areaM2,
    aspectRatio: Number((params.wingspanM / Math.max(0.2, params.fuselageLengthM)).toFixed(2)),
    wingLoadingKgM2: Number((emptyMassKg / Math.max(0.1, areaM2)).toFixed(1)),
    totalThrustKN: powerEquivalentKN,
    thrustToWeight: Number(((powerEquivalentKN * 1000) / Math.max(1, emptyMassKg * 9.80665)).toFixed(2)),
    cruiseMach:
      assemblyId === 'sbc350_v8'
        ? 0.28
        : assemblyId === 'ev_axial_drive' || assemblyId === 'custom_build'
        ? 0.32
        : assemblyId === 'transmission_t56'
        ? 0.29
        : 0.26,
    maxVelocityKts:
      assemblyId === 'custom_build'
        ? 215
        : assemblyId === 'sbc350_v8'
        ? 185
        : assemblyId === 'transmission_t56'
        ? 195
        : 210,
    serviceCeilingFt: 14000,
    rangeNm: 380,
    cgStationM: Number((params.fuselageLengthM * 0.48).toFixed(2)),
    finenessRatio: Number((params.fuselageLengthM / Math.max(0.2, params.wingspanM)).toFixed(2)),
    structuralSafetyFactor: minSafetyFactor,
    thermalMarginC: Math.round(minThermalMargin),
    compositeRecyclabilityPct,
    totalEmbodiedCo2Kg,
    tsfcKgKNH: 0.285,
    estimatedUnitCostUsd,
    bom,
  };
}
