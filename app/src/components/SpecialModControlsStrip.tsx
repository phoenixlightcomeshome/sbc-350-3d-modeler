/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CarbStyle,
  CoordinatedSpecs,
  EngineConfig,
  ExhaustPortShape
} from '../types/engine';
import {
  AIR_INDUCTION_PACKAGES,
  CARB_STYLE_OPTIONS,
  EXHAUST_PORT_PRESETS,
  HEADER_PRIMARY_OPTIONS,
  INTAKE_PORT_PRESETS
} from '../data/engineData';
import {
  SlidersHorizontal,
  Wind,
  Flame,
  Gauge,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

interface SpecialModControlsStripProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
  variant?: 'compact' | 'full';
  defaultExpanded?: boolean;
  className?: string;
}

export const SpecialModControlsStrip: React.FC<SpecialModControlsStripProps> = ({
  config,
  specs,
  onUpdateConfig,
  variant = 'compact',
  defaultExpanded = false,
  className = ''
}) => {
  const [expanded, setExpanded] = useState<boolean>(variant === 'full' ? true : defaultExpanded);

  const carbStyle = config.carbStyle || '4150_dp';
  const venturiIn = config.carbVenturiIn ?? 1.375;
  const airBonus = config.airFilterCfmBonus ?? 15;
  const intakePortCc = config.intakePortCc ?? 185;
  const intakeValveIn = config.intakeValveIn ?? 2.02;
  const exhaustPortCc = config.exhaustPortCc ?? 68;
  const exhaustPortShape = config.exhaustPortShape || 'd_port';
  const exhaustValveIn = config.exhaustValveIn ?? 1.60;
  const headerPrimaryIn = config.headerPrimaryIn ?? 1.625;

  const isModified =
    config.carbCfm !== 650 ||
    carbStyle !== '4150_dp' ||
    Math.abs(venturiIn - 1.375) > 0.002 ||
    airBonus !== 15 ||
    intakePortCc !== 185 ||
    intakeValveIn !== 2.02 ||
    exhaustPortCc !== 68 ||
    exhaustPortShape !== 'd_port' ||
    exhaustValveIn !== 1.60 ||
    Math.abs(headerPrimaryIn - 1.625) > 0.002;

  const handleResetMods = () => {
    onUpdateConfig({
      carbCfm: 650,
      carbStyle: '4150_dp',
      carbVenturiIn: 1.375,
      airFilterCfmBonus: 15,
      intakePortCc: 185,
      intakeValveIn: 2.02,
      exhaustPortCc: 68,
      exhaustPortShape: 'd_port',
      exhaustValveIn: 1.60,
      headerPrimaryIn: 1.625
    });
  };

  return (
    <div
      className={`bg-[#12161c] border border-slate-800 rounded-xl overflow-hidden text-xs text-slate-200 ${className}`}
    >
      {/* Top Compact Live Telemetry & Quick Adjust Strip */}
      <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 bg-[#151a22] border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="font-bold text-white uppercase tracking-wide text-[11px]">
              Carb, Air &amp; Exhaust Port Tuning
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] tabular-nums text-slate-300 border-l border-slate-700 pl-3">
            <span>
              Carb:{' '}
              <strong className="text-amber-400">
                {config.carbCfm} CFM
              </strong>{' '}
              ({venturiIn.toFixed(3)}&quot;)
            </span>
            <span>
              Int Port:{' '}
              <strong className="text-cyan-300">
                {intakePortCc} cc · {intakeValveIn.toFixed(2)}&quot;
              </strong>
            </span>
            <span>
              Exh Port:{' '}
              <strong className="text-orange-300">
                {exhaustPortCc} cc {exhaustPortShape.replace('_', '-').toUpperCase()} ·{' '}
                {headerPrimaryIn.toFixed(3)}&quot;
              </strong>
            </span>
            <span>
              E/I:{' '}
              <strong className="text-emerald-400">{specs.eiFlowRatioPct}%</strong>
            </span>
            <span className="text-white font-semibold">
              {specs.peakHp} HP / {specs.peakTq} TQ
              {(specs.portModHpDelta !== 0 || specs.portModTqDelta !== 0) && (
                <span
                  className={`ml-1 ${
                    specs.portModHpDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  ({specs.portModHpDelta >= 0 ? '+' : ''}
                  {specs.portModHpDelta} HP)
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isModified && (
            <button
              type="button"
              onClick={handleResetMods}
              className="px-2.5 py-1 rounded border border-slate-700 bg-[#0d1014] hover:border-orange-500 text-slate-300 hover:text-orange-300 text-[11px] font-medium inline-flex items-center gap-1 transition whitespace-nowrap"
              title="Reset Carburetor, Air Cleaner, and Head Port modifications to baseline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Mods</span>
            </button>
          )}
          {variant === 'compact' && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={`px-2.5 py-1 rounded border text-[11px] font-semibold inline-flex items-center gap-1.5 transition whitespace-nowrap ${
                expanded
                  ? 'bg-orange-600 border-orange-400 text-white'
                  : 'bg-[#0d1014] border-slate-700 text-cyan-300 hover:border-cyan-400'
              }`}
            >
              <span>{expanded ? 'Hide Port / Carb Sliders' : 'Tune Carb, Air & Ports'}</span>
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expandable 3-Column Modification Workbench */}
      {expanded && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[#0f1319]">
          {/* COLUMN 1: CARBURETOR SIZE, STYLE, VENTURI & AIR CLEANER */}
          <div className="bg-[#12161c] border border-slate-800 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 uppercase text-[11px]">
                <Gauge className="w-3.5 h-3.5" />
                <span>1. Carburetor Size &amp; Air Supply</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-white tabular-nums">
                {specs.effectiveCarbCfm} Eff CFM
              </span>
            </div>

            {/* Carb Style */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                Carburetor / Throttle Body Architecture
              </label>
              <select
                value={carbStyle}
                onChange={(e) => {
                  const nextStyle = e.target.value as CarbStyle;
                  const match = CARB_STYLE_OPTIONS.find((c) => c.id === nextStyle);
                  onUpdateConfig({
                    carbStyle: nextStyle,
                    carbVenturiIn: match ? match.venturiIn : venturiIn,
                    carbCfm: match ? match.defaultCfm : config.carbCfm
                  });
                }}
                className="w-full bg-[#0d1014] border border-slate-700 focus:border-amber-400 rounded px-2.5 py-1.5 text-xs text-white outline-none"
              >
                {CARB_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Carb CFM Slider + Presets */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-medium">Carburetor CFM Rating</span>
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  {config.carbCfm} CFM (Demand {specs.peakCfmDemand})
                </span>
              </div>
              <input
                type="range"
                min={350}
                max={1250}
                step={10}
                value={config.carbCfm}
                onChange={(e) => onUpdateConfig({ carbCfm: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="grid grid-cols-4 gap-1">
                {[500, 650, 750, 850, 950, 1050].map((cfm) => (
                  <button
                    key={cfm}
                    type="button"
                    onClick={() => onUpdateConfig({ carbCfm: cfm })}
                    className={`py-1 rounded text-[10px] font-mono border transition ${
                      config.carbCfm === cfm
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-[#0d1014] border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {cfm}
                  </button>
                ))}
              </div>
            </div>

            {/* Venturi Bore & Air Filter Scoop */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Venturi Bore</span>
                  <span className="font-mono text-white font-bold">{venturiIn.toFixed(3)}&quot;</span>
                </div>
                <input
                  type="range"
                  min={1.20}
                  max={1.75}
                  step={0.0125}
                  value={venturiIn}
                  onChange={(e) => onUpdateConfig({ carbVenturiIn: parseFloat(e.target.value) })}
                  className="w-full accent-orange-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400">Air Cleaner / Scoop</label>
                <select
                  value={airBonus}
                  onChange={(e) =>
                    onUpdateConfig({ airFilterCfmBonus: parseInt(e.target.value, 10) })
                  }
                  className="w-full bg-[#0d1014] border border-slate-700 rounded px-2 py-1 text-[11px] text-white outline-none"
                >
                  {AIR_INDUCTION_PACKAGES.map((pkg) => (
                    <option key={pkg.id} value={pkg.bonusCfm}>
                      {pkg.label} ({pkg.bonusCfm >= 0 ? '+' : ''}
                      {pkg.bonusCfm})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 bg-[#0d1014] border border-slate-800 rounded px-2 py-1">
              {specs.carbSizingStatus}
            </div>
          </div>

          {/* COLUMN 2: AIR / INTAKE PORT RUNNER & VALVE MODIFICATIONS */}
          <div className="bg-[#12161c] border border-slate-800 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-cyan-400 uppercase text-[11px]">
                <Wind className="w-3.5 h-3.5" />
                <span>2. Air / Intake Port Modification</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-white tabular-nums">
                {specs.intakeFlowPeakCfm} CFM @ .600&quot;
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-medium">CNC Intake Runner Volume</span>
                <span className="font-mono font-bold text-cyan-300 tabular-nums">
                  {intakePortCc} cc · {specs.intakeVelocityFps} ft/s
                </span>
              </div>
              <input
                type="range"
                min={160}
                max={245}
                step={5}
                value={intakePortCc}
                onChange={(e) => onUpdateConfig({ intakePortCc: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="grid grid-cols-2 gap-1.5">
                {INTAKE_PORT_PRESETS.map((p) => (
                  <button
                    key={p.cc}
                    type="button"
                    onClick={() =>
                      onUpdateConfig({ intakePortCc: p.cc, intakeValveIn: p.valveIn })
                    }
                    className={`px-2 py-1 rounded text-left border text-[10px] transition ${
                      intakePortCc === p.cc && Math.abs(intakeValveIn - p.valveIn) < 0.02
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-semibold'
                        : 'bg-[#0d1014] border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-mono font-bold">
                      {p.cc} cc · {p.valveIn}&quot;
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                Intake Valve Head Diameter
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1.94, 2.02, 2.08, 2.125].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onUpdateConfig({ intakeValveIn: v })}
                    className={`py-1 rounded font-mono text-[11px] border transition ${
                      Math.abs(intakeValveIn - v) < 0.01
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-[#0d1014] border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {v}&quot;
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 3: EXHAUST PORT VOLUME, SHAPE & HEADER PRIMARY */}
          <div className="bg-[#12161c] border border-slate-800 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-orange-400 uppercase text-[11px]">
                <Flame className="w-3.5 h-3.5" />
                <span>3. Exhaust Port &amp; Header Mod</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-white tabular-nums">
                {specs.exhaustFlowPeakCfm} CFM ({specs.eiFlowRatioPct}% E/I)
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                Exhaust Port Shape Profile
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {EXHAUST_PORT_PRESETS.map((ex) => (
                  <button
                    key={ex.shape}
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        exhaustPortShape: ex.shape as ExhaustPortShape,
                        exhaustPortCc: ex.cc,
                        exhaustValveIn: ex.valveIn
                      })
                    }
                    className={`px-2 py-1 rounded text-left border text-[10px] transition ${
                      exhaustPortShape === ex.shape
                        ? 'bg-orange-500/20 border-orange-400 text-white font-semibold'
                        : 'bg-[#0d1014] border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-semibold truncate">{ex.label}</div>
                    <div className="font-mono text-[9px] text-slate-400">
                      {ex.cc} cc · {ex.valveIn}&quot;
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Exhaust Port Volume</span>
                <span className="font-mono font-bold text-orange-300 tabular-nums">
                  {exhaustPortCc} cc · {exhaustValveIn.toFixed(2)}&quot; Valve
                </span>
              </div>
              <input
                type="range"
                min={58}
                max={94}
                step={2}
                value={exhaustPortCc}
                onChange={(e) => onUpdateConfig({ exhaustPortCc: parseInt(e.target.value, 10) })}
                className="w-full accent-orange-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400">Exhaust Valve</label>
                <div className="grid grid-cols-3 gap-1">
                  {[1.5, 1.6, 1.625].map((ev) => (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => onUpdateConfig({ exhaustValveIn: ev })}
                      className={`py-1 rounded font-mono text-[10px] border transition ${
                        Math.abs(exhaustValveIn - ev) < 0.01
                          ? 'bg-orange-500 text-slate-950 border-orange-400 font-bold'
                          : 'bg-[#0d1014] border-slate-700 text-slate-300'
                      }`}
                    >
                      {ev}&quot;
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400">Header Primary OD</label>
                <select
                  value={headerPrimaryIn}
                  onChange={(e) =>
                    onUpdateConfig({ headerPrimaryIn: parseFloat(e.target.value) })
                  }
                  className="w-full bg-[#0d1014] border border-slate-700 rounded px-2 py-1 font-mono text-[11px] text-white outline-none"
                >
                  {HEADER_PRIMARY_OPTIONS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
