/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  CoordinatedSpecs,
  EngineCatalogItem,
  EngineConfig,
  PartOverridesMap,
  PartSpecCategory,
  PartSystemId,
  TransmissionItem
} from '../types/engine';
import {
  BASE_BOM,
  CAM_PROFILES,
  CYLINDER_HEAD_FLOW_BENCH,
  ENGINE_CATALOG,
  HEAD_BOLT_17_SEQUENCE,
  INTAKE_MANIFOLDS,
  RAY_BASELINE_CONFIG,
  TRANSMISSIONS_DB
} from '../data/engineData';
import { calculateCoordinatedSpecs } from '../services/coordinationEngine';
import {
  EffectiveFieldState,
  PART_SYSTEMS,
  PART_SYSTEMS_BY_ID,
  PartFieldDefinition,
  PartSystemDefinition,
  buildFactoryContext,
  buildTransOverridesFromPartMap,
  formatOptionLabel,
  getBaselineConfigForEngine,
  getEffectiveFieldState,
  getMergedBomItems,
  getOverridesForBomAndInspector,
  loadStoredPartOverrides,
  loadStoredTransOverrides,
  parseTransmissionRatios,
  resetSinglePartOverrides,
  resolveActiveCatalogEngine,
  saveStoredPartOverrides,
  saveStoredTransOverrides,
  updatePartFieldOverride,
  validatePartFieldValue,
  valuesAreEqual
} from '../data/partModifications';

export interface TabEngineeringConfigProps {
  config: EngineConfig;
  specs?: CoordinatedSpecs;
  selectedEngine?: EngineCatalogItem;
  selectedEngineId?: string;
  onUpdateConfig: (next: EngineConfig) => void;
  onResetBaseline?: () => void;
  partOverrides?: PartOverridesMap;
  onUpdatePartOverrides?: (next: PartOverridesMap) => void;
  transOverridesById?: Record<string, Partial<TransmissionItem>>;
  onUpdateTransOverrides?: (next: Record<string, Partial<TransmissionItem>>) => void;
  onSelectPartSystem?: (partId: PartSystemId) => void;
}

type StudioSubView = 'studio' | 'quickgrid' | 'overrides';
type PartCategoryFilter =
  | 'all'
  | PartSpecCategory
  | 'custom_only'
  | 'maker_supplied';

const CATEGORY_LABELS: Record<PartSpecCategory, string> = {
  dimension: 'Dimension',
  clearance: 'Clearance',
  material: 'Material',
  torque: 'Torque Spec',
  part_number: 'Part Number',
  performance: 'Performance',
  notes: 'Notes'
};

const GROUP_ORDER: PartSystemDefinition['group'][] = [
  'Core Engine',
  'Induction & Ignition',
  'Support Systems',
  'Powertrain'
];

function stableJsonEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export const TabEngineeringConfig: React.FC<TabEngineeringConfigProps> = ({
  config,
  specs,
  selectedEngine,
  selectedEngineId,
  onUpdateConfig,
  onResetBaseline,
  partOverrides: controlledPartOverrides,
  onUpdatePartOverrides,
  transOverridesById: controlledTransOverrides,
  onUpdateTransOverrides,
  onSelectPartSystem
}) => {
  // Applied override baselines (controlled from App if passed, else localStorage-backed)
  const [storedPartOverrides, setStoredPartOverrides] = useState<PartOverridesMap>(() =>
    controlledPartOverrides ?? loadStoredPartOverrides()
  );
  const [storedTransOverrides, setStoredTransOverrides] = useState<
    Record<string, Partial<TransmissionItem>>
  >(() => controlledTransOverrides ?? loadStoredTransOverrides());

  const appliedPartOverrides = controlledPartOverrides ?? storedPartOverrides;
  const appliedTransOverrides = controlledTransOverrides ?? storedTransOverrides;

  // Draft editing state (keeps Tab 13 Apply / Revert / Unsaved tracking intact)
  const [draftConfig, setDraftConfig] = useState<EngineConfig>(() => ({ ...config }));
  const [draftPartOverrides, setDraftPartOverrides] = useState<PartOverridesMap>(
    () => appliedPartOverrides
  );
  const [draftTransOverrides, setDraftTransOverrides] = useState<
    Record<string, Partial<TransmissionItem>>
  >(() => appliedTransOverrides);

  // Raw text buffers for numeric / ratio inputs so typing partial numbers never jumps
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // UI navigation & filter state
  const [subView, setSubView] = useState<StudioSubView>('studio');
  const [activePartId, setActivePartId] = useState<PartSystemId>('engine_block');
  const [partSearch, setPartSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PartCategoryFilter>('all');
  const [showOnlyCustomParts, setShowOnlyCustomParts] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);

  // Sync draftConfig when external config changes and user doesn't have unapplied edits
  const hasUnsavedConfigChanges = useMemo(
    () => !stableJsonEqual(draftConfig, config),
    [draftConfig, config]
  );
  const hasUnsavedOverrideChanges = useMemo(
    () =>
      !stableJsonEqual(draftPartOverrides, appliedPartOverrides) ||
      !stableJsonEqual(draftTransOverrides, appliedTransOverrides),
    [draftPartOverrides, appliedPartOverrides, draftTransOverrides, appliedTransOverrides]
  );
  const hasAnyRawEdits = Object.keys(rawInputs).length > 0;
  const hasUnsavedChanges =
    hasUnsavedConfigChanges || hasUnsavedOverrideChanges || hasAnyRawEdits;

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setDraftConfig({ ...config });
    }
  }, [config]);

  useEffect(() => {
    if (controlledPartOverrides && !hasUnsavedOverrideChanges) {
      setDraftPartOverrides(controlledPartOverrides);
    }
  }, [controlledPartOverrides]);

  useEffect(() => {
    if (controlledTransOverrides && !hasUnsavedOverrideChanges) {
      setDraftTransOverrides(controlledTransOverrides);
    }
  }, [controlledTransOverrides]);

  // Catalog engine & factory context
  const activeCatalog = useMemo(
    () => selectedEngine || resolveActiveCatalogEngine(draftConfig, selectedEngineId),
    [selectedEngine, draftConfig, selectedEngineId]
  );

  const factoryCtx = useMemo(
    () => buildFactoryContext(draftConfig, activeCatalog),
    [draftConfig, activeCatalog]
  );

  // Live coordinated specs: Applied vs Draft
  const appliedSpecs = useMemo(
    () => specs ?? calculateCoordinatedSpecs(config, appliedTransOverrides),
    [specs, config, appliedTransOverrides]
  );

  const draftSpecs = useMemo(
    () => calculateCoordinatedSpecs(draftConfig, draftTransOverrides),
    [draftConfig, draftTransOverrides]
  );

  // Compute effective state for every field of every part
  const partStatesById = useMemo(() => {
    const result = {} as Record<PartSystemId, EffectiveFieldState[]>;
    for (const part of PART_SYSTEMS) {
      result[part.id] = part.fields.map((field) =>
        getEffectiveFieldState(
          part.id,
          field,
          draftConfig,
          draftPartOverrides,
          factoryCtx,
          draftTransOverrides
        )
      );
    }
    return result;
  }, [draftConfig, draftPartOverrides, factoryCtx, draftTransOverrides]);

  // Summary counts across all 16 parts
  const partCounts = useMemo(() => {
    const counts = {} as Record<
      PartSystemId,
      { custom: number; makerSuppliedFilled: number; makerSuppliedTotal: number; driving: number }
    >;
    let totalCustom = 0;
    let totalDrivingCustom = 0;
    let totalDisplayCustom = 0;

    for (const part of PART_SYSTEMS) {
      const states = partStatesById[part.id];
      let custom = 0;
      let makerSuppliedFilled = 0;
      let makerSuppliedTotal = 0;
      let driving = 0;

      for (const st of states) {
        if (st.field.mode === 'driving') driving += 1;
        if (st.isMakerSupplied) {
          makerSuppliedTotal += 1;
          if (st.isCustom) makerSuppliedFilled += 1;
        }
        if (st.isCustom) {
          custom += 1;
          totalCustom += 1;
          if (st.field.mode === 'driving') totalDrivingCustom += 1;
          else totalDisplayCustom += 1;
        }
      }
      counts[part.id] = { custom, makerSuppliedFilled, makerSuppliedTotal, driving };
    }

    return {
      byPart: counts,
      totalCustom,
      totalDrivingCustom,
      totalDisplayCustom
    };
  }, [partStatesById]);

  const errorCount = Object.keys(validationErrors).length;
  const activePart = PART_SYSTEMS_BY_ID[activePartId];
  const activeFieldStates = partStatesById[activePartId];

  const filteredPartFields = useMemo(() => {
    return activeFieldStates.filter((st) => {
      if (categoryFilter === 'all') return true;
      if (categoryFilter === 'custom_only') return st.isCustom;
      if (categoryFilter === 'maker_supplied') return st.isMakerSupplied;
      return st.field.category === categoryFilter;
    });
  }, [activeFieldStates, categoryFilter]);

  const visibleParts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    return PART_SYSTEMS.filter((p) => {
      if (showOnlyCustomParts && partCounts.byPart[p.id].custom === 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.fields.some((f) => f.label.toLowerCase().includes(q))
      );
    });
  }, [partSearch, showOnlyCustomParts, partCounts]);

  const inspectorEntries = useMemo(
    () => getOverridesForBomAndInspector(draftPartOverrides),
    [draftPartOverrides]
  );

  const mergedBom = useMemo(
    () => getMergedBomItems(BASE_BOM, draftPartOverrides),
    [draftPartOverrides]
  );

  // Sync a full driving-state snapshot into PartOverridesMap cleanly
  const syncAllDrivingOverrides = (
    targetConfig: EngineConfig,
    baseMap: PartOverridesMap,
    targetTransOverrides: Record<string, Partial<TransmissionItem>>
  ): PartOverridesMap => {
    let nextMap: PartOverridesMap = { ...baseMap };
    const ctx = buildFactoryContext(targetConfig, activeCatalog);

    for (const part of PART_SYSTEMS) {
      for (const field of part.fields) {
        if (field.mode !== 'driving') continue;
        const factoryRes = field.getFactory(ctx);
        let currentVal: string | number | null = null;

        if (field.configKey) {
          const v = targetConfig[field.configKey];
          if (v !== undefined) currentVal = v;
          else if (field.key === 'cylinders') currentVal = ctx.catalog?.cylinders ?? 8;
          else if (field.key === 'inductionDress') currentVal = 'carb_hei';
        } else if (field.transOverrideKey && ctx.trans) {
          const ov = targetTransOverrides[ctx.trans.id];
          if (field.transOverrideKey === 'ratios') {
            currentVal = (ov?.ratios ?? ctx.trans.ratios).join(', ');
          } else if (field.transOverrideKey === 'lengthInches') {
            currentVal = ov?.lengthInches ?? ctx.trans.lengthInches;
          }
        }

        nextMap = updatePartFieldOverride(
          nextMap,
          part.id,
          field,
          currentVal,
          factoryRes.value
        );
      }
    }
    return nextMap;
  };

  // Handle field edit for both Driving and Display-Only fields
  const handleFieldChange = (
    partId: PartSystemId,
    field: PartFieldDefinition,
    rawValue: string
  ) => {
    const bufferKey = `${partId}.${field.key}`;
    setStatusBanner(null);

    if (field.inputType === 'number' || field.key === 'transRatios') {
      setRawInputs((prev) => ({ ...prev, [bufferKey]: rawValue }));
    }

    const err = validatePartFieldValue(field, rawValue);
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (err) next[bufferKey] = err;
      else delete next[bufferKey];
      return next;
    });

    if (err) {
      return;
    }

    const factoryRes = field.getFactory(factoryCtx);

    if (field.mode === 'driving' && field.configKey) {
      const typedValue: string | number =
        field.inputType === 'number' || field.key === 'cylinders'
          ? Number(rawValue)
          : rawValue;

      let nextConfig: EngineConfig = {
        ...draftConfig,
        [field.configKey]: typedValue
      } as EngineConfig;

      // Smart stall sync when switching transmission if stall matched previous default
      if (field.configKey === 'selectedTrans') {
        const prevTrans = TRANSMISSIONS_DB[draftConfig.selectedTrans];
        const nextTrans = TRANSMISSIONS_DB[String(typedValue)];
        if (
          nextTrans &&
          (!prevTrans ||
            draftConfig.stallSpeed === prevTrans.defaultStall ||
            nextTrans.type === 'Manual')
        ) {
          nextConfig = { ...nextConfig, stallSpeed: nextTrans.defaultStall };
        }
        // Clear stale raw buffers for transmission subfields
        setRawInputs((prev) => {
          const cleaned = { ...prev };
          delete cleaned['transmission.stallSpeed'];
          delete cleaned['transmission.transRatios'];
          delete cleaned['transmission.transLengthInches'];
          return cleaned;
        });
      }

      setDraftConfig(nextConfig);
      setDraftPartOverrides((prev) =>
        syncAllDrivingOverrides(nextConfig, prev, draftTransOverrides)
      );
      return;
    }

    if (field.transOverrideKey && factoryCtx.trans) {
      const transId = factoryCtx.trans.id;
      const baseTrans = TRANSMISSIONS_DB[transId];
      if (!baseTrans) return;

      const nextTransMap: Record<string, Partial<TransmissionItem>> = {
        ...draftTransOverrides
      };
      const entry: Partial<TransmissionItem> = { ...(nextTransMap[transId] ?? {}) };

      let storeValue: string | number | null = rawValue;
      if (field.transOverrideKey === 'ratios') {
        const parsed = parseTransmissionRatios(rawValue);
        if (!parsed) return;
        const sameAsFactory =
          parsed.length === baseTrans.ratios.length &&
          parsed.every((r, idx) => Math.abs(r - baseTrans.ratios[idx]) < 1e-4);
        if (sameAsFactory) {
          delete entry.ratios;
          storeValue = baseTrans.ratios.join(', ');
        } else {
          entry.ratios = parsed;
          storeValue = parsed.join(', ');
        }
      } else if (field.transOverrideKey === 'lengthInches') {
        const num = Number(rawValue);
        if (Math.abs(num - baseTrans.lengthInches) < 1e-4) {
          delete entry.lengthInches;
        } else {
          entry.lengthInches = num;
        }
        storeValue = num;
      }

      if (Object.keys(entry).length === 0) {
        delete nextTransMap[transId];
      } else {
        nextTransMap[transId] = entry;
      }

      setDraftTransOverrides(nextTransMap);
      setDraftPartOverrides((prev) =>
        updatePartFieldOverride(prev, partId, field, storeValue, factoryRes.value)
      );
      return;
    }

    // Display-only field (stored strictly in overrides; kept out of dyno math)
    const displayVal: string | number | null =
      rawValue.trim() === ''
        ? null
        : field.inputType === 'number'
        ? Number(rawValue)
        : rawValue;

    setDraftPartOverrides((prev) =>
      updatePartFieldOverride(prev, partId, field, displayVal, factoryRes.value)
    );
  };

  // Per-field Revert to Factory
  const handleRevertField = (partId: PartSystemId, field: PartFieldDefinition) => {
    const bufferKey = `${partId}.${field.key}`;
    setRawInputs((prev) => {
      const next = { ...prev };
      delete next[bufferKey];
      return next;
    });
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[bufferKey];
      return next;
    });

    const factoryRes = field.getFactory(factoryCtx);

    if (field.mode === 'driving' && field.configKey) {
      const fallbackBaseline = getBaselineConfigForEngine(activeCatalog);
      const factoryVal =
        factoryRes.value !== null && factoryRes.value !== undefined
          ? factoryRes.value
          : fallbackBaseline[field.configKey];

      const nextConfig: EngineConfig = {
        ...draftConfig,
        [field.configKey]: factoryVal
      } as EngineConfig;

      setDraftConfig(nextConfig);
      setDraftPartOverrides((prev) =>
        syncAllDrivingOverrides(nextConfig, prev, draftTransOverrides)
      );
      setStatusBanner({
        type: 'info',
        text: `Reverted "${field.label}" to factory baseline.`
      });
      return;
    }

    if (field.transOverrideKey && factoryCtx.trans) {
      const transId = factoryCtx.trans.id;
      const nextTransMap = { ...draftTransOverrides };
      const entry = { ...(nextTransMap[transId] ?? {}) };
      delete entry[field.transOverrideKey];
      if (Object.keys(entry).length === 0) delete nextTransMap[transId];
      else nextTransMap[transId] = entry;
      setDraftTransOverrides(nextTransMap);
    }

    setDraftPartOverrides((prev) =>
      updatePartFieldOverride(prev, partId, field, null, factoryRes.value)
    );
    setStatusBanner({
      type: 'info',
      text: `Reverted "${field.label}" to ${
        factoryRes.value !== null ? 'factory value' : 'blank (maker-supplied cleared)'
      }.`
    });
  };

  // Per-part Reset to Factory
  const handleResetPartToFactory = (part: PartSystemDefinition) => {
    const nextConfig: EngineConfig = { ...draftConfig };
    const nextTransMap = { ...draftTransOverrides };
    const nextRaw = { ...rawInputs };
    const nextErrors = { ...validationErrors };

    // If resetting transmission, first reset selectedTrans so stall/ratios match factory trans
    if (part.id === 'transmission') {
      const prevTransId = nextConfig.selectedTrans;
      nextConfig.selectedTrans = RAY_BASELINE_CONFIG.selectedTrans;
      const factoryTrans = TRANSMISSIONS_DB[nextConfig.selectedTrans];
      nextConfig.stallSpeed = factoryTrans
        ? factoryTrans.defaultStall
        : RAY_BASELINE_CONFIG.stallSpeed;
      delete nextTransMap[prevTransId];
      delete nextTransMap[nextConfig.selectedTrans];
    } else {
      for (const field of part.fields) {
        if (field.mode === 'driving' && field.configKey) {
          const factoryRes = field.getFactory(factoryCtx);
          if (factoryRes.value !== null && factoryRes.value !== undefined) {
            (nextConfig as unknown as Record<string, unknown>)[field.configKey] =
              factoryRes.value;
          }
        }
      }
    }

    for (const field of part.fields) {
      const k = `${part.id}.${field.key}`;
      delete nextRaw[k];
      delete nextErrors[k];
    }

    const clearedOverrides = resetSinglePartOverrides(draftPartOverrides, part.id);
    const resynced = syncAllDrivingOverrides(nextConfig, clearedOverrides, nextTransMap);

    setRawInputs(nextRaw);
    setValidationErrors(nextErrors);
    setDraftConfig(nextConfig);
    setDraftTransOverrides(nextTransMap);
    setDraftPartOverrides(resynced);
    setStatusBanner({
      type: 'info',
      text: `Reset "${part.name}" to factory baseline. Click Apply Changes to update 3D / Dyno / BOM.`
    });
  };

  // Global Tab 13 Apply (Driving -> onUpdateConfig + calculateCoordinatedSpecs; Display-Only -> Overrides)
  const handleApplyChanges = () => {
    // Re-validate all active raw inputs before applying
    const errors: Record<string, string> = {};
    for (const part of PART_SYSTEMS) {
      for (const field of part.fields) {
        const key = `${part.id}.${field.key}`;
        if (rawInputs[key] !== undefined) {
          const err = validatePartFieldValue(field, rawInputs[key]);
          if (err) errors[key] = err;
        }
      }
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setStatusBanner({
        type: 'warning',
        text: `Resolve ${Object.keys(errors).length} validation issue(s) before applying.`
      });
      return;
    }

    const syncedOverrides = syncAllDrivingOverrides(
      draftConfig,
      draftPartOverrides,
      draftTransOverrides
    );
    const nextTransOverrides = buildTransOverridesFromPartMap(
      syncedOverrides,
      draftConfig.selectedTrans,
      draftTransOverrides
    );

    const appliedConfigSnapshot: EngineConfig = { ...config, ...draftConfig };
    onUpdateConfig(appliedConfigSnapshot);

    setStoredPartOverrides(syncedOverrides);
    saveStoredPartOverrides(syncedOverrides);
    onUpdatePartOverrides?.(syncedOverrides);

    setStoredTransOverrides(nextTransOverrides);
    saveStoredTransOverrides(nextTransOverrides);
    onUpdateTransOverrides?.(nextTransOverrides);

    setDraftPartOverrides(syncedOverrides);
    setDraftTransOverrides(nextTransOverrides);
    setRawInputs({});
    setValidationErrors({});
    setStatusBanner({
      type: 'success',
      text: 'Applied driving specs to 3D View, Blueprint & Dyno, and saved Custom part overrides for Inspector / BOM / Drawings.'
    });
  };

  // Global Tab 13 Revert Unsaved
  const handleRevertUnsaved = () => {
    setDraftConfig({ ...config });
    setDraftPartOverrides(appliedPartOverrides);
    setDraftTransOverrides(appliedTransOverrides);
    setRawInputs({});
    setValidationErrors({});
    setStatusBanner({
      type: 'info',
      text: 'Reverted all unsaved edits back to last applied configuration.'
    });
  };

  // Global Tab 13 Reset to Baseline
  const handleResetToBaseline = () => {
    const baseline = getBaselineConfigForEngine(activeCatalog);
    setDraftConfig(baseline);
    setDraftPartOverrides({});
    setDraftTransOverrides({});
    setRawInputs({});
    setValidationErrors({});

    if (onResetBaseline) {
      onResetBaseline();
    } else {
      onUpdateConfig(baseline);
    }

    setStoredPartOverrides({});
    saveStoredPartOverrides({});
    onUpdatePartOverrides?.({});

    setStoredTransOverrides({});
    saveStoredTransOverrides({});
    onUpdateTransOverrides?.({});

    setStatusBanner({
      type: 'info',
      text: `Reset entire build and all 16 parts to ${activeCatalog.shortName} factory baseline.`
    });
  };

  const handleSelectPart = (partId: PartSystemId) => {
    // Switching parts resets the category filter, so the new part never
    // opens on an empty filtered list.
    setCategoryFilter('all');
    setActivePartId(partId);
    onSelectPartSystem?.(partId);
  };

  const handleDownloadOverridesJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      engineId: activeCatalog.id,
      engineName: activeCatalog.name,
      config: draftConfig,
      coordinatedSpecs: {
        displacementCi: draftSpecs.displacementCi,
        staticCR: draftSpecs.staticCR,
        dynamicCR: draftSpecs.dynamicCR,
        quenchDistance: draftSpecs.quenchDistance,
        peakHp: draftSpecs.peakHp,
        peakTq: draftSpecs.peakTq
      },
      customOverrides: draftPartOverrides,
      transOverridesById: draftTransOverrides
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCatalog.id}-custom-modifications.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderFieldInput = (partId: PartSystemId, st: EffectiveFieldState) => {
    const { field, effectiveValue } = st;
    const bufferKey = `${partId}.${field.key}`;
    const err = validationErrors[bufferKey];
    const displayInputValue =
      rawInputs[bufferKey] !== undefined
        ? rawInputs[bufferKey]
        : effectiveValue === '' || effectiveValue === null || effectiveValue === undefined
        ? ''
        : field.inputType === 'number' &&
          field.precision !== undefined &&
          typeof effectiveValue === 'number'
        ? effectiveValue.toFixed(field.precision)
        : String(effectiveValue);

    if (field.inputType === 'select' && field.options) {
      return (
        <select
          value={String(effectiveValue)}
          onChange={(e) => handleFieldChange(partId, field, e.target.value)}
          className={`w-full rounded-md border px-2.5 py-1.5 text-xs font-mono bg-slate-950 text-slate-100 focus:outline-none focus:ring-1 ${
            err
              ? 'border-rose-500 focus:ring-rose-500'
              : st.isCustom
              ? 'border-amber-500/70 focus:ring-amber-400'
              : 'border-slate-700 focus:ring-cyan-500'
          }`}
        >
          {field.options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <input
          type={field.inputType === 'number' ? 'number' : 'text'}
          value={displayInputValue}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={
            field.placeholder ||
            (st.isMakerSupplied ? 'Maker-supplied (blank in factory data)' : '')
          }
          onChange={(e) => handleFieldChange(partId, field, e.target.value)}
          className={`w-full rounded-md border px-2.5 py-1.5 text-xs font-mono bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 ${
            err
              ? 'border-rose-500 focus:ring-rose-500'
              : st.isCustom
              ? 'border-amber-500/70 focus:ring-amber-400'
              : 'border-slate-700 focus:ring-cyan-500'
          }`}
        />
        {field.unit && (
          <span className="shrink-0 rounded bg-slate-800 px-2 py-1 text-[11px] font-mono text-slate-300 border border-slate-700">
            {field.unit}
          </span>
        )}
      </div>
    );
  };

  const renderPartLiveContextCard = (partId: PartSystemId) => {
    switch (partId) {
      case 'engine_block':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Displacement
              </div>
              <div className="text-sm font-mono font-semibold text-cyan-300">
                {draftSpecs.displacementCi} ci ({draftSpecs.displacementL} L)
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Quench Distance
              </div>
              <div
                className={`text-sm font-mono font-semibold ${
                  draftSpecs.quenchDistance < 0.038
                    ? 'text-rose-400'
                    : draftSpecs.quenchDistance <= 0.055
                    ? 'text-emerald-400'
                    : 'text-amber-300'
                }`}
              >
                {draftSpecs.quenchDistance.toFixed(4)}&quot;
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Deck + Gasket Vol
              </div>
              <div className="text-sm font-mono font-semibold text-slate-200">
                {(draftSpecs.deckVolumeCc + draftSpecs.gasketVolumeCc).toFixed(2)} cc
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Quench Audit
              </div>
              <div className="text-[11px] text-slate-300 leading-tight">
                {draftSpecs.quenchStatus}
              </div>
            </div>
          </div>
        );

      case 'cylinder_heads':
        return (
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Static CR
                </div>
                <div className="text-sm font-mono font-semibold text-cyan-300">
                  {draftSpecs.staticCR}:1
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Dynamic CR
                </div>
                <div className="text-sm font-mono font-semibold text-emerald-300">
                  {draftSpecs.dynamicCR}:1
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Total Clearance Vol
                </div>
                <div className="text-sm font-mono font-semibold text-slate-200">
                  {draftSpecs.totalClearanceCc} cc
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  17-Bolt Pattern
                </div>
                <div className="text-xs font-mono text-slate-300">
                  {activeCatalog.id === 'sbc_350_ray'
                    ? `${HEAD_BOLT_17_SEQUENCE.length} bolts · 25→45→65 ft-lbs`
                    : 'No engine-specific sequence in catalog'}
                </div>
              </div>
            </div>
            {activeCatalog.id === 'sbc_350_ray' && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                  Factory Flow Bench Reference (CYLINDER_HEAD_FLOW_BENCH)
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {CYLINDER_HEAD_FLOW_BENCH.map((pt) => (
                    <div
                      key={pt.lift}
                      className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-center font-mono"
                    >
                      <div className="text-[10px] text-slate-400">
                        .{Math.round(pt.lift * 1000)}&quot;
                      </div>
                      <div className="text-[11px] text-cyan-300">I: {pt.intakeCfm}</div>
                      <div className="text-[11px] text-amber-300">E: {pt.exhaustCfm}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'crankshaft':
      case 'connecting_rods':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Rod / Stroke Ratio
              </div>
              <div className="text-sm font-mono font-semibold text-cyan-300">
                {draftSpecs.rodStrokeRatio}:1
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Max Rod Angle
              </div>
              <div className="text-sm font-mono font-semibold text-slate-200">
                {draftSpecs.maxRodAngleDeg}°
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Piston Speed @ 6K
              </div>
              <div className="text-sm font-mono font-semibold text-amber-300">
                {draftSpecs.meanPistonSpeed6000} FPM
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Displacement
              </div>
              <div className="text-sm font-mono font-semibold text-emerald-300">
                {draftSpecs.displacementCi} ci
              </div>
            </div>
          </div>
        );

      case 'pistons':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Top / 2nd / Oil Gap
              </div>
              <div className="text-xs font-mono font-semibold text-cyan-300">
                {draftSpecs.topRingGap.toFixed(3)}&quot; /{' '}
                {draftSpecs.secondRingGap.toFixed(3)}&quot; /{' '}
                {draftSpecs.oilRingGap.toFixed(3)}&quot;
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Static CR Impact
              </div>
              <div className="text-sm font-mono font-semibold text-emerald-300">
                {draftSpecs.staticCR}:1
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                PTW Clearance Spec (Driven by Alloy)
              </div>
              <div className="text-xs font-mono text-slate-200">
                {draftSpecs.ptwClearance}
              </div>
            </div>
          </div>
        );

      case 'camshaft':
      case 'valvetrain':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Total Valve Lift
              </div>
              <div className="text-sm font-mono font-semibold text-cyan-300">
                {draftSpecs.totalValveLift.toFixed(3)}&quot;
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Duration @ .050&quot;
              </div>
              <div className="text-sm font-mono font-semibold text-slate-200">
                {draftSpecs.camData.intakeDur050}° / {draftSpecs.camData.exhDur050}°
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Dynamic CR (IVC {draftSpecs.camData.ivcDeg}°)
              </div>
              <div className="text-sm font-mono font-semibold text-emerald-300">
                {draftSpecs.dynamicCR}:1
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Rec. Converter Stall
              </div>
              <div className="text-sm font-mono font-semibold text-amber-300">
                {draftSpecs.camData.recStall} RPM
              </div>
            </div>
          </div>
        );

      case 'intake_manifold':
      case 'carb_efi':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Peak Airflow Demand
              </div>
              <div className="text-sm font-mono font-semibold text-cyan-300">
                {draftSpecs.peakCfmDemand} CFM
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Intake Flow / Runner
              </div>
              <div className="text-xs font-mono font-semibold text-slate-200">
                {draftSpecs.intakeData.flowCfm} CFM · {draftSpecs.intakeData.runnerCc} cc
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                BSFC / Fuel Flow
              </div>
              <div className="text-sm font-mono font-semibold text-amber-300">
                {draftSpecs.bsfcLbHr} lb/hr ({draftSpecs.fuelGph} GPH)
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Projected Peak Output
              </div>
              <div className="text-sm font-mono font-semibold text-emerald-300">
                {draftSpecs.peakHp} HP / {draftSpecs.peakTq} lb-ft
              </div>
            </div>
          </div>
        );

      case 'ignition':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Detonation / Knock Audit
              </div>
              <div
                className={`text-xs font-mono font-semibold ${
                  draftSpecs.knockRisk ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {draftSpecs.knockRisk
                  ? 'HIGH KNOCK RISK (> 38° BTDC — 0.92x power loss)'
                  : `SAFE ADVANCE (${draftConfig.ignitionTiming}° BTDC)`}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Peak Power w/ Timing
              </div>
              <div className="text-sm font-mono font-semibold text-cyan-300">
                {draftSpecs.peakHp} HP @ {draftSpecs.hpPeakRpm} RPM
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Firing Order
              </div>
              <div className="text-sm font-mono font-semibold text-slate-200">
                {activeCatalog.firingOrder}
              </div>
            </div>
          </div>
        );

      case 'transmission':
      case 'driveline':
        return (
          <div className="space-y-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Bellhousing Fitment
                </div>
                <div
                  className={`text-xs font-mono font-semibold ${
                    draftSpecs.compatibility.isDirectBoltOn
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }`}
                >
                  {draftSpecs.compatibility.isDirectBoltOn
                    ? 'Direct Bolt-On'
                    : draftSpecs.compatibility.adapterRequired}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Tunnel Clearance
                </div>
                <div className="text-xs text-slate-200">
                  {draftSpecs.compatibility.tunnelClearance}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1 pr-3">Gear</th>
                    <th className="py-1 pr-3">Ratio</th>
                    <th className="py-1 pr-3">Total Red.</th>
                    <th className="py-1 pr-3">MPH @ 2,500</th>
                    <th className="py-1 pr-3">MPH @ 5,500</th>
                    <th className="py-1">65 MPH RPM</th>
                  </tr>
                </thead>
                <tbody>
                  {draftSpecs.speedInGearTable.map((row) => (
                    <tr key={row.gear} className="border-b border-slate-900 text-slate-200">
                      <td className="py-1 pr-3">G{row.gear}</td>
                      <td className="py-1 pr-3">{row.ratio.toFixed(2)}</td>
                      <td className="py-1 pr-3">{row.totalReduction.toFixed(2)}</td>
                      <td className="py-1 pr-3">{row.mphAt2500}</td>
                      <td className="py-1 pr-3">{row.mphAt5500}</td>
                      <td className="py-1 text-cyan-300">{row.cruiseRpmAt65}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return (
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300 flex items-center justify-between gap-3">
            <span>
              <strong className="text-slate-100">Display-Only System:</strong> Overrides here
              update Inspector, BOM, and Drawings while staying isolated from dyno math.
            </span>
            <span className="shrink-0 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-300">
              Dyno Impact: None
            </span>
          </div>
        );
    }
  };

  const deltaHp = draftSpecs.peakHp - appliedSpecs.peakHp;
  const deltaTq = draftSpecs.peakTq - appliedSpecs.peakTq;
  const deltaCi = +(draftSpecs.displacementCi - appliedSpecs.displacementCi).toFixed(2);
  const deltaCr = +(draftSpecs.staticCR - appliedSpecs.staticCR).toFixed(2);
  const topGearRow =
    draftSpecs.speedInGearTable[draftSpecs.speedInGearTable.length - 1];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-5 bg-slate-950 text-slate-100 min-h-full">
      {/* Sticky Control Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-orange-600/20 border border-orange-500/40 px-2 py-0.5 text-[11px] font-mono font-semibold text-orange-300">
                TAB 13 · ENGINEERING &amp; MODIFICATION STUDIO
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                Active Engine: {activeCatalog.shortName}
              </span>
              {hasUnsavedChanges ? (
                <span className="inline-flex items-center rounded-md bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-300">
                  ● Unsaved Changes
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-mono text-emerald-300">
                  ✓ Synced with 3D / Blueprint / Dyno
                </span>
              )}
              {partCounts.totalCustom > 0 && (
                <span className="inline-flex items-center rounded-md bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[11px] font-mono text-amber-200">
                  {partCounts.totalCustom} Custom ({partCounts.totalDrivingCustom} Driving ·{' '}
                  {partCounts.totalDisplayCustom} Display-Only)
                </span>
              )}
            </div>
            <h2 className="mt-1.5 text-lg font-bold tracking-tight text-white">
              Per-Part Modification Studio &amp; Coordinated Spec Configurator
            </h2>
            <p className="text-xs text-slate-400">
              Adjust driving geometry, clearances, materials, torque specs, and part numbers
              across all 16 subsystems. Blank factory specs remain flagged{' '}
              <span className="text-sky-300 font-medium">Maker-Supplied</span> until filled.
            </p>
          </div>

          {/* Global Apply / Revert / Reset */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRevertUnsaved}
              disabled={!hasUnsavedChanges}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Revert Unsaved
            </button>
            <button
              type="button"
              onClick={handleResetToBaseline}
              className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-900/60 transition"
            >
              Reset to Baseline
            </button>
            <button
              type="button"
              onClick={handleApplyChanges}
              disabled={!hasUnsavedChanges || errorCount > 0}
              className="rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white shadow transition"
            >
              {errorCount > 0
                ? `Fix ${errorCount} Error(s) to Apply`
                : 'Apply Changes to Build'}
            </button>
          </div>
        </div>

        {/* Live Telemetry Comparison Bar */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2.5">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Displacement
            </div>
            <div className="mt-0.5 text-sm font-mono font-bold text-white">
              {draftSpecs.displacementCi} ci
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {deltaCi !== 0 ? (
                <span className="text-amber-300">
                  {deltaCi > 0 ? `+${deltaCi}` : deltaCi} ci vs applied
                </span>
              ) : (
                `${draftSpecs.displacementL} L`
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Static / Dynamic CR
            </div>
            <div className="mt-0.5 text-sm font-mono font-bold text-cyan-300">
              {draftSpecs.staticCR}:1 / {draftSpecs.dynamicCR}:1
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {deltaCr !== 0 ? (
                <span className="text-amber-300">
                  {deltaCr > 0 ? `+${deltaCr}` : deltaCr} SCR delta
                </span>
              ) : (
                'Compression'
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Quench Distance
            </div>
            <div
              className={`mt-0.5 text-sm font-mono font-bold ${
                draftSpecs.quenchDistance < 0.038
                  ? 'text-rose-400'
                  : draftSpecs.quenchDistance <= 0.055
                  ? 'text-emerald-400'
                  : 'text-amber-300'
              }`}
            >
              {draftSpecs.quenchDistance.toFixed(4)}&quot;
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {draftSpecs.quenchDistance <= 0.055 && draftSpecs.quenchDistance >= 0.038
                ? 'Optimal Quench'
                : draftSpecs.quenchDistance < 0.038
                ? 'Piston-Head Risk'
                : 'Detonation Zone'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Peak Horsepower
            </div>
            <div className="mt-0.5 text-sm font-mono font-bold text-orange-400">
              {draftSpecs.peakHp} HP
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {deltaHp !== 0 ? (
                <span className={deltaHp > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {deltaHp > 0 ? `+${deltaHp}` : deltaHp} HP @ {draftSpecs.hpPeakRpm}
                </span>
              ) : (
                `@ ${draftSpecs.hpPeakRpm} RPM`
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Peak Torque
            </div>
            <div className="mt-0.5 text-sm font-mono font-bold text-amber-300">
              {draftSpecs.peakTq} lb-ft
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {deltaTq !== 0 ? (
                <span className={deltaTq > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {deltaTq > 0 ? `+${deltaTq}` : deltaTq} lb-ft @ {draftSpecs.tqPeakRpm}
                </span>
              ) : (
                `@ ${draftSpecs.tqPeakRpm} RPM`
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Airflow / Lift
            </div>
            <div className="mt-0.5 text-sm font-mono font-bold text-slate-100">
              {draftSpecs.peakCfmDemand} CFM
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {draftSpecs.totalValveLift.toFixed(3)}&quot; lift
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              65 MPH Cruise
            </div>
            <div className="mt-0.5 text-sm font-mono font-bold text-emerald-300">
              {topGearRow ? `${topGearRow.cruiseRpmAt65} RPM` : '—'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {draftSpecs.knockRisk ? '⚠ Knock Risk >38°' : `R/S ${draftSpecs.rodStrokeRatio}:1`}
            </div>
          </div>
        </div>

        {/* Sub-view Switcher & Status */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSubView('studio')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                subView === 'studio'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              16-Part Modification Studio
            </button>
            <button
              type="button"
              onClick={() => setSubView('quickgrid')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                subView === 'quickgrid'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Driving Specs Quick Grid
            </button>
            <button
              type="button"
              onClick={() => setSubView('overrides')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                subView === 'overrides'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Custom Overrides &amp; BOM Feed ({partCounts.totalCustom})
            </button>
          </div>

          {statusBanner && (
            <div
              className={`rounded-md px-2.5 py-1 text-xs font-medium border ${
                statusBanner.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-200'
                  : statusBanner.type === 'warning'
                  ? 'border-rose-500/40 bg-rose-950/60 text-rose-200'
                  : 'border-cyan-500/40 bg-cyan-950/60 text-cyan-200'
              }`}
            >
              {statusBanner.text}
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: 16-PART MODIFICATION STUDIO */}
      {subView === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Rail: All 16 Parts / Systems */}
          <aside className="lg:col-span-4 xl:col-span-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                All 16 Subsystems
              </span>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyCustomParts}
                  onChange={(e) => setShowOnlyCustomParts(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-950 text-amber-500"
                />
                Custom only
              </label>
            </div>

            <input
              type="text"
              value={partSearch}
              onChange={(e) => setPartSearch(e.target.value)}
              placeholder="Filter parts or spec fields..."
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

            <div className="flex flex-col gap-3 max-h-[680px] overflow-y-auto pr-1">
              {GROUP_ORDER.map((group) => {
                const groupParts = visibleParts.filter((p) => p.group === group);
                if (groupParts.length === 0) return null;
                return (
                  <div key={group} className="space-y-1">
                    <div className="px-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {group}
                    </div>
                    {groupParts.map((part) => {
                      const stats = partCounts.byPart[part.id];
                      const isSelected = part.id === activePartId;
                      const partHasErrors = part.fields.some(
                        (f) => validationErrors[`${part.id}.${f.key}`]
                      );

                      return (
                        <button
                          key={part.id}
                          type="button"
                          onClick={() => handleSelectPart(part.id)}
                          className={`w-full text-left rounded-lg border px-2.5 py-2 transition ${
                            isSelected
                              ? 'border-orange-500 bg-orange-950/30 shadow-sm'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                                {String(part.order).padStart(2, '0')}
                              </span>
                              <span className="truncate text-xs font-semibold text-slate-100">
                                {part.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {partHasErrors && (
                                <span className="rounded bg-rose-500/20 border border-rose-500/50 px-1.5 py-0.5 text-[10px] font-mono text-rose-300">
                                  Err
                                </span>
                              )}
                              {stats.custom > 0 && (
                                <span className="rounded bg-amber-500/20 border border-amber-400/50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-300">
                                  {stats.custom} Custom
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>
                              {stats.driving > 0
                                ? `${stats.driving} driving · ${
                                    part.fields.length - stats.driving
                                  } display`
                                : `${part.fields.length} display-only`}
                            </span>
                            {stats.makerSuppliedTotal > 0 && (
                              <span className="text-sky-400/90">
                                {stats.makerSuppliedFilled}/{stats.makerSuppliedTotal}{' '}
                                maker
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right Workspace: Selected Part Spec Editor */}
          <section className="lg:col-span-8 xl:col-span-9 rounded-xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                    Part {String(activePart.order).padStart(2, '0')} / 16 · {activePart.group}
                  </span>
                  {partCounts.byPart[activePart.id].custom > 0 && (
                    <span className="rounded bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-300">
                      {partCounts.byPart[activePart.id].custom} Custom Override(s)
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-base font-bold text-white">{activePart.name}</h3>
                <p className="text-xs text-slate-400">{activePart.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400">
                  {activePart.subassemblyKeys.length > 0 && (
                    <span className="rounded bg-slate-950 border border-slate-800 px-1.5 py-0.5">
                      3D/Drawing Keys: {activePart.subassemblyKeys.join(', ')}
                    </span>
                  )}
                  {activePart.bomCategories.length > 0 && (
                    <span className="rounded bg-slate-950 border border-slate-800 px-1.5 py-0.5">
                      BOM Links: {activePart.bomCategories.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleResetPartToFactory(activePart)}
                disabled={partCounts.byPart[activePart.id].custom === 0}
                className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Reset Part to Factory
              </button>
            </div>

            {/* Live Engineering Output Card for Active Part */}
            {renderPartLiveContextCard(activePart.id)}

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['all', 'All Specs'],
                  ['dimension', 'Dimensions'],
                  ['clearance', 'Clearances'],
                  ['material', 'Materials'],
                  ['torque', 'Torque Specs'],
                  ['part_number', 'Part Numbers'],
                  ['performance', 'Performance'],
                  ['custom_only', 'Custom Only'],
                  ['maker_supplied', 'Maker-Supplied']
                ] as [PartCategoryFilter, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryFilter(key)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium border transition ${
                    categoryFilter === key
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Field Rows */}
            {filteredPartFields.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
                No fields match the selected filter on {activePart.name}.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {filteredPartFields.map((st) => {
                  const bufferKey = `${activePart.id}.${st.field.key}`;
                  const err = validationErrors[bufferKey];
                  const factoryDisplay =
                    st.factoryValue !== null && st.factoryValue !== undefined
                      ? formatOptionLabel(st.field, st.factoryValue)
                      : null;

                  return (
                    <div
                      key={st.field.key}
                      className={`rounded-lg border p-3 flex flex-col gap-2 transition ${
                        err
                          ? 'border-rose-500/70 bg-rose-950/20'
                          : st.isCustom
                          ? 'border-amber-500/60 bg-amber-950/15'
                          : 'border-slate-800 bg-slate-950/75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-white">
                              {st.field.label}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                                st.field.mode === 'driving'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {st.field.mode === 'driving'
                                ? 'Driving → 3D/BP/Dyno'
                                : 'Display-Only → BOM/Inspector'}
                            </span>
                            <span className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                              {CATEGORY_LABELS[st.field.category]}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {st.isCustom && (
                            <span className="rounded bg-amber-500/20 border border-amber-400/60 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase text-amber-300">
                              Custom
                            </span>
                          )}
                          {st.isMakerSupplied && (
                            <span className="rounded bg-sky-500/15 border border-sky-400/40 px-1.5 py-0.5 text-[10px] font-mono text-sky-300">
                              Maker-Supplied
                            </span>
                          )}
                          {st.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleRevertField(activePart.id, st.field)}
                              className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-200 hover:bg-slate-700"
                            >
                              Revert
                            </button>
                          )}
                        </div>
                      </div>

                      {renderFieldInput(activePart.id, st)}

                      {err && (
                        <div className="text-[11px] font-medium text-rose-400">{err}</div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="font-mono text-slate-400">
                          {factoryDisplay !== null ? (
                            <>
                              Factory:{' '}
                              <span className="text-slate-200">{factoryDisplay}</span>
                              {st.factorySource && (
                                <span className="text-slate-500">
                                  {' '}
                                  ({st.factorySource})
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sky-300/90">
                              Factory: Blank — no factory figure in catalog (Maker-Supplied)
                            </span>
                          )}
                        </div>
                        {st.field.inputType === 'number' &&
                          st.field.min !== undefined &&
                          st.field.max !== undefined && (
                            <span className="font-mono text-[10px] text-slate-500">
                              Range: {st.field.min}–{st.field.max}
                              {st.field.unit ? ` ${st.field.unit}` : ''}
                            </span>
                          )}
                      </div>

                      {st.field.description && (
                        <div className="text-[11px] text-slate-400">
                          {st.field.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* VIEW 2: DRIVING SPECS QUICK GRID */}
      {subView === 'quickgrid' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                All Driving Specs (Synchronized with 16-Part Studio)
              </h3>
              <p className="text-xs text-slate-400">
                Every field here flows through{' '}
                <code className="text-cyan-300">onUpdateConfig</code> +{' '}
                <code className="text-cyan-300">calculateCoordinatedSpecs</code> on Apply.
              </p>
            </div>
            <span className="rounded bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-300">
              Engine Catalog Presets:{' '}
              {Object.values(ENGINE_CATALOG)
                .map((e) => e.shortName)
                .join(' · ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {PART_SYSTEMS.flatMap((part) =>
              partStatesById[part.id]
                .filter((st) => st.field.mode === 'driving')
                .map((st) => {
                  const bufferKey = `${part.id}.${st.field.key}`;
                  const err = validationErrors[bufferKey];
                  return (
                    <div
                      key={bufferKey}
                      className={`rounded-lg border p-3 flex flex-col gap-2 ${
                        err
                          ? 'border-rose-500/70 bg-rose-950/20'
                          : st.isCustom
                          ? 'border-amber-500/60 bg-amber-950/15'
                          : 'border-slate-800 bg-slate-950/75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          {part.shortName}
                        </span>
                        <div className="flex items-center gap-1">
                          {st.isCustom && (
                            <>
                              <span className="rounded bg-amber-500/20 border border-amber-400/50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                                Custom
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRevertField(part.id, st.field)}
                                className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
                              >
                                Revert
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-white">
                        {st.field.label}
                      </div>
                      {renderFieldInput(part.id, st)}
                      {err && <div className="text-[11px] text-rose-400">{err}</div>}
                      <div className="text-[11px] font-mono text-slate-400">
                        Factory:{' '}
                        {st.factoryValue !== null
                          ? formatOptionLabel(st.field, st.factoryValue)
                          : 'Blank'}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: CONSOLIDATED CUSTOM OVERRIDES & BOM / INSPECTOR FEED */}
      {subView === 'overrides' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Active Custom Overrides Table */}
          <div className="xl:col-span-7 rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Active Custom Overrides ({inspectorEntries.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Driving specs feed dyno/3D math; Display-Only specs feed Inspector, BOM, and
                  Technical Drawings.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadOverridesJson}
                className="rounded-md border border-cyan-500/40 bg-cyan-950/60 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-900/60"
              >
                Export Custom Spec JSON
              </button>
            </div>

            {inspectorEntries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-xs text-slate-400">
                All 16 parts are currently at Factory baseline values with no maker overrides.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                      <th className="py-2 pr-3">Part</th>
                      <th className="py-2 pr-3">Spec</th>
                      <th className="py-2 pr-3">Factory</th>
                      <th className="py-2 pr-3">Custom Value</th>
                      <th className="py-2 pr-3">Scope</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectorEntries.map((entry) => {
                      const partDef = PART_SYSTEMS_BY_ID[entry.partId];
                      const fieldDef = partDef?.fields.find(
                        (f) => f.key === entry.fieldKey
                      );
                      return (
                        <tr
                          key={`${entry.partId}.${entry.fieldKey}`}
                          className="border-b border-slate-800/70"
                        >
                          <td className="py-2 pr-3 font-medium text-slate-200">
                            {entry.partName}
                          </td>
                          <td className="py-2 pr-3 text-slate-300">{entry.label}</td>
                          <td className="py-2 pr-3 font-mono text-[11px] text-slate-400">
                            {entry.factoryValue !== null
                              ? String(entry.factoryValue)
                              : 'Blank (Maker-Supplied)'}
                          </td>
                          <td className="py-2 pr-3 font-mono text-amber-300 font-semibold">
                            {String(entry.value)}
                            {entry.unit ? ` ${entry.unit}` : ''}
                          </td>
                          <td className="py-2 pr-3">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                                entry.mode === 'driving'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {entry.mode === 'driving' ? 'Driving' : 'Display-Only'}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            {fieldDef && (
                              <button
                                type="button"
                                onClick={() => handleRevertField(entry.partId, fieldDef)}
                                className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-700"
                              >
                                Revert
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Merged BOM Preview */}
          <div className="xl:col-span-5 rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-white">
                BOM Preview w/ Display-Only Overrides
              </h3>
              <p className="text-xs text-slate-400">
                Shows <code className="text-cyan-300">BASE_BOM</code> merged with your custom
                part numbers &amp; materials.
              </p>
            </div>
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {mergedBom.map((item) => (
                <div
                  key={`${item.cat}-${item.num}`}
                  className={`rounded-lg border p-2.5 text-xs ${
                    item.isCustom
                      ? 'border-amber-500/60 bg-amber-950/20'
                      : 'border-slate-800 bg-slate-950/75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-200">{item.cat}</span>
                    <div className="flex items-center gap-1.5">
                      {item.isCustom && (
                        <span className="rounded bg-amber-500/20 border border-amber-400/50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                          Custom
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-cyan-300">
                        {item.num}
                      </span>
                    </div>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{item.part}</div>
                  {item.factoryPartNum && item.factoryPartNum !== item.num && (
                    <div className="mt-1 text-[10px] font-mono text-slate-400">
                      Factory PN: {item.factoryPartNum}
                    </div>
                  )}
                  {item.customMaterial && (
                    <div className="mt-0.5 text-[10px] font-mono text-amber-200">
                      Custom Material: {item.customMaterial}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabEngineeringConfig;