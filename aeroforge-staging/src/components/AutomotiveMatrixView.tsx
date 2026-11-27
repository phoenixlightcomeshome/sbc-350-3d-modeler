import { useMemo, useState } from 'react';
import {
  Box,
  Calculator,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  Layers,
  Play,
  Ruler,
  Search,
  Settings2,
  Wrench,
} from 'lucide-react';
import {
  AUTOMOTIVE_PARTS_CATALOG,
  AUTOMOTIVE_VEHICLES_MATRIX,
  computeAdjustedPartEconomics,
  ENGINE_TRANSMISSION_STANDARDS,
  ENGINEERING_DATA_SOURCES,
  INDUSTRY_TOLERANCE_SPECS,
  PUBLIC_ENGINEERING_DATABASE,
} from '../data/automotiveMatrix';
import { GLOBAL_SUPPLIER_PARTS } from '../data/globalPartsCatalog';
import { AEROSPACE_MATERIALS } from '../data/materials';
import { CAM_STRATEGIES, computeCamMachiningData, exportGCodeFile } from '../three/cadCamExporter';
import {
  ActionSequenceId,
  AssemblyId,
  AutomotiveEra,
  AutomotivePartSpec,
  CamStrategyId,
  CustomDesignConfig,
  EnvironmentId,
  GlobalRegion,
  GlobalSupplierPart,
  MaterialId,
  MatrixCategoryTab,
  MatrixPageTab,
  ProductionBatchTier,
  SubsystemMaterials,
  ToleranceStandard,
} from '../types/aerospace';

interface AutomotiveMatrixViewProps {
  onLaunchIn3DPortal: (
    assemblyId: AssemblyId,
    materials?: SubsystemMaterials,
    options?: {
      environment?: EnvironmentId;
      actionSequence?: ActionSequenceId;
      exploded?: number;
      openDrawing?: boolean;
      camSim?: boolean;
      camStrategy?: CamStrategyId;
    }
  ) => void;
  onOpenInCustomBuilder?: (patch: Partial<CustomDesignConfig>, label: string) => void;
}

const GEARBOX_PRESETS: Record<
  string,
  { label: string; ratios: { gear: string; ratio: number }[] }
> = {
  t56_magnum: {
    label: 'Tremec T-56 Magnum (6-Spd)',
    ratios: [
      { gear: '1st', ratio: 2.66 },
      { gear: '2nd', ratio: 1.78 },
      { gear: '3rd', ratio: 1.3 },
      { gear: '4th', ratio: 1.0 },
      { gear: '5th', ratio: 0.8 },
      { gear: '6th', ratio: 0.63 },
    ],
  },
  th400: {
    label: 'GM TH400 / 4L80E (3/4-Spd)',
    ratios: [
      { gear: '1st', ratio: 2.48 },
      { gear: '2nd', ratio: 1.48 },
      { gear: '3rd', ratio: 1.0 },
      { gear: '4th OD (4L80E)', ratio: 0.75 },
    ],
  },
  zf_8hp90: {
    label: 'ZF 8HP90 (8-Spd Planetary)',
    ratios: [
      { gear: '1st', ratio: 4.71 },
      { gear: '2nd', ratio: 3.14 },
      { gear: '3rd', ratio: 2.11 },
      { gear: '4th', ratio: 1.67 },
      { gear: '5th', ratio: 1.29 },
      { gear: '6th', ratio: 1.0 },
      { gear: '7th', ratio: 0.84 },
      { gear: '8th', ratio: 0.67 },
    ],
  },
  pdk_8: {
    label: 'Porsche PDK / TR-9080 (8-Spd DCT)',
    ratios: [
      { gear: '1st', ratio: 3.91 },
      { gear: '2nd', ratio: 2.29 },
      { gear: '3rd', ratio: 1.58 },
      { gear: '4th', ratio: 1.18 },
      { gear: '5th', ratio: 0.94 },
      { gear: '6th', ratio: 0.79 },
      { gear: '7th', ratio: 0.62 },
      { gear: '8th', ratio: 0.51 },
    ],
  },
};

export function AutomotiveMatrixView({
  onLaunchIn3DPortal,
  onOpenInCustomBuilder,
}: AutomotiveMatrixViewProps) {
  const [pageTab, setPageTab] = useState<MatrixPageTab>('vehicles');

  // Vehicle Library & BOM Matrix state
  const [selectedRegion, setSelectedRegion] = useState<'All' | Exclude<GlobalRegion, 'Global'>>('All');
  const [selectedEra, setSelectedEra] = useState<'All' | AutomotiveEra>('All');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMake, setSelectedMake] = useState<string>('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<MatrixCategoryTab>('all');
  const [batchTier, setBatchTier] = useState<ProductionBatchTier>('low_volume');
  const [toleranceStd, setToleranceStd] = useState<ToleranceStandard>('precision_cnc');
  const [camStrategy, setCamStrategy] = useState<CamStrategyId>('adaptive_roughing');
  const [searchQuery, setSearchQuery] = useState('');

  // Worldwide Parts Selection state
  const [gpRegion, setGpRegion] = useState<'All' | GlobalRegion>('All');
  const [gpCategory, setGpCategory] = useState<'All' | GlobalSupplierPart['category']>('All');
  const [gpSearch, setGpSearch] = useState('');

  // Engine & Transmission Standards filter state
  const [stdDomainFilter, setStdDomainFilter] = useState<'All' | 'Engine' | 'Transmission'>('All');
  const [stdSearch, setStdSearch] = useState('');

  // GD&T Tolerance Ledger filter state
  const [tolSearch, setTolSearch] = useState('');

  // Public Codes & Sources Search state
  const [pubCategoryFilter, setPubCategoryFilter] = useState<string>('All');
  const [pubSearch, setPubSearch] = useState('');

  // Interactive Design Tool 1: Engine Displacement & Kinematics Calculator
  const [calcBoreMm, setCalcBoreMm] = useState<number>(101.6);
  const [calcStrokeMm, setCalcStrokeMm] = useState<number>(88.39);
  const [calcCylinders, setCalcCylinders] = useState<number>(8);
  const [calcRpm, setCalcRpm] = useState<number>(6500);
  const [calcVePct, setCalcVePct] = useState<number>(92);

  // Interactive Design Tool 2: Transmission Ratio & Road Speed Calculator
  const [calcGearboxKey, setCalcGearboxKey] = useState<string>('t56_magnum');
  const [calcFinalDrive, setCalcFinalDrive] = useState<number>(3.73);
  const [calcTireDiaIn, setCalcTireDiaIn] = useState<number>(26.0);
  const [calcEngineTorqueNm, setCalcEngineTorqueNm] = useState<number>(680);
  const [calcTransRpm, setCalcTransRpm] = useState<number>(6200);

  // Interactive Design Tool 3: CNC Feeds/Speeds & ISO H7/g6 Fit Calculator
  const [calcCncMaterial, setCalcCncMaterial] = useState<MaterialId>('al_7075');
  const [calcToolDiaMm, setCalcToolDiaMm] = useState<number>(12.0);
  const [calcFlutes, setCalcFlutes] = useState<number>(4);
  const [calcAxialDocMm, setCalcAxialDocMm] = useState<number>(4.0);
  const [calcNominalBoreMm, setCalcNominalBoreMm] = useState<number>(62.2);

  const eraOptions: AutomotiveEra[] = [
    'Brass & Pre-War (1908–1949)',
    'Classic & Muscle (1950–1979)',
    'Group A / Golden Era (1980–2004)',
    'Modern Supercar (2005–2021)',
    '800V–900V Next-Gen (2022–2026)',
  ];

  const regionFilteredVehicles = useMemo(() => {
    return AUTOMOTIVE_VEHICLES_MATRIX.filter((v) => {
      if (selectedRegion !== 'All' && v.region !== selectedRegion) return false;
      if (selectedEra !== 'All' && v.era !== selectedEra) return false;
      return true;
    });
  }, [selectedRegion, selectedEra]);

  // Cascading Year options (1908–2026)
  const availableYears = useMemo(() => {
    return Array.from(new Set(regionFilteredVehicles.map((v) => v.year))).sort((a, b) => b - a);
  }, [regionFilteredVehicles]);

  // Cascading Make options filtered by Region/Era/Year
  const availableMakes = useMemo(() => {
    const filtered =
      selectedYear === 'all'
        ? regionFilteredVehicles
        : regionFilteredVehicles.filter((v) => v.year === Number(selectedYear));
    return Array.from(new Set(filtered.map((v) => v.make))).sort();
  }, [regionFilteredVehicles, selectedYear]);

  // Cascading Model options filtered by Region, Era, Year & Make
  const availableVehicles = useMemo(() => {
    return regionFilteredVehicles.filter((v) => {
      if (selectedYear !== 'all' && v.year !== Number(selectedYear)) return false;
      if (selectedMake !== 'all' && v.make !== selectedMake) return false;
      return true;
    });
  }, [regionFilteredVehicles, selectedYear, selectedMake]);

  const activeVehicle = useMemo(() => {
    if (selectedVehicleId !== 'all') {
      return AUTOMOTIVE_VEHICLES_MATRIX.find((v) => v.id === selectedVehicleId) ?? null;
    }
    return availableVehicles.length === 1 ? availableVehicles[0] : null;
  }, [selectedVehicleId, availableVehicles]);

  const handleRegionChange = (reg: 'All' | Exclude<GlobalRegion, 'Global'>) => {
    setSelectedRegion(reg);
    setSelectedYear('all');
    setSelectedMake('all');
    setSelectedVehicleId('all');
  };

  const handleEraChange = (era: 'All' | AutomotiveEra) => {
    setSelectedEra(era);
    setSelectedYear('all');
    setSelectedMake('all');
    setSelectedVehicleId('all');
  };

  const handleYearChange = (yr: string) => {
    setSelectedYear(yr);
    setSelectedMake('all');
    setSelectedVehicleId('all');
  };

  const handleMakeChange = (mk: string) => {
    setSelectedMake(mk);
    setSelectedVehicleId('all');
  };

  const filteredGlobalParts = useMemo(() => {
    return GLOBAL_SUPPLIER_PARTS.filter((part) => {
      if (gpRegion !== 'All' && part.region !== gpRegion) return false;
      if (gpCategory !== 'All' && part.category !== gpCategory) return false;
      if (gpSearch.trim()) {
        const q = gpSearch.toLowerCase();
        const hay =
          `${part.supplier} ${part.country} ${part.partNumber} ${part.name} ${part.compatibleVehicles} ${part.attachmentInterface} ${part.exactDimensionsMm}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [gpRegion, gpCategory, gpSearch]);

  // Filtered CAD/CAM Parts
  const filteredParts = useMemo(() => {
    let baseList: AutomotivePartSpec[];
    if (activeVehicle) {
      baseList = activeVehicle.partIds
        .map((id) => AUTOMOTIVE_PARTS_CATALOG[id])
        .filter(Boolean);
    } else if (selectedYear !== 'all' || selectedMake !== 'all') {
      const ids = new Set<string>();
      availableVehicles.forEach((v) => v.partIds.forEach((id) => ids.add(id)));
      baseList = Array.from(ids)
        .map((id) => AUTOMOTIVE_PARTS_CATALOG[id])
        .filter(Boolean);
    } else {
      baseList = Object.values(AUTOMOTIVE_PARTS_CATALOG);
    }

    return baseList.filter((part) => {
      if (activeTab !== 'all' && part.category !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay =
          `${part.partNumber} ${part.oemReference} ${part.name} ${part.camToolpath} ${part.manufacturingProcess} ${part.nominalDimensionMm}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeVehicle, selectedYear, selectedMake, availableVehicles, activeTab, searchQuery]);

  // Summary Totals for current selection
  const matrixSummary = useMemo(() => {
    let totalUnitCost = 0;
    let totalTooling = 0;
    let totalCycleMin = 0;
    let totalMass = 0;
    filteredParts.forEach((part) => {
      const econ = computeAdjustedPartEconomics(part, batchTier, toleranceStd);
      totalUnitCost += econ.totalPerUnitUsd;
      totalTooling += part.toolingCostUsd;
      totalCycleMin += econ.adjustedCycleMin;
      totalMass += part.massKg;
    });
    return {
      count: filteredParts.length,
      totalUnitCost,
      totalTooling,
      totalCycleMin,
      totalMass: Number(totalMass.toFixed(1)),
    };
  }, [filteredParts, batchTier, toleranceStd]);

  // Filtered Engine & Transmission Standards
  const filteredStandards = useMemo(() => {
    return ENGINE_TRANSMISSION_STANDARDS.filter((s) => {
      if (stdDomainFilter !== 'All' && s.domain !== stdDomainFilter) return false;
      if (stdSearch.trim()) {
        const q = stdSearch.toLowerCase();
        const hay =
          `${s.code} ${s.name} ${s.architecture} ${s.exactDimensions} ${s.ratiosOrDisplacement} ${s.referenceSource}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [stdDomainFilter, stdSearch]);

  // Filtered GD&T Tolerances
  const filteredTolerances = useMemo(() => {
    if (!tolSearch.trim()) return INDUSTRY_TOLERANCE_SPECS;
    const q = tolSearch.toLowerCase();
    return INDUSTRY_TOLERANCE_SPECS.filter((t) =>
      `${t.featureName} ${t.subsystem} ${t.gdtCallout} ${t.standardRef} ${t.nominalMm}`
        .toLowerCase()
        .includes(q)
    );
  }, [tolSearch]);

  // Filtered Public Engineering Database
  const filteredPublicDb = useMemo(() => {
    return PUBLIC_ENGINEERING_DATABASE.filter((rec) => {
      if (pubCategoryFilter !== 'All' && rec.category !== pubCategoryFilter) return false;
      if (pubSearch.trim()) {
        const q = pubSearch.toLowerCase();
        const hay =
          `${rec.code} ${rec.title} ${rec.specification} ${rec.dimensionsAndLimits} ${rec.sourceOrganization}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [pubCategoryFilter, pubSearch]);

  const exportMatrixCsv = () => {
    const header = [
      'Part Number',
      'OEM Reference',
      'Component Name',
      'Category',
      'Material',
      'Nominal Dimensions (mm)',
      'Manufacturing Process',
      'CAM Toolpath',
      'Tolerance',
      'Mass (kg)',
      'Adjusted Unit Cost ($)',
      'Amortized Tooling ($)',
      'Total Per Unit ($)',
      'Tooling Setup ($)',
      'Cycle Time (min)',
      'Lead Time (days)',
      'Data Source',
    ];
    const rows = filteredParts.map((part) => {
      const econ = computeAdjustedPartEconomics(part, batchTier, toleranceStd);
      const mat = AEROSPACE_MATERIALS[part.materialId];
      return [
        part.partNumber,
        `"${part.oemReference}"`,
        `"${part.name}"`,
        part.category,
        `"${mat.name}"`,
        `"${part.nominalDimensionMm}"`,
        `"${part.manufacturingProcess}"`,
        `"${part.camToolpath}"`,
        `"${part.toleranceSpec}"`,
        part.massKg,
        econ.adjustedUnitCostUsd,
        econ.amortizedToolingPerUnitUsd,
        econ.totalPerUnitUsd,
        part.toolingCostUsd,
        econ.adjustedCycleMin,
        part.leadTimeDays,
        `"${part.dataSource}"`,
      ].join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aeroforge_automotive_cad_cam_matrix.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const futureTechShowcase = useMemo(
    () => Object.values(AUTOMOTIVE_PARTS_CATALOG).filter((p) => p.isFutureTech),
    []
  );

  // Calculator 1 derived metrics
  const engineCalc = useMemo(() => {
    const boreCm = calcBoreMm / 10;
    const strokeCm = calcStrokeMm / 10;
    const sweptCc = Math.PI * Math.pow(boreCm / 2, 2) * strokeCm * calcCylinders;
    const cid = sweptCc / 16.387064;
    const meanPistonMs = (2 * (calcStrokeMm / 1000) * calcRpm) / 60;
    const meanPistonFpm = meanPistonMs * 196.85;
    const cfmDemand = (cid * calcRpm * (calcVePct / 100)) / 3456;
    const estHp = Math.round((sweptCc / 1000) * (calcRpm / 6000) * (calcVePct / 100) * 98);
    return {
      sweptCc: Math.round(sweptCc),
      liters: (sweptCc / 1000).toFixed(2),
      cid: cid.toFixed(1),
      meanPistonMs: meanPistonMs.toFixed(2),
      meanPistonFpm: Math.round(meanPistonFpm),
      cfmDemand: Math.round(cfmDemand),
      estHp,
    };
  }, [calcBoreMm, calcStrokeMm, calcCylinders, calcRpm, calcVePct]);

  // Calculator 2 derived metrics
  const transCalcRows = useMemo(() => {
    const preset = GEARBOX_PRESETS[calcGearboxKey] ?? GEARBOX_PRESETS.t56_magnum;
    const tireCircMiles = (calcTireDiaIn * Math.PI) / 63360;
    return preset.ratios.map((g) => {
      const totalRatio = g.ratio * calcFinalDrive;
      const wheelRpm = calcTransRpm / totalRatio;
      const mph = wheelRpm * 60 * tireCircMiles;
      const kmh = mph * 1.60934;
      const wheelTorqueNm = Math.round(calcEngineTorqueNm * totalRatio * 0.92);
      return {
        gear: g.gear,
        ratio: g.ratio.toFixed(2),
        totalRatio: totalRatio.toFixed(2),
        mph: mph.toFixed(1),
        kmh: kmh.toFixed(1),
        wheelTorqueNm,
      };
    });
  }, [calcGearboxKey, calcFinalDrive, calcTireDiaIn, calcEngineTorqueNm, calcTransRpm]);

  // Calculator 3 derived metrics
  const cncCalc = useMemo(() => {
    const vcByMat: Record<MaterialId, { vc: number; fz: number }> = {
      ti_6al4v: { vc: 62, fz: 0.045 },
      al_7075: { vc: 280, fz: 0.085 },
      al_6061_t6: { vc: 310, fz: 0.092 },
      al_356_t6: { vc: 295, fz: 0.088 },
      magnesium_az91d: { vc: 360, fz: 0.095 },
      cast_iron_gray: { vc: 135, fz: 0.075 },
      chromoly_4130: { vc: 115, fz: 0.062 },
      forged_4340: { vc: 92, fz: 0.052 },
      carburized_9310: { vc: 85, fz: 0.048 },
      inconel_718: { vc: 36, fz: 0.032 },
      cfrp_t800: { vc: 185, fz: 0.055 },
      forged_carbon_smc: { vc: 195, fz: 0.06 },
      carbon_ceramic_sic: { vc: 28, fz: 0.018 },
      peek_cf30: { vc: 220, fz: 0.07 },
      kevlar_aramid: { vc: 165, fz: 0.05 },
      automotive_paint_gloss: { vc: 140, fz: 0.065 },
      chevy_orange_enamel: { vc: 135, fz: 0.072 },
      polished_billet_al: { vc: 320, fz: 0.09 },
      vulcanized_rubber: { vc: 95, fz: 0.08 },
      sapphire_glass: { vc: 24, fz: 0.015 },
    };
    const spec = vcByMat[calcCncMaterial];
    const rpm = Math.min(24000, Math.round((spec.vc * 1000) / (Math.PI * Math.max(1, calcToolDiaMm))));
    const feedMmMin = Math.round(rpm * calcFlutes * spec.fz);
    const ae = calcToolDiaMm * 0.25;
    const mrrCm3Min = Number(((ae * calcAxialDocMm * feedMmMin) / 1000).toFixed(1));
    // ISO 286 H7/g6 approximate IT bands for 30–120 mm bore
    const h7TolUm = calcNominalBoreMm <= 50 ? 25 : calcNominalBoreMm <= 80 ? 30 : 35;
    const g6UpperUm = calcNominalBoreMm <= 50 ? -9 : calcNominalBoreMm <= 80 ? -10 : -12;
    const g6LowerUm = calcNominalBoreMm <= 50 ? -25 : calcNominalBoreMm <= 80 ? -29 : -34;
    return {
      vc: spec.vc,
      fz: spec.fz,
      rpm,
      feedMmMin,
      mrrCm3Min,
      boreMinMm: calcNominalBoreMm.toFixed(3),
      boreMaxMm: (calcNominalBoreMm + h7TolUm / 1000).toFixed(3),
      shaftMaxMm: (calcNominalBoreMm + g6UpperUm / 1000).toFixed(3),
      shaftMinMm: (calcNominalBoreMm + g6LowerUm / 1000).toFixed(3),
      minClearUm: Math.abs(g6UpperUm),
      maxClearUm: h7TolUm + Math.abs(g6LowerUm),
    };
  }, [calcCncMaterial, calcToolDiaMm, calcFlutes, calcAxialDocMm, calcNominalBoreMm]);

  return (
    <div className="w-full h-full overflow-y-auto bg-[#0b0f14] pt-14 pb-12">
      <div className="max-w-[1320px] mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="text-xs font-mono text-amber-400">
              GLOBAL AUTOMOTIVE CAD/CAM &amp; LIBERTY MATRIX · 1908–2026
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-1">
              Global Vehicle Matrix, Worldwide Parts Selection &amp; GD&amp;T Portal
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Explore vehicles from 1908 to 2026 across North America, Europe, and Asia-Pacific with
              realistic alloys, composites, worldwide Tier-1 supplier parts, exact tolerances, and one-click Design Studio loading.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={exportMatrixCsv}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded border border-slate-700 bg-[#10161f] text-slate-200 hover:border-amber-500 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Matrix CSV</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onLaunchIn3DPortal(
                  activeVehicle ? activeVehicle.defaultAssemblyId : 'sbc350_v8',
                  activeVehicle?.defaultMaterials
                )
              }
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Launch 3D Rendering Portal</span>
            </button>
          </div>
        </div>

        {/* Matrix Sub-Page Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#10161f] border border-slate-800 overflow-x-auto">
          {(
            [
              {
                id: 'vehicles',
                label: 'Global Vehicle Library (1908–2026)',
                icon: Box,
              },
              {
                id: 'global_parts',
                label: 'Worldwide Parts Selection',
                icon: Globe,
              },
              {
                id: 'drivetrain_stds',
                label: 'Engine & Transmission Standards',
                icon: Settings2,
              },
              {
                id: 'tolerances',
                label: 'Technical Dimensions & Tolerances',
                icon: Ruler,
              },
              {
                id: 'codes_tools',
                label: 'Codes, Public Sources & Design Tools',
                icon: Calculator,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = pageTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPageTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ==================== PAGE TAB 1: VEHICLE LIBRARY & BOM MATRIX ==================== */}
        {pageTab === 'vehicles' && (
          <div className="space-y-8">
            {/* Cascading Region / Era / Year / Make / Model & Costing Dropdown Bar */}
            <div className="p-4 rounded-lg bg-[#10161f] border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-400">Region</span>
                <select
                  value={selectedRegion}
                  onChange={(e) =>
                    handleRegionChange(e.target.value as 'All' | Exclude<GlobalRegion, 'Global'>)
                  }
                  className="w-full px-3 py-2 text-xs rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="All">All Regions (Global)</option>
                  <option value="North America">North America</option>
                  <option value="Europe">Europe</option>
                  <option value="Asia-Pacific">Asia-Pacific</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-400">Automotive Era</span>
                <select
                  value={selectedEra}
                  onChange={(e) => handleEraChange(e.target.value as 'All' | AutomotiveEra)}
                  className="w-full px-3 py-2 text-xs rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="All">All Eras (1908–2026)</option>
                  {eraOptions.map((era) => (
                    <option key={era} value={era}>
                      {era}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-400">Model Year</span>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">All Years ({availableYears.length})</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={String(yr)}>
                      {yr}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-400">Make</span>
                <select
                  value={selectedMake}
                  onChange={(e) => handleMakeChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">All Makes ({availableMakes.length})</option>
                  {availableMakes.map((mk) => (
                    <option key={mk} value={mk}>
                      {mk}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 lg:col-span-2">
                <span className="block text-xs font-medium text-slate-400">Model &amp; Platform</span>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">All Matching Models ({availableVehicles.length})</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} ({v.country})
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-400">CAM Batch Volume</span>
                <select
                  value={batchTier}
                  onChange={(e) => setBatchTier(e.target.value as ProductionBatchTier)}
                  className="w-full px-3 py-2 text-xs rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="prototype">Prototype (1–5 units)</option>
                  <option value="low_volume">Low Volume (50 units)</option>
                  <option value="series">Series Production (1,000+)</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-400">GD&amp;T Tolerance</span>
                <select
                  value={toleranceStd}
                  onChange={(e) => setToleranceStd(e.target.value as ToleranceStandard)}
                  className="w-full px-3 py-2 text-xs rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="iso_medium">ISO 2768-mK (±0.10mm)</option>
                  <option value="precision_cnc">Precision CNC (±0.025mm)</option>
                  <option value="motorsport_ultra">Motorsport Ultra (±0.008mm)</option>
                </select>
              </label>
            </div>

            {/* Active Vehicle Specification Banner */}
            {activeVehicle && (
              <div className="p-5 rounded-lg bg-[#10161f] border border-amber-500/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-mono text-amber-400">
                    {activeVehicle.year} · {activeVehicle.country} ({activeVehicle.region}) · {activeVehicle.platform} · {activeVehicle.trimCode}
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {activeVehicle.make} {activeVehicle.model}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
                    <span>{activeVehicle.outputHp} HP</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>{activeVehicle.torqueNm} Nm</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>{activeVehicle.curbWeightKg.toLocaleString()} kg Curb</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-sky-300">
                      WB {activeVehicle.wheelbaseMm} mm / Track {activeVehicle.trackWidthMm} mm / {activeVehicle.boltPattern}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="px-2.5 py-1.5 rounded bg-[#0b0f14] border border-slate-800">
                      <span className="font-mono text-amber-300">{activeVehicle.engineCode}</span>
                      <span className="text-slate-400"> · {activeVehicle.engineConfig}</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded bg-[#0b0f14] border border-slate-800">
                      <span className="font-mono text-sky-300">{activeVehicle.transmissionCode}</span>
                      <span className="text-slate-400"> · {activeVehicle.transmissionConfig}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {onOpenInCustomBuilder && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenInCustomBuilder(
                          {
                            buildName: `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}`,
                            wheelbaseMm: activeVehicle.wheelbaseMm,
                            trackWidthMm: activeVehicle.trackWidthMm,
                            ...(activeVehicle.builderPreset ?? {}),
                          },
                          `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}`
                        )
                      }
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border border-emerald-500/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Load in Design Studio</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onLaunchIn3DPortal(
                        activeVehicle.defaultAssemblyId,
                        activeVehicle.defaultMaterials,
                        { openDrawing: true }
                      )
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded border border-slate-700 bg-[#0b0f14] text-slate-200 hover:border-amber-500 hover:text-amber-300 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Technical Drawing</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onLaunchIn3DPortal(
                        activeVehicle.defaultAssemblyId,
                        activeVehicle.defaultMaterials,
                        { camSim: true, camStrategy }
                      )
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded border border-sky-500/60 bg-sky-950/40 text-sky-300 hover:bg-sky-500 hover:text-slate-950 transition-colors cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>5-Axis CAM Sim</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onLaunchIn3DPortal(
                        activeVehicle.defaultAssemblyId,
                        activeVehicle.defaultMaterials,
                        { actionSequence: 'exploded_sweep', environment: 'studio' }
                      )
                    }
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Action 3D Exploded Portal</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filtered Vehicle Directory Cards (Quick Switcher across Years/Makes/Regions) */}
            {!activeVehicle && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Showing {availableVehicles.length} Global Vehicles (1908–2026) — Click any chassis to inspect dedicated BOM, tolerances &amp; Design Studio presets
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                  {availableVehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVehicleId(v.id)}
                      className="text-left p-3.5 rounded-lg bg-[#10161f] border border-slate-800 hover:border-amber-500/60 transition-colors space-y-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-amber-400">
                          {v.year} · {v.make} · {v.country}
                        </span>
                        <span className="text-slate-400">
                          {v.outputHp} HP · {v.torqueNm} Nm
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white truncate">{v.model}</div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        {v.engineCode} · {v.transmissionCode} · WB {v.wheelbaseMm} mm · {v.boltPattern}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Batch Economics KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Active Matrix Parts', value: `${matrixSummary.count} SKUs` },
                {
                  label: 'Combined Per-Unit Cost',
                  value: `$${matrixSummary.totalUnitCost.toLocaleString()}`,
                },
                {
                  label: 'Total NRE Tooling Setup',
                  value: `$${matrixSummary.totalTooling.toLocaleString()}`,
                },
                {
                  label: 'Total CAM Cycle Time',
                  value: `${matrixSummary.totalCycleMin.toLocaleString()} min`,
                },
                {
                  label: 'Aggregate Assembly Mass',
                  value: `${matrixSummary.totalMass} kg`,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 rounded-lg bg-[#10161f] border border-slate-800 space-y-1"
                >
                  <div className="text-xs text-slate-400">{stat.label}</div>
                  <div className="text-lg font-bold font-mono text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* 5-Axis CNC Machining Strategy & G-Code Preview Workbench */}
            {(() => {
              const targetAssembly = activeVehicle ? activeVehicle.defaultAssemblyId : 'sbc350_v8';
              const targetMats = activeVehicle?.defaultMaterials ?? {
                airframe: 'al_7075',
                wings: 'al_7075',
                propulsion: 'inconel_718',
                internal: 'ti_6al4v',
              };
              const camInfo = computeCamMachiningData(
                targetAssembly,
                targetMats,
                camStrategy,
                100,
                { x: 1850, y: 1120, z: 1240 }
              );
              return (
                <div className="p-4 rounded-lg bg-[#10161f] border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <label className="space-y-1 min-w-[230px]">
                      <span className="block text-xs font-medium text-slate-400">
                        Active 5-Axis CAM Strategy
                      </span>
                      <select
                        value={camStrategy}
                        onChange={(e) => setCamStrategy(e.target.value as CamStrategyId)}
                        className="w-full px-3 py-2 text-xs rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none"
                      >
                        {(Object.keys(CAM_STRATEGIES) as CamStrategyId[]).map((sid) => (
                          <option key={sid} value={sid}>
                            {CAM_STRATEGIES[sid].label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono">
                      <div>
                        <div className="text-[11px] text-slate-500">Tooling</div>
                        <div className="text-slate-200">{camInfo.toolSpec}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Spindle / Feed</div>
                        <div className="text-amber-400">
                          {camInfo.spindleRpm.toLocaleString()} RPM · {camInfo.feedRateMmMin} mm/min
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">MRR / Finish</div>
                        <div className="text-emerald-400">
                          {camInfo.mrrCm3Min} cm³/min · Ra {camInfo.raUm} µm
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        exportGCodeFile(camInfo.gcodeProgram, `${targetAssembly}_5axis.nc`)
                      }
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-slate-700 bg-[#0b0f14] text-slate-200 hover:border-amber-500 hover:text-amber-300 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export .NC G-Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onLaunchIn3DPortal(targetAssembly, targetMats, {
                          camSim: true,
                          camStrategy,
                        })
                      }
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Run Live 3D CAM Sim</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Organization Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#10161f] border border-slate-800 overflow-x-auto">
                {(
                  [
                    { id: 'all', label: 'All Parts & BOM Matrix' },
                    { id: 'powertrain', label: 'Powertrain & SBC-350 CAD' },
                    { id: 'transmission', label: 'Transmissions & Drivetrains' },
                    { id: 'chassis', label: 'Chassis, Suspension & Brakes' },
                    { id: 'future_tech', label: 'Future Technology & Aero' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search part #, OEM ref, dimensions..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded bg-[#10161f] border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* CAD/CAM Parts Costing & Toolpath Table */}
            <div className="rounded-lg bg-[#10161f] border border-slate-800 overflow-hidden">
              {filteredParts.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Wrench className="w-6 h-6 text-slate-500 mx-auto" />
                  <div className="text-sm font-medium text-slate-200">
                    No CAD/CAM parts match the current filter
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('all');
                      setSearchQuery('');
                      setSelectedYear('all');
                      setSelectedMake('all');
                      setSelectedVehicleId('all');
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-slate-800 text-amber-400 hover:bg-slate-700 cursor-pointer"
                  >
                    Reset Matrix Filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-[#0d1219] text-slate-400">
                        <th className="py-3 px-3 font-medium">Part # / OEM Ref</th>
                        <th className="py-3 px-3 font-medium">Component &amp; Dimensions</th>
                        <th className="py-3 px-3 font-medium">Material &amp; Mass</th>
                        <th className="py-3 px-3 font-medium">CAM Toolpath &amp; Tolerance</th>
                        <th className="py-3 px-3 font-medium text-right">Unit Cost</th>
                        <th className="py-3 px-3 font-medium text-right">Tooling NRE</th>
                        <th className="py-3 px-3 font-medium text-right">Total / Unit</th>
                        <th className="py-3 px-3 font-medium text-right">Cycle / Lead</th>
                        <th className="py-3 px-3 font-medium text-right">3D Portal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {filteredParts.map((part) => {
                        const mat = AEROSPACE_MATERIALS[part.materialId];
                        const econ = computeAdjustedPartEconomics(part, batchTier, toleranceStd);
                        const matOverrides: SubsystemMaterials = {
                          airframe: part.subsystem === 'airframe' ? part.materialId : 'al_7075',
                          wings: part.subsystem === 'wings' ? part.materialId : 'cfrp_t800',
                          propulsion:
                            part.subsystem === 'propulsion' ? part.materialId : 'inconel_718',
                          internal: part.subsystem === 'internal' ? part.materialId : 'ti_6al4v',
                        };
                        return (
                          <tr key={part.id} className="hover:bg-slate-800/35 transition-colors">
                            <td className="py-3 px-3 align-top">
                              <div className="font-mono font-semibold text-amber-400">
                                {part.partNumber}
                              </div>
                              <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                                {part.oemReference}
                              </div>
                            </td>

                            <td className="py-3 px-3 align-top max-w-xs">
                              <div className="font-semibold text-slate-100">{part.name}</div>
                              <div className="font-mono text-[11px] text-sky-300 mt-0.5">
                                {part.nominalDimensionMm}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {part.torqueOrLoadRating}
                                {part.futureTechTrl ? ` · ${part.futureTechTrl}` : ''}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                {part.dataSource}
                              </div>
                            </td>

                            <td className="py-3 px-3 align-top">
                              <div className="flex items-center gap-1.5 text-slate-200">
                                <span
                                  className="w-2.5 h-2.5 rounded-xs shrink-0 border border-white/20"
                                  style={{ backgroundColor: mat.colorHex }}
                                />
                                <span>{mat.name}</span>
                              </div>
                              <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                                {part.massKg} kg · {mat.recyclabilityPct}% Recyc
                              </div>
                            </td>

                            <td className="py-3 px-3 align-top max-w-xs">
                              <div className="text-slate-200">{part.manufacturingProcess}</div>
                              <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                                {part.camToolpath} · {part.toleranceSpec}
                              </div>
                            </td>

                            <td className="py-3 px-3 align-top font-mono text-right text-slate-200">
                              ${econ.adjustedUnitCostUsd.toLocaleString()}
                            </td>

                            <td className="py-3 px-3 align-top font-mono text-right text-slate-400">
                              ${part.toolingCostUsd.toLocaleString()}
                              <div className="text-[10px] text-slate-500">
                                +${econ.amortizedToolingPerUnitUsd}/ea
                              </div>
                            </td>

                            <td className="py-3 px-3 align-top font-mono text-right font-semibold text-emerald-400">
                              ${econ.totalPerUnitUsd.toLocaleString()}
                            </td>

                            <td className="py-3 px-3 align-top font-mono text-right text-slate-300">
                              {econ.adjustedCycleMin} min
                              <div className="text-[11px] text-slate-500">{part.leadTimeDays}d lead</div>
                            </td>

                            <td className="py-3 px-3 align-top text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onLaunchIn3DPortal(part.linkedAssemblyId, matOverrides, {
                                      openDrawing: true,
                                    })
                                  }
                                  className="px-2 py-1.5 text-[11px] font-medium rounded bg-[#0b0f14] text-slate-300 border border-slate-700 hover:border-amber-500 hover:text-amber-300 transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  DWG
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onLaunchIn3DPortal(part.linkedAssemblyId, matOverrides, {
                                      camSim: true,
                                      camStrategy: part.isFutureTech ? 'lpbf_additive' : camStrategy,
                                    })
                                  }
                                  className="px-2 py-1.5 text-[11px] font-medium rounded bg-[#0b0f14] text-sky-300 border border-sky-500/40 hover:bg-sky-500 hover:text-slate-950 transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  CAM Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onLaunchIn3DPortal(part.linkedAssemblyId, matOverrides)
                                  }
                                  className="px-2.5 py-1.5 text-[11px] font-semibold rounded bg-slate-800 text-amber-300 border border-slate-700 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-500 transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  Render 3D
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Action 3D Modeling & Future Technology Design Capabilities */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span>Action 3D Modeling &amp; Future Technology Design Capabilities</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Launch next-generation additive, thermoplastic composite, and 900V SiC assemblies into live exploded &amp; CFD action rendering modes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {futureTechShowcase.map((tech) => {
                  const mat = AEROSPACE_MATERIALS[tech.materialId];
                  return (
                    <div
                      key={tech.id}
                      className="p-4 rounded-lg bg-[#10161f] border border-slate-800 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-mono text-amber-400">
                          {tech.partNumber} · {tech.futureTechTrl}
                        </div>
                        <h3 className="text-sm font-semibold text-white">{tech.name}</h3>
                        <p className="text-xs text-slate-400">{tech.manufacturingProcess}</p>
                        <div className="text-xs font-mono text-slate-300 pt-1">
                          {mat.name} · {tech.massKg} kg · ${tech.unitCostUsd.toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() =>
                            onLaunchIn3DPortal(tech.linkedAssemblyId, undefined, {
                              actionSequence: 'exploded_sweep',
                              environment: 'wind_tunnel',
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Action 3D</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onLaunchIn3DPortal(tech.linkedAssemblyId, undefined, {
                              camSim: true,
                              camStrategy:
                                tech.id === 'dmls_ti_upright' ? 'lpbf_additive' : 'swarf_finishing',
                            })
                          }
                          className="px-2.5 py-2 text-xs font-medium rounded border border-sky-500/50 bg-[#0b0f14] text-sky-300 hover:bg-sky-500 hover:text-slate-950 transition-colors cursor-pointer"
                        >
                          CAM Sim
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onLaunchIn3DPortal(tech.linkedAssemblyId, undefined, {
                              openDrawing: true,
                            })
                          }
                          className="px-2.5 py-2 text-xs font-medium rounded border border-slate-700 bg-[#0b0f14] text-slate-200 hover:border-amber-500 cursor-pointer"
                        >
                          Blueprint
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== PAGE TAB 1B: WORLDWIDE PARTS SELECTION ==================== */}
        {pageTab === 'global_parts' && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-[#10161f] border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {(['All', 'North America', 'Europe', 'Asia-Pacific'] as const).map((reg) => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setGpRegion(reg)}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                      gpRegion === reg
                        ? 'bg-amber-500 border-amber-400 text-slate-950 font-semibold'
                        : 'bg-[#0b0f14] border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {reg === 'All' ? 'All Global Regions' : reg}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <select
                  value={gpCategory}
                  onChange={(e) =>
                    setGpCategory(e.target.value as 'All' | GlobalSupplierPart['category'])
                  }
                  className="px-3 py-2 text-xs rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="All">All Component Categories</option>
                  <option value="Engine & Rotating">Engine &amp; Rotating</option>
                  <option value="Transmission & Diff">Transmission &amp; Diff</option>
                  <option value="Brakes & Hubs">Brakes &amp; Hubs</option>
                  <option value="Suspension & Chassis">Suspension &amp; Chassis</option>
                  <option value="Aero & Composites">Aero &amp; Composites</option>
                  <option value="EV & Controls">EV &amp; Controls</option>
                </select>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={gpSearch}
                    onChange={(e) => setGpSearch(e.target.value)}
                    placeholder="Search Dart, Brembo, HKS, TREMEC, Dallara..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded bg-[#0b0f14] border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Showing {filteredGlobalParts.length} verified worldwide Tier-1 &amp; OEM components with attachment hardpoint specifications and realistic material sources.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredGlobalParts.map((part) => {
                const mat = AEROSPACE_MATERIALS[part.materialId];
                return (
                  <div
                    key={part.id}
                    className="p-5 rounded-lg bg-[#10161f] border border-slate-800 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <span className="text-amber-400 font-semibold">
                          {part.supplier} · {part.country}
                        </span>
                        <span className="text-slate-400">{part.partNumber}</span>
                      </div>

                      <div>
                        <div className="text-[11px] font-mono text-sky-400">{part.category}</div>
                        <h3 className="text-base font-bold text-white mt-0.5">{part.name}</h3>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Fitment: {part.compatibleVehicles}
                        </div>
                      </div>

                      <div className="p-3 rounded bg-[#0b0f14] border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-xs shrink-0 border border-white/20"
                            style={{ backgroundColor: mat.colorHex }}
                          />
                          <span className="text-slate-100 font-medium">{mat.name}</span>
                          <span className="font-mono text-[11px] text-slate-400 truncate">
                            ({mat.sourceOrigin})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Exact Dimensions: </span>
                          <span className="font-mono text-sky-300">{part.exactDimensionsMm}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Attachment Interface: </span>
                          <span className="font-mono text-slate-200">{part.attachmentInterface}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Tolerance Standard: </span>
                          <span className="font-mono text-emerald-400">{part.toleranceStandard}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                      <div className="font-mono text-xs text-slate-300">
                        <span className="text-emerald-400 font-semibold">
                          ${part.unitCostUsd.toLocaleString()}
                        </span>{' '}
                        · {part.massKg} kg · {part.leadTimeDays}d lead
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenInCustomBuilder && part.builderPatch && (
                          <button
                            type="button"
                            onClick={() => onOpenInCustomBuilder(part.builderPatch!, part.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-emerald-500/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Load in Design Studio</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onLaunchIn3DPortal(part.linkedAssemblyId)}
                          className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                        >
                          Render 3D
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== PAGE TAB 2: ENGINE & TRANSMISSION STANDARDS ==================== */}
        {pageTab === 'drivetrain_stds' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#10161f] border border-slate-800">
                {(['All', 'Engine', 'Transmission'] as const).map((dom) => (
                  <button
                    key={dom}
                    type="button"
                    onClick={() => setStdDomainFilter(dom)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      stdDomainFilter === dom
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {dom === 'All' ? 'All Powertrain & Drivetrain Specs' : `${dom} Standards`}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={stdSearch}
                  onChange={(e) => setStdSearch(e.target.value)}
                  placeholder="Filter SBC-350, T-56, ZF 8HP, LT6, PDK..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded bg-[#10161f] border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredStandards.map((std) => (
                <div
                  key={std.id}
                  className="p-5 rounded-lg bg-[#10161f] border border-slate-800 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-amber-400">
                        {std.domain} · {std.code}
                      </span>
                      <span className="text-xs font-mono text-emerald-400">{std.torqueRating}</span>
                    </div>
                    <h3 className="text-base font-bold text-white">{std.name}</h3>
                    <div className="text-xs text-slate-300">{std.architecture}</div>

                    <div className="p-3 rounded bg-[#0b0f14] border border-slate-800/80 space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-500">Exact Dimensions: </span>
                        <span className="font-mono text-sky-300">{std.exactDimensions}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Bellhousing / Mounting: </span>
                        <span className="font-mono text-slate-200">{std.bellhousingOrMounting}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Displacement / Ratios: </span>
                        <span className="font-mono text-amber-300">{std.ratiosOrDisplacement}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Industry Tolerance: </span>
                        <span className="font-mono text-emerald-300">{std.toleranceStandard}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-mono text-slate-400">
                      Source: {std.referenceSource}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onLaunchIn3DPortal(std.linkedAssemblyId, undefined, { openDrawing: true })
                        }
                        className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-700 bg-[#0b0f14] text-slate-200 hover:border-amber-500 cursor-pointer"
                      >
                        Blueprint
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onLaunchIn3DPortal(std.linkedAssemblyId, undefined, {
                            camSim: true,
                            camStrategy,
                          })
                        }
                        className="px-2.5 py-1.5 text-xs font-medium rounded border border-sky-500/50 bg-[#0b0f14] text-sky-300 hover:bg-sky-500 hover:text-slate-950 cursor-pointer"
                      >
                        CAM Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => onLaunchIn3DPortal(std.linkedAssemblyId)}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                      >
                        Render 3D
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== PAGE TAB 3: TECHNICAL DIMENSIONS & TOLERANCES ==================== */}
        {pageTab === 'tolerances' && (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">
                  Vehicle Manufacturing Industry Dimensions &amp; GD&amp;T Tolerance Matrix
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Exact nominal metric/inch feature datums, bilateral manufacturing limits, surface roughness (Ra µm), and CMM inspection protocols.
                </p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tolSearch}
                  onChange={(e) => setTolSearch(e.target.value)}
                  placeholder="Search bore, deck, AGMA, ASME, SFI..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded bg-[#10161f] border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-lg bg-[#10161f] border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0d1219] text-slate-400">
                      <th className="py-3 px-3 font-medium">Critical Feature &amp; Subsystem</th>
                      <th className="py-3 px-3 font-medium">Nominal (mm)</th>
                      <th className="py-3 px-3 font-medium">Nominal (in)</th>
                      <th className="py-3 px-3 font-medium">Bilateral Limit</th>
                      <th className="py-3 px-3 font-medium">GD&amp;T Callout</th>
                      <th className="py-3 px-3 font-medium">Surface Finish</th>
                      <th className="py-3 px-3 font-medium">Standard &amp; Metrology</th>
                      <th className="py-3 px-3 font-medium text-right">CAD Portal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredTolerances.map((tol) => (
                      <tr key={tol.id} className="hover:bg-slate-800/35">
                        <td className="py-3 px-3 align-top">
                          <div className="font-semibold text-white">{tol.featureName}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{tol.subsystem}</div>
                        </td>
                        <td className="py-3 px-3 align-top font-mono text-amber-300">
                          {tol.nominalMm}
                        </td>
                        <td className="py-3 px-3 align-top font-mono text-slate-300">
                          {tol.nominalInch}
                        </td>
                        <td className="py-3 px-3 align-top font-mono text-emerald-400">
                          {tol.bilateralTolerance}
                        </td>
                        <td className="py-3 px-3 align-top font-mono text-slate-200 max-w-xs">
                          {tol.gdtCallout}
                        </td>
                        <td className="py-3 px-3 align-top font-mono text-sky-300">
                          {tol.surfaceFinishRa}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="font-mono text-[11px] text-amber-400">
                            {tol.standardRef}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {tol.inspectionMethod}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onLaunchIn3DPortal(tol.linkedAssemblyId, undefined, {
                                  openDrawing: true,
                                })
                              }
                              className="px-2.5 py-1.5 text-[11px] font-medium rounded border border-slate-700 bg-[#0b0f14] text-slate-200 hover:border-amber-500 cursor-pointer"
                            >
                              Blueprint
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onLaunchIn3DPortal(tol.linkedAssemblyId, undefined, {
                                  camSim: true,
                                  camStrategy,
                                })
                              }
                              className="px-2.5 py-1.5 text-[11px] font-medium rounded border border-sky-500/40 bg-[#0b0f14] text-sky-300 hover:bg-sky-500 hover:text-slate-950 cursor-pointer"
                            >
                              CAM Sim
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PAGE TAB 4: CODES, PUBLIC SOURCES & DESIGN TOOLS ==================== */}
        {pageTab === 'codes_tools' && (
          <div className="space-y-8">
            {/* Searchable Public Engineering & OEM Code Database */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>OEM Casting Codes, Build Clearances &amp; Public Library Search Database</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Search verified GM/SAE casting numbers, RPO build codes, blueprint bolt torques, ASME/AGMA standards, and federal NHTSA/NIST public repositories.
                  </p>
                </div>

                <div className="relative w-full md:w-80">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pubSearch}
                    onChange={(e) => setPubSearch(e.target.value)}
                    placeholder="Search 3970010, firing order, SAE, NHTSA..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded bg-[#10161f] border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#10161f] border border-slate-800 overflow-x-auto w-fit">
                {[
                  'All',
                  'OEM Casting & RPO',
                  'Build Clearance & Torque',
                  'Industry Standard',
                  'Public Archive & API',
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPubCategoryFilter(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                      pubCategoryFilter === cat
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPublicDb.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-lg bg-[#10161f] border border-slate-800 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-amber-400 font-semibold">{rec.code}</span>
                        <span className="text-slate-400">{rec.category}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">{rec.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{rec.specification}</p>
                      <div className="p-2.5 rounded bg-[#0b0f14] border border-slate-800 text-[11px] font-mono text-sky-300">
                        {rec.dimensionsAndLimits}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 truncate">{rec.sourceOrganization}</span>
                      <a
                        href={rec.referenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-amber-400 hover:text-amber-300 shrink-0"
                      >
                        <span>Source Ref</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Engineering Design Tools */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  <span>Interactive CAD/CAM &amp; Drivetrain Engineering Design Tools</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time parametric calculators for engine geometry &amp; piston speed, transmission ratio torque multiplication, and 5-axis CNC feeds/speeds &amp; ISO shaft fits.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Tool 1: Engine Displacement & Piston Kinematics */}
                <div className="p-5 rounded-lg bg-[#10161f] border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">
                      1. Engine Displacement &amp; Piston Speed
                    </h3>
                    <span className="text-[11px] font-mono text-amber-400">SAE J1349</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'SBC-350', bore: 101.6, stroke: 88.39, cyl: 8, rpm: 6500 },
                      { label: 'LT6 5.5L', bore: 104.25, stroke: 80.0, cyl: 8, rpm: 8400 },
                      { label: '2JZ-GTE', bore: 86.0, stroke: 86.0, cyl: 6, rpm: 7500 },
                      { label: 'GT3 4.0L', bore: 102.0, stroke: 81.5, cyl: 6, rpm: 9000 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setCalcBoreMm(p.bore);
                          setCalcStrokeMm(p.stroke);
                          setCalcCylinders(p.cyl);
                          setCalcRpm(p.rpm);
                        }}
                        className="px-2 py-1 text-[11px] font-mono rounded bg-[#0b0f14] border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-300 cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <label className="space-y-1">
                      <span className="text-slate-400">Bore (mm)</span>
                      <input
                        type="number"
                        step="0.05"
                        value={calcBoreMm}
                        onChange={(e) => setCalcBoreMm(Number(e.target.value) || 50)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Stroke (mm)</span>
                      <input
                        type="number"
                        step="0.05"
                        value={calcStrokeMm}
                        onChange={(e) => setCalcStrokeMm(Number(e.target.value) || 50)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Cylinders</span>
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={calcCylinders}
                        onChange={(e) => setCalcCylinders(Number(e.target.value) || 4)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Peak RPM</span>
                      <input
                        type="number"
                        step="100"
                        value={calcRpm}
                        onChange={(e) => setCalcRpm(Number(e.target.value) || 3000)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                    <label className="space-y-1 col-span-2">
                      <span className="text-slate-400">Volumetric Efficiency ({calcVePct}%)</span>
                      <input
                        type="range"
                        min={70}
                        max={125}
                        value={calcVePct}
                        onChange={(e) => setCalcVePct(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </label>
                  </div>

                  <div className="p-3 rounded bg-[#0b0f14] border border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Displacement:</span>
                      <span className="text-amber-400 font-semibold">
                        {engineCalc.sweptCc.toLocaleString()} cc ({engineCalc.liters}L · {engineCalc.cid} CID)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mean Piston Speed:</span>
                      <span
                        className={
                          Number(engineCalc.meanPistonMs) > 24
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }
                      >
                        {engineCalc.meanPistonMs} m/s ({engineCalc.meanPistonFpm} ft/min)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Airflow / Est. Output:</span>
                      <span className="text-sky-300">
                        {engineCalc.cfmDemand} CFM · ~{engineCalc.estHp} HP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tool 2: Transmission Ratio & Road Speed Calculator */}
                <div className="p-5 rounded-lg bg-[#10161f] border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">
                      2. Transmission Ratio &amp; Wheel Torque
                    </h3>
                    <span className="text-[11px] font-mono text-sky-400">AGMA Q12</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <label className="space-y-1 col-span-2">
                      <span className="text-slate-400">Transmission Architecture</span>
                      <select
                        value={calcGearboxKey}
                        onChange={(e) => setCalcGearboxKey(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-[#0b0f14] border border-slate-700 text-white"
                      >
                        {Object.entries(GEARBOX_PRESETS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Axle Final Drive</span>
                      <input
                        type="number"
                        step="0.05"
                        value={calcFinalDrive}
                        onChange={(e) => setCalcFinalDrive(Number(e.target.value) || 3.42)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Tire Dia (in)</span>
                      <input
                        type="number"
                        step="0.5"
                        value={calcTireDiaIn}
                        onChange={(e) => setCalcTireDiaIn(Number(e.target.value) || 26)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Engine Torque (Nm)</span>
                      <input
                        type="number"
                        step="10"
                        value={calcEngineTorqueNm}
                        onChange={(e) => setCalcEngineTorqueNm(Number(e.target.value) || 500)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Shift RPM</span>
                      <input
                        type="number"
                        step="100"
                        value={calcTransRpm}
                        onChange={(e) => setCalcTransRpm(Number(e.target.value) || 6000)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                  </div>

                  <div className="max-h-44 overflow-y-auto rounded bg-[#0b0f14] border border-slate-800">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-1.5 px-2">Gear</th>
                          <th className="py-1.5 px-2">Ratio</th>
                          <th className="py-1.5 px-2 text-right">Speed</th>
                          <th className="py-1.5 px-2 text-right">Axle Torque</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {transCalcRows.map((row) => (
                          <tr key={row.gear}>
                            <td className="py-1 px-2 text-amber-300">{row.gear}</td>
                            <td className="py-1 px-2 text-slate-300">{row.ratio}:1</td>
                            <td className="py-1 px-2 text-right text-sky-300">
                              {row.mph} mph ({row.kmh} km/h)
                            </td>
                            <td className="py-1 px-2 text-right text-emerald-400">
                              {row.wheelTorqueNm.toLocaleString()} Nm
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tool 3: CNC Feeds, Speeds & ISO 286 H7/g6 Shaft Fit */}
                <div className="p-5 rounded-lg bg-[#10161f] border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">
                      3. 5-Axis CNC Feeds &amp; ISO H7/g6 Fit
                    </h3>
                    <span className="text-[11px] font-mono text-emerald-400">ISO 286-2</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <label className="space-y-1 col-span-2">
                      <span className="text-slate-400">Workpiece Alloy / Composite</span>
                      <select
                        value={calcCncMaterial}
                        onChange={(e) => setCalcCncMaterial(e.target.value as MaterialId)}
                        className="w-full px-2.5 py-1.5 rounded bg-[#0b0f14] border border-slate-700 text-white"
                      >
                        {(Object.keys(AEROSPACE_MATERIALS) as MaterialId[]).map((mid) => (
                          <option key={mid} value={mid}>
                            {AEROSPACE_MATERIALS[mid].name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Endmill Ø (mm)</span>
                      <input
                        type="number"
                        step="1"
                        min={2}
                        max={50}
                        value={calcToolDiaMm}
                        onChange={(e) => setCalcToolDiaMm(Number(e.target.value) || 10)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Flutes</span>
                      <input
                        type="number"
                        min={2}
                        max={8}
                        value={calcFlutes}
                        onChange={(e) => setCalcFlutes(Number(e.target.value) || 4)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Axial DOC (mm)</span>
                      <input
                        type="number"
                        step="0.5"
                        value={calcAxialDocMm}
                        onChange={(e) => setCalcAxialDocMm(Number(e.target.value) || 2)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Nominal Bore (mm)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={calcNominalBoreMm}
                        onChange={(e) => setCalcNominalBoreMm(Number(e.target.value) || 50)}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[#0b0f14] border border-slate-700 text-white"
                      />
                    </label>
                  </div>

                  <div className="p-3 rounded bg-[#0b0f14] border border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Spindle / Feed:</span>
                      <span className="text-amber-400 font-semibold">
                        {cncCalc.rpm.toLocaleString()} RPM · {cncCalc.feedMmMin} mm/min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Surface Speed / MRR:</span>
                      <span className="text-sky-300">
                        {cncCalc.vc} m/min · {cncCalc.mrrCm3Min} cm³/min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">H7 Bore Limits:</span>
                      <span className="text-slate-200">
                        {cncCalc.boreMinMm}–{cncCalc.boreMaxMm} mm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">g6 Shaft / Clearance:</span>
                      <span className="text-emerald-400">
                        {cncCalc.shaftMinMm}–{cncCalc.shaftMaxMm} mm ({cncCalc.minClearUm}–
                        {cncCalc.maxClearUm} µm)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Data Sources & Engineering Standards Ledger */}
        <div className="p-5 rounded-lg bg-[#10161f] border border-slate-800 space-y-3">
          <h2 className="text-sm font-semibold text-white">
            Reference Engineering Standards &amp; Verified Specification Sources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {ENGINEERING_DATA_SOURCES.map((src) => (
              <div key={src.code} className="space-y-1">
                <div className="font-mono font-semibold text-amber-400">{src.code}</div>
                <div className="font-medium text-slate-200">{src.title}</div>
                <div className="text-slate-400">{src.scope}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
