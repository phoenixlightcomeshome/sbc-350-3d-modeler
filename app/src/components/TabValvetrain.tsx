/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EngineConfig, CoordinatedSpecs, CamProfileId } from '../types/engine';
import { CAM_PROFILES } from '../data/engineData';
import { SpecialModControlsStrip } from './SpecialModControlsStrip';
import { Wind, Activity, CheckCircle2, Sliders, Layers } from 'lucide-react';

interface TabValvetrainProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
}

export const TabValvetrain: React.FC<TabValvetrainProps> = ({
  config,
  specs,
  onUpdateConfig
}) => {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 font-mono text-xs text-gray-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-700/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
            <Wind className="w-5 h-5 text-cyan-400" />
            VALVETRAIN, CAM DYNAMICS &amp; HEAD FLOW BENCH
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-sans">
            MODSIM valvetrain physics: Dictates intake valve closing (IVC), Dynamic Compression Ratio (DCR), and valve float threshold.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="bg-[#181e24] px-3 py-1.5 rounded-lg border border-gray-700 text-center">
            <div className="text-[10px] text-gray-400">STATIC CR</div>
            <div className="text-base font-black text-amber-400 font-mono">{specs.staticCR}:1</div>
          </div>
          <div className="bg-[#181e24] px-3 py-1.5 rounded-lg border border-cyan-500/40 text-center">
            <div className="text-[10px] text-cyan-400 font-bold">DYNAMIC CR</div>
            <div className="text-base font-black text-cyan-300 font-mono">{specs.dynamicCR}:1</div>
          </div>
        </div>
      </div>

      {/* Porting, Carburetor & Exhaust Port Live Controls */}
      <SpecialModControlsStrip
        config={config}
        specs={specs}
        onUpdateConfig={onUpdateConfig}
        variant="compact"
        defaultExpanded
      />

      {/* Camshaft Profile Selector Cards */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
          CAMSHAFT DURATION &amp; LIFT PROFILES:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.values(CAM_PROFILES).map((cam) => (
            <div
              key={cam.id}
              onClick={() => onUpdateConfig({ camProfile: cam.id as CamProfileId })}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                config.camProfile === cam.id
                  ? 'bg-orange-950/30 border-orange-500 shadow-lg ring-1 ring-orange-500'
                  : 'bg-[#181e24] border-gray-800 hover:border-gray-700'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="font-bold text-sm text-white font-sans">{cam.name}</h3>
                  {config.camProfile === cam.id && (
                    <span className="bg-orange-500 text-black px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mb-3 font-sans leading-relaxed">{cam.desc}</p>
              </div>

              <div className="space-y-1 bg-black/50 p-2.5 rounded-lg border border-gray-800/80 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration @ .050":</span>
                  <span className="text-white font-bold">{cam.intakeDur050}° / {cam.exhDur050}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lobe Lift:</span>
                  <span className="text-amber-400 font-bold">{cam.lobeLift}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">LSA / IVC:</span>
                  <span className="text-cyan-400 font-bold">{cam.lsa}° / {cam.ivcDeg}° ABDC</span>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-1">
                  <span className="text-gray-400">Recommended Stall:</span>
                  <span className="text-emerald-400 font-bold">{cam.recStall} RPM</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rocker Arms, Chamber CC & Net Valve Lift */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rocker Arm Ratio */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-bold">ROCKER ARM RATIO:</span>
            <span className="text-cyan-400 font-bold text-sm">{config.rockerRatio}:1</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1.5, 1.6].map((ratio) => (
              <button
                key={ratio}
                onClick={() => onUpdateConfig({ rockerRatio: ratio })}
                className={`py-2 px-3 rounded-lg text-center border transition ${
                  config.rockerRatio === ratio
                    ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                    : 'bg-black/50 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <div className="text-xs">{ratio}:1 Ratio</div>
                <div className="text-[10px] text-gray-400">{ratio === 1.5 ? 'GM Factory' : '+.034" Lift'}</div>
              </button>
            ))}
          </div>
          <div className="p-2 bg-black/50 rounded text-[11px] text-gray-300">
            Net Valve Lift: <strong className="text-emerald-400">{specs.totalValveLift}"</strong> (Lobe Lift × Rocker Ratio)
          </div>
        </div>

        {/* Cylinder Head Chamber Volume */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-bold">CHAMBER VOLUME:</span>
            <span className="text-amber-400 font-bold text-sm">{config.chamberCc.toFixed(1)} cc</span>
          </div>
          <select
            value={config.chamberCc}
            onChange={(e) => onUpdateConfig({ chamberCc: parseFloat(e.target.value) })}
            className="w-full bg-black/70 border border-gray-700 rounded-lg p-2 text-white font-bold text-xs"
          >
            <option value={64.0}>64.0 cc (Ray's Confirmed Baseline - SCR 9.90:1)</option>
            <option value={70.0}>70.0 cc (Large Chamber Aluminum - SCR 9.35:1)</option>
            <option value={76.0}>76.0 cc (Smog Era Cast Iron #882 - SCR 8.85:1)</option>
          </select>
          <p className="text-[10px] text-gray-400 font-sans">
            Ray's confirmed 64cc chamber achieves 9.90:1 static compression with 5cc flat top pistons.
          </p>
        </div>

        {/* Valve Springs Specification */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-1.5">
          <span className="text-gray-300 font-bold block">VALVE SPRING LOAD &amp; HEIGHT:</span>
          <div className="p-2 bg-black/50 rounded border border-gray-800 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-400">Installed Seat Pressure:</span>
              <span className="text-white font-bold">130 lbs @ 1.800"</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Open Pressure (@ .550"):</span>
              <span className="text-amber-400 font-bold">340 lbs @ 1.250"</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Coil Bind Clearance:</span>
              <span className="text-emerald-400 font-bold">0.060" safe clearance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cylinder Head Airflow Bench Table (@ 28" H2O Depression) */}
      <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-bold text-white uppercase text-xs flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            LIVE CYLINDER HEAD AIRFLOW BENCH (@ 28&quot; H2O DEPRESSION)
          </h3>
          <span className="text-[11px] font-mono text-cyan-300">
            {config.chamberCc.toFixed(1)} cc Chamber · {config.intakePortCc ?? 185} cc Int ({(config.intakeValveIn ?? 2.02).toFixed(2)}&quot;) / {config.exhaustPortCc ?? 68} cc {(config.exhaustPortShape || 'd_port').replace('_', '-').toUpperCase()} ({(config.exhaustValveIn ?? 1.60).toFixed(2)}&quot;)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/60 text-gray-400 border-b border-gray-800">
              <tr>
                <th className="p-2">PORT</th>
                {specs.dynamicHeadFlowBench.map((p) => (
                  <th key={p.lift} className="p-2 text-center font-mono">
                    .{Math.round(p.lift * 1000)}"
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td className="p-2 font-bold text-cyan-400">Intake Port (CFM)</td>
                {specs.dynamicHeadFlowBench.map((p) => (
                  <td key={p.lift} className="p-2 text-center text-white font-mono">
                    {p.intakeCfm} CFM
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 font-bold text-amber-400">Exhaust Port (CFM)</td>
                {specs.dynamicHeadFlowBench.map((p) => (
                  <td key={p.lift} className="p-2 text-center text-white font-mono">
                    {p.exhaustCfm} CFM
                  </td>
                ))}
              </tr>
              <tr className="bg-black/30">
                <td className="p-2 font-bold text-gray-400">E/I Flow Ratio</td>
                {specs.dynamicHeadFlowBench.map((p) => (
                  <td key={p.lift} className="p-2 text-center text-emerald-400 font-mono">
                    {Math.round((p.exhaustCfm / Math.max(1, p.intakeCfm)) * 100)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
