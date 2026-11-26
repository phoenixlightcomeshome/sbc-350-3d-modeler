/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { EngineConfig, CoordinatedSpecs } from '../types/engine';
import { TRANSMISSIONS_DB } from '../data/engineData';
import {
  EngineBrand,
  EngineConfigurationType,
  EngineFuelType,
  ENGINE_CONFIGURATIONS,
  ENGINE_FAMILIES,
  ENGINE_FAMILY_LIST,
  EngineFamilySpec
} from '../data/engineFamilies';
import {
  VEHICLE_CATALOG,
  VEHICLE_CATALOG_LIST,
  getCatalogBrands,
  getVehiclesForBrand,
  getValidYearsForVehicle,
  getEnginesForVehicleYear
} from '../data/vehicleCatalog';
import {
  Car,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Gauge,
  Cog,
  Sliders,
  Info
} from 'lucide-react';

interface BrandEngineSelectorProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
}

const CUSTOM_BRAND_VALUE = '__CUSTOM__';

export const BrandEngineSelector: React.FC<BrandEngineSelectorProps> = ({
  config,
  specs,
  onUpdateConfig
}) => {
  const brands = useMemo(() => getCatalogBrands(), []);

  // Derive sensible initial cascade state from current config if available
  const initialFamily = config.engineFamilyId
    ? ENGINE_FAMILIES[config.engineFamilyId]
    : undefined;
  const initialVehicle =
    (config.selectedVehicle && VEHICLE_CATALOG[config.selectedVehicle]) ||
    (initialFamily
      ? getVehiclesForBrand(initialFamily.brand).find((v) =>
          v.yearEngineOptions.some((o) => o.engineFamilyIds.includes(initialFamily.id))
        )
      : undefined) ||
    VEHICLE_CATALOG.chevy_camaro;

  const [selectedBrand, setSelectedBrand] = useState<string>(
    initialFamily?.brand || initialVehicle?.brand || brands[0] || 'GM / Chevrolet'
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialVehicle?.id || 'chevy_camaro'
  );
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const yrs = getValidYearsForVehicle(initialVehicle?.id || 'chevy_camaro');
    if (yrs.includes(1969) && !initialFamily) return 1969;
    if (initialFamily) {
      const matchingYear = yrs.find((y) =>
        getEnginesForVehicleYear(initialVehicle?.id || '', y).engineFamilyIds.includes(
          initialFamily.id
        )
      );
      if (matchingYear) return matchingYear;
    }
    return yrs[0] || 1969;
  });
  const [selectedEngineId, setSelectedEngineId] = useState<string>(
    config.engineFamilyId || 'gm_sbc_350'
  );
  const [typeFilter, setTypeFilter] = useState<'ALL' | EngineConfigurationType>('ALL');
  const [fuelFilter, setFuelFilter] = useState<'ALL' | EngineFuelType>('ALL');
  const [lastAppliedLabel, setLastAppliedLabel] = useState<string | null>(null);

  const isCustomMode = selectedBrand === CUSTOM_BRAND_VALUE;

  const matchesFilters = (eng: EngineFamilySpec): boolean => {
    if (typeFilter !== 'ALL' && eng.configuration !== typeFilter) return false;
    const fuel = eng.fuelType || 'Gasoline';
    if (fuelFilter !== 'ALL' && fuel !== fuelFilter) return false;
    return true;
  };

  const filteredBrands = useMemo(() => {
    return brands.filter((brand) =>
      getVehiclesForBrand(brand).some((veh) =>
        veh.yearEngineOptions.some((opt) =>
          opt.engineFamilyIds.some((id) => {
            const fam = ENGINE_FAMILIES[id];
            return fam ? matchesFilters(fam) : false;
          })
        )
      )
    );
  }, [brands, typeFilter, fuelFilter]);

  const brandVehicles = useMemo(() => {
    if (isCustomMode) return [];
    const list = getVehiclesForBrand(selectedBrand as EngineBrand);
    if (typeFilter === 'ALL' && fuelFilter === 'ALL') return list;
    return list.filter((veh) =>
      veh.yearEngineOptions.some((opt) =>
        opt.engineFamilyIds.some((id) => {
          const fam = ENGINE_FAMILIES[id];
          return fam ? matchesFilters(fam) : false;
        })
      )
    );
  }, [selectedBrand, isCustomMode, typeFilter, fuelFilter]);

  const validYears = useMemo(() => {
    if (isCustomMode || !selectedVehicleId) return [];
    if (typeFilter === 'ALL' && fuelFilter === 'ALL') {
      return getValidYearsForVehicle(selectedVehicleId);
    }
    const entry = VEHICLE_CATALOG[selectedVehicleId];
    if (!entry) return [];
    const years = new Set<number>();
    entry.yearEngineOptions.forEach((opt) => {
      const hasMatch = opt.engineFamilyIds.some((id) => {
        const fam = ENGINE_FAMILIES[id];
        return fam ? matchesFilters(fam) : false;
      });
      if (hasMatch) {
        for (let y = opt.yearStart; y <= opt.yearEnd; y++) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [selectedVehicleId, isCustomMode, typeFilter, fuelFilter]);

  const yearEngineLookup = useMemo(() => {
    if (isCustomMode || !selectedVehicleId) {
      return { engineFamilyIds: [] as string[], trimNotes: [] as string[] };
    }
    return getEnginesForVehicleYear(selectedVehicleId, selectedYear);
  }, [selectedVehicleId, selectedYear, isCustomMode]);

  const offeredEngines: EngineFamilySpec[] = useMemo(() => {
    return yearEngineLookup.engineFamilyIds
      .map((id) => ENGINE_FAMILIES[id])
      .filter((f): f is EngineFamilySpec => Boolean(f) && matchesFilters(f));
  }, [yearEngineLookup, typeFilter, fuelFilter]);

  const previewFamily: EngineFamilySpec | undefined = useMemo(() => {
    if (isCustomMode) return undefined;
    return (
      offeredEngines.find((e) => e.id === selectedEngineId) ||
      offeredEngines[0] ||
      ENGINE_FAMILIES[selectedEngineId]
    );
  }, [isCustomMode, offeredEngines, selectedEngineId]);

  const activeConfigFamily = config.engineFamilyId
    ? ENGINE_FAMILIES[config.engineFamilyId]
    : undefined;

  const applyEngineDefaults = (
    family: EngineFamilySpec,
    vehicleId: string,
    year: number
  ) => {
    const recTrans = TRANSMISSIONS_DB[family.recommendedTransId];
    onUpdateConfig({
      bore: family.bore,
      stroke: family.stroke,
      rodLength: family.rodLength,
      deckHeight: family.deckHeight,
      deckClearance: family.deckClearance,
      gasketThickness: family.gasketThickness,
      chamberCc: family.chamberCc,
      pistonReliefCc: family.pistonReliefCc,
      cylinders: family.cylinders,
      pistonAlloy: family.pistonAlloyBaseline,
      ringApplication: family.ringApplicationBaseline,
      camProfile: family.camBaseline.camProfileId,
      rockerRatio: family.camBaseline.rockerRatio,
      selectedIntake: family.inductionBaseline.selectedIntake,
      inductionDress: family.inductionBaseline.inductionDress,
      carbCfm: family.inductionBaseline.carbCfm,
      targetAFR: family.inductionBaseline.targetAFR,
      ignitionTiming: family.inductionBaseline.ignitionTiming,
      sparkPlugGap: family.inductionBaseline.sparkPlugGap,
      selectedTrans: recTrans ? recTrans.id : config.selectedTrans,
      stallSpeed: recTrans ? recTrans.defaultStall : config.stallSpeed,
      selectedVehicle: vehicleId,
      engineFamilyId: family.id,
      firingOrder: family.firingOrder,
      bellhousingPattern: family.bellhousingPattern
    });

    const veh = VEHICLE_CATALOG[vehicleId];
    setLastAppliedLabel(
      `${year} ${veh ? `${veh.make} ${veh.model.split('(')[0].trim()}` : ''} — ${family.shortName}`
    );
  };

  const handleBrandChange = (nextBrand: string) => {
    setSelectedBrand(nextBrand);
    setLastAppliedLabel(null);
    if (nextBrand === CUSTOM_BRAND_VALUE) {
      // Custom / Other path leaves the current manual EngineConfig completely untouched
      return;
    }
    const nextVehicles = getVehiclesForBrand(nextBrand as EngineBrand);
    const firstVeh = nextVehicles[0];
    if (firstVeh) {
      setSelectedVehicleId(firstVeh.id);
      const nextYears = getValidYearsForVehicle(firstVeh.id);
      const firstYear = nextYears[0] || firstVeh.yearEnd;
      setSelectedYear(firstYear);
      const nextEngines = getEnginesForVehicleYear(firstVeh.id, firstYear).engineFamilyIds;
      if (nextEngines[0]) {
        setSelectedEngineId(nextEngines[0]);
      }
    }
  };

  const handleVehicleChange = (nextVehicleId: string) => {
    setSelectedVehicleId(nextVehicleId);
    setLastAppliedLabel(null);
    const nextYears = getValidYearsForVehicle(nextVehicleId);
    const nextYear = nextYears.includes(selectedYear) ? selectedYear : nextYears[0] || 1970;
    setSelectedYear(nextYear);
    const nextEngines = getEnginesForVehicleYear(nextVehicleId, nextYear).engineFamilyIds;
    if (nextEngines[0]) {
      setSelectedEngineId(
        nextEngines.includes(selectedEngineId) ? selectedEngineId : nextEngines[0]
      );
    }
  };

  const handleYearChange = (nextYear: number) => {
    setSelectedYear(nextYear);
    setLastAppliedLabel(null);
    const nextEngines = getEnginesForVehicleYear(selectedVehicleId, nextYear).engineFamilyIds;
    if (nextEngines[0]) {
      setSelectedEngineId(
        nextEngines.includes(selectedEngineId) ? selectedEngineId : nextEngines[0]
      );
    }
  };

  const handleEngineSelect = (engineId: string) => {
    setSelectedEngineId(engineId);
    const family = ENGINE_FAMILIES[engineId];
    if (family) {
      applyEngineDefaults(family, selectedVehicleId, selectedYear);
    }
  };

  const currentVehicleObj = VEHICLE_CATALOG[selectedVehicleId];

  return (
    <div className="bg-[#12161c] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 text-xs text-slate-200">
      {/* Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Car className="w-4 h-4 text-orange-400" />
            <span>Global Multi-Brand Vehicle &amp; Engine Fitment Selector</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {brands.length} OEM Groups · {ENGINE_CONFIGURATIONS.length} Engine Architectures · {ENGINE_FAMILY_LIST.length} Factory Engine Families · {VEHICLE_CATALOG_LIST.length} Vehicle Lines
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {config.engineFamilyId && ENGINE_FAMILIES[config.engineFamilyId] ? (
            <span className="px-2.5 py-1 rounded-md bg-orange-950/60 border border-orange-500/50 text-orange-300 font-mono text-[11px] font-semibold">
              Active: {ENGINE_FAMILIES[config.engineFamilyId].shortName}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[11px]">
              Active: Manual / Baseline ({specs.displacementCi} CID)
            </span>
          )}
        </div>
      </div>

      {/* Quick Engine Architecture & Fuel Filters */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg bg-[#0d1014] border border-slate-800/90">
        <div className="flex items-center gap-2">
          <label htmlFor="selector-arch-filter" className="text-[11px] font-semibold text-slate-400">
            Engine Type:
          </label>
          <select
            id="selector-arch-filter"
            value={typeFilter}
            onChange={(e) => {
              const nextType = e.target.value as 'ALL' | EngineConfigurationType;
              setTypeFilter(nextType);
              setLastAppliedLabel(null);
              if (nextType !== 'ALL' && !isCustomMode) {
                const firstBrand = brands.find((b) =>
                  getVehiclesForBrand(b).some((v) =>
                    v.yearEngineOptions.some((o) =>
                      o.engineFamilyIds.some((id) => {
                        const f = ENGINE_FAMILIES[id];
                        return f && f.configuration === nextType && (fuelFilter === 'ALL' || (f.fuelType || 'Gasoline') === fuelFilter);
                      })
                    )
                  )
                );
                if (firstBrand) {
                  const veh = getVehiclesForBrand(firstBrand).find((v) =>
                    v.yearEngineOptions.some((o) =>
                      o.engineFamilyIds.some((id) => ENGINE_FAMILIES[id]?.configuration === nextType)
                    )
                  );
                  setSelectedBrand(firstBrand);
                  if (veh) {
                    setSelectedVehicleId(veh.id);
                    const opt = veh.yearEngineOptions.find((o) =>
                      o.engineFamilyIds.some((id) => ENGINE_FAMILIES[id]?.configuration === nextType)
                    );
                    if (opt) setSelectedYear(opt.yearEnd);
                  }
                }
              }
            }}
            className="bg-[#12161c] border border-slate-700 focus:border-cyan-400 rounded-md px-2.5 py-1 text-[11px] font-mono text-cyan-300 outline-none"
          >
            <option value="ALL">All Types ({ENGINE_CONFIGURATIONS.length})</option>
            {ENGINE_CONFIGURATIONS.map((cfg) => (
              <option key={cfg} value={cfg}>
                {cfg === 'H4'
                  ? 'H4 (Boxer Flat-4)'
                  : cfg === 'H6'
                  ? 'H6 (Boxer Flat-6)'
                  : cfg === 'Rotary'
                  ? 'Rotary (Wankel)'
                  : cfg}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="selector-fuel-filter" className="text-[11px] font-semibold text-slate-400">
            Fuel:
          </label>
          <select
            id="selector-fuel-filter"
            value={fuelFilter}
            onChange={(e) => {
              const nextFuel = e.target.value as 'ALL' | EngineFuelType;
              setFuelFilter(nextFuel);
              setLastAppliedLabel(null);
              if (nextFuel !== 'ALL' && !isCustomMode) {
                const firstBrand = brands.find((b) =>
                  getVehiclesForBrand(b).some((v) =>
                    v.yearEngineOptions.some((o) =>
                      o.engineFamilyIds.some((id) => {
                        const f = ENGINE_FAMILIES[id];
                        return f && (f.fuelType || 'Gasoline') === nextFuel && (typeFilter === 'ALL' || f.configuration === typeFilter);
                      })
                    )
                  )
                );
                if (firstBrand) {
                  const veh = getVehiclesForBrand(firstBrand).find((v) =>
                    v.yearEngineOptions.some((o) =>
                      o.engineFamilyIds.some((id) => (ENGINE_FAMILIES[id]?.fuelType || 'Gasoline') === nextFuel)
                    )
                  );
                  setSelectedBrand(firstBrand);
                  if (veh) {
                    setSelectedVehicleId(veh.id);
                    const opt = veh.yearEngineOptions.find((o) =>
                      o.engineFamilyIds.some((id) => (ENGINE_FAMILIES[id]?.fuelType || 'Gasoline') === nextFuel)
                    );
                    if (opt) setSelectedYear(opt.yearEnd);
                  }
                }
              }
            }}
            className="bg-[#12161c] border border-slate-700 focus:border-cyan-400 rounded-md px-2.5 py-1 text-[11px] font-mono text-amber-300 outline-none"
          >
            <option value="ALL">All Fuels (Gas / Diesel / Hybrid)</option>
            <option value="Gasoline">Gasoline</option>
            <option value="Diesel">Diesel Turbodiesel</option>
            <option value="Hybrid / Gasoline">Hybrid / Atkinson</option>
          </select>
        </div>

        {(typeFilter !== 'ALL' || fuelFilter !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setTypeFilter('ALL');
              setFuelFilter('ALL');
            }}
            className="px-2.5 py-1 rounded-md border border-slate-700 text-slate-300 hover:text-white hover:border-orange-500 text-[11px]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* 4-Step Cascading Dropdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Brand */}
        <div className="space-y-1.5">
          <label
            htmlFor="brand-selector-brand"
            className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide"
          >
            1. Brand / OEM ({filteredBrands.length})
          </label>
          <select
            id="brand-selector-brand"
            value={selectedBrand}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full bg-[#0d1014] border border-slate-700 focus:border-orange-500 rounded-lg px-3 py-2 text-xs text-white font-medium outline-none"
          >
            {filteredBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
            <option value={CUSTOM_BRAND_VALUE}>Custom / Other (Manual Config)</option>
          </select>
        </div>

        {/* 2. Vehicle */}
        <div className="space-y-1.5">
          <label
            htmlFor="brand-selector-vehicle"
            className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide"
          >
            2. Vehicle Model
          </label>
          <select
            id="brand-selector-vehicle"
            disabled={isCustomMode}
            value={selectedVehicleId}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="w-full bg-[#0d1014] border border-slate-700 focus:border-orange-500 disabled:opacity-45 rounded-lg px-3 py-2 text-xs text-white font-medium outline-none"
          >
            {isCustomMode ? (
              <option value="">Manual Vehicle Fitment</option>
            ) : (
              brandVehicles.map((veh) => (
                <option key={veh.id} value={veh.id}>
                  {veh.make} {veh.model} ({veh.yearStart}–{veh.yearEnd})
                </option>
              ))
            )}
          </select>
        </div>

        {/* 3. Year */}
        <div className="space-y-1.5">
          <label
            htmlFor="brand-selector-year"
            className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide"
          >
            3. Model Year
          </label>
          <select
            id="brand-selector-year"
            disabled={isCustomMode}
            value={selectedYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="w-full bg-[#0d1014] border border-slate-700 focus:border-orange-500 disabled:opacity-45 rounded-lg px-3 py-2 text-xs text-white font-mono font-medium outline-none"
          >
            {isCustomMode ? (
              <option value="">Custom Year</option>
            ) : (
              validYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))
            )}
          </select>
        </div>

        {/* 4. Factory Engine Option */}
        <div className="space-y-1.5">
          <label
            htmlFor="brand-selector-engine"
            className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide"
          >
            4. Factory Engine ({offeredEngines.length})
          </label>
          <select
            id="brand-selector-engine"
            disabled={isCustomMode || offeredEngines.length === 0}
            value={previewFamily?.id || ''}
            onChange={(e) => handleEngineSelect(e.target.value)}
            className="w-full bg-[#0d1014] border border-slate-700 focus:border-orange-500 disabled:opacity-45 rounded-lg px-3 py-2 text-xs text-white font-medium outline-none"
          >
            {isCustomMode ? (
              <option value="">Manual Specs Preserved</option>
            ) : (
              offeredEngines.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.shortName} — {eng.code}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Custom / Other Mode Banner */}
      {isCustomMode ? (
        <div className="p-4 rounded-xl bg-[#0d1014] border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sliders className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-white text-sm">
                Custom / Other Manual Configuration Active
              </div>
              <p className="text-slate-400 leading-relaxed">
                Your current manual EngineConfig values ({config.bore.toFixed(3)}" bore × {config.stroke.toFixed(3)}" stroke, {config.chamberCc.toFixed(1)}cc chamber, {specs.displacementCi} CID) have been left completely untouched. Edit any dimension below directly.
              </p>
            </div>
          </div>
          {activeConfigFamily && (
            <button
              type="button"
              onClick={() =>
                onUpdateConfig({
                  engineFamilyId: undefined,
                  firingOrder: undefined,
                  bellhousingPattern: undefined
                })
              }
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:border-cyan-400 text-cyan-300 font-semibold whitespace-nowrap"
            >
              Detach Family Tag (Keep Dimensions)
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Clickable Engine Chips for the Chosen Vehicle & Year */}
          {offeredEngines.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  Factory options for <strong className="text-slate-200">{selectedYear} {currentVehicleObj?.make} {currentVehicleObj?.model}</strong>
                  {yearEngineLookup.trimNotes.length > 0 ? ` — ${yearEngineLookup.trimNotes.join(' / ')}` : ''}
                </span>
                <span className="font-mono text-slate-500">
                  Click any engine below to load factory defaults
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {offeredEngines.map((eng) => {
                  const isLoaded = config.engineFamilyId === eng.id;
                  const isPreview = previewFamily?.id === eng.id;
                  return (
                    <button
                      key={eng.id}
                      type="button"
                      onClick={() => handleEngineSelect(eng.id)}
                      className={`text-left p-3 rounded-xl border transition space-y-1.5 ${
                        isLoaded
                          ? 'bg-orange-950/35 border-orange-500 text-white'
                          : isPreview
                          ? 'bg-[#0d1014] border-cyan-500/60 text-slate-200 hover:border-orange-400'
                          : 'bg-[#0d1014] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white truncate">{eng.shortName}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 whitespace-nowrap">
                          {eng.configuration} · {eng.displacementL}L
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {eng.configuration === 'Rotary'
                          ? '2-Rotor 1,308 cc (79.8 CID)'
                          : `${eng.bore.toFixed(3)}" × ${eng.stroke.toFixed(3)}"`}{' '}
                        · {eng.camBaseline.baseHp} HP / {eng.camBaseline.baseTq} TQ
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-amber-300 font-mono truncate">
                          {eng.fuelType || 'Gasoline'} · {eng.aspiration || 'NA'}
                        </span>
                        {isLoaded ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3" /> Loaded
                          </span>
                        ) : (
                          <span className="text-orange-400 font-semibold whitespace-nowrap">
                            Load Factory Defaults
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {lastAppliedLabel && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Loaded factory defaults for <strong>{lastAppliedLabel}</strong> into active EngineConfig.
              </span>
            </div>
          )}

          {/* Selected Factory Engine Specification Sheet */}
          {previewFamily && (
            <div className="bg-[#0d1014] border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{previewFamily.name}</h4>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      {previewFamily.yearStart}–{previewFamily.yearEnd}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                      {previewFamily.configuration} · {previewFamily.fuelType || 'Gasoline'} · {previewFamily.aspiration || 'Naturally Aspirated'}
                    </span>
                    {previewFamily.estimatedFields.length > 0 && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/50 text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Contains ESTIMATED secondary fields
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {previewFamily.family} · Code: {previewFamily.code} · {previewFamily.inductionBaseline.fuelSystemLabel}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => applyEngineDefaults(previewFamily, selectedVehicleId, selectedYear)}
                  className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1.5 transition whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply {previewFamily.shortName} Defaults</span>
                </button>
              </div>

              {/* Factory Architecture & Cam Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Block & Architecture */}
                <div className="p-3 rounded-lg bg-[#12161c] border border-slate-800/80 space-y-1.5">
                  <div className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Block, Heads &amp; Firing Order</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Bore × Stroke:</span>
                      <span className="font-mono text-white tabular-nums">
                        {previewFamily.bore.toFixed(3)}" × {previewFamily.stroke.toFixed(3)}"
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Rod / Deck:</span>
                      <span className="font-mono text-slate-200 tabular-nums">
                        {previewFamily.rodLength.toFixed(3)}" / {previewFamily.deckHeight.toFixed(3)}"
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Factory CR:</span>
                      <span className="font-mono text-amber-300">{previewFamily.factoryCR}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Firing Order:</span>
                      <span className="font-mono text-emerald-300">{previewFamily.firingOrder}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-800 text-slate-300">
                      <span className="text-slate-400">Block: </span>
                      {previewFamily.blockMaterial}
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-400">Heads: </span>
                      {previewFamily.headType}
                    </div>
                  </div>
                </div>

                {/* Stock Cam Baseline */}
                <div className="p-3 rounded-lg bg-[#12161c] border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-orange-400 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Stock Cam Baseline</span>
                    </span>
                    {previewFamily.camBaseline.isEstimated && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300">
                        ESTIMATED
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="font-semibold text-white">{previewFamily.camBaseline.name}</div>
                    <div className="text-slate-400">{previewFamily.camBaseline.lifterType}</div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Dur @ .050":</span>
                      <span className="font-mono text-white tabular-nums">
                        {previewFamily.camBaseline.intakeDur050}° / {previewFamily.camBaseline.exhDur050}°
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Valve Lift:</span>
                      <span className="font-mono text-slate-200 tabular-nums">
                        {previewFamily.camBaseline.valveLiftIntake.toFixed(3)}" / {previewFamily.camBaseline.valveLiftExhaust.toFixed(3)}" ({previewFamily.camBaseline.rockerRatio}:1)
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Factory Output:</span>
                      <span className="font-mono text-orange-300 tabular-nums">
                        {previewFamily.camBaseline.baseHp} HP @ {previewFamily.camBaseline.hpRpm} / {previewFamily.camBaseline.baseTq} TQ @ {previewFamily.camBaseline.tqRpm}
                      </span>
                    </div>
                    <p className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                      {previewFamily.camBaseline.notes}
                    </p>
                  </div>
                </div>

                {/* Bellhousing & Bolt-Up Transmissions */}
                <div className="p-3 rounded-lg bg-[#12161c] border border-slate-800/80 space-y-1.5">
                  <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Cog className="w-3.5 h-3.5" />
                    <span>Bellhousing &amp; Bolt-Up Transmissions</span>
                  </div>
                  <div className="text-[11px] space-y-1">
                    <div>
                      <span className="text-slate-400">Pattern: </span>
                      <span className="font-mono text-amber-300 font-semibold">
                        {previewFamily.bellhousingPattern}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {previewFamily.bellhousingNotes}
                    </p>
                    <div className="pt-1 space-y-1 max-h-32 overflow-y-auto pr-1">
                      {previewFamily.compatibleTransmissions.map((match) => {
                        const trans = TRANSMISSIONS_DB[match.transId];
                        if (!trans) return null;
                        const isActiveTrans = config.selectedTrans === trans.id;
                        return (
                          <button
                            key={match.transId}
                            type="button"
                            onClick={() =>
                              onUpdateConfig({
                                selectedTrans: trans.id,
                                stallSpeed: trans.defaultStall || config.stallSpeed
                              })
                            }
                            className={`w-full text-left px-2 py-1 rounded border text-[10px] transition ${
                              isActiveTrans
                                ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                                : 'bg-[#0d1014] border-slate-800 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold truncate">{trans.name}</span>
                              <span className="font-mono uppercase text-[9px] text-cyan-300 shrink-0">
                                {match.fitment.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-slate-400 truncate">{match.notes}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shop Notes & Estimated Flags */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <div className="flex items-start gap-2 text-slate-300">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{previewFamily.shopNotes}</span>
                </div>
                {previewFamily.estimatedFields.length > 0 && (
                  <span className="font-mono text-[10px] text-amber-300 shrink-0">
                    ESTIMATED: {previewFamily.estimatedFields.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
