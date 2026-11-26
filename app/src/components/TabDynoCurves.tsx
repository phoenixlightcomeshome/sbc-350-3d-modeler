/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CoordinatedSpecs, EngineConfig } from '../types/engine';
import { SpecialModControlsStrip } from './SpecialModControlsStrip';
import { Activity, Play, RotateCcw, Zap, Droplet, Gauge, Flame } from 'lucide-react';

interface TabDynoCurvesProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig?: (newConfig: Partial<EngineConfig>) => void;
}

export const TabDynoCurves: React.FC<TabDynoCurvesProps> = ({ config, specs, onUpdateConfig }) => {
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [pullProgress, setPullProgress] = useState<number>(0);
  const [liveRpm, setLiveRpm] = useState<number>(2000);
  const [liveHp, setLiveHp] = useState<number>(0);
  const [liveTq, setLiveTq] = useState<number>(0);

  // Animated Dyno Pull Simulation
  useEffect(() => {
    let timer: number;
    if (isPulling) {
      setPullProgress(0);
      const start = performance.now();
      const duration = 4000; // 4 second pull

      const updatePull = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1.0);
        setPullProgress(progress);

        // RPM sweeps from 2,000 to 6,400 RPM
        const currRpm = Math.round(2000 + progress * 4400);
        setLiveRpm(currRpm);

        // Interpolate HP and Tq from curve
        const closest = specs.dynoCurve.reduce((prev, curr) =>
          Math.abs(curr.rpm - currRpm) < Math.abs(prev.rpm - currRpm) ? curr : prev
        );
        setLiveHp(closest.hp);
        setLiveTq(closest.tq);

        if (progress < 1.0) {
          timer = requestAnimationFrame(updatePull);
        } else {
          setIsPulling(false);
        }
      };
      timer = requestAnimationFrame(updatePull);
    }
    return () => cancelAnimationFrame(timer);
  }, [isPulling, specs.dynoCurve]);

  // SVG dimensions for dyno curves
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };

  const minRpm = 1500;
  const maxRpm = 6500;
  const maxVal = Math.max(550, specs.peakHp * 1.15, specs.peakTq * 1.15);

  // Peak RPMs read straight off the computed curve — the same rows the table
  // renders — so the cards and markers always agree with the table. The
  // catalog's rated peak (specs.hpPeakRpm) shapes the curve but is not the
  // curve's peak, so it is not used for display here.
  const hpPeakRow = specs.dynoCurve.reduce(
    (best, row) => (row.hp > best.hp ? row : best),
    specs.dynoCurve[0]
  );
  const tqPeakRow = specs.dynoCurve.reduce(
    (best, row) => (row.tq > best.tq ? row : best),
    specs.dynoCurve[0]
  );
  const curveHpPeakRpm = hpPeakRow ? hpPeakRow.rpm : specs.hpPeakRpm;
  const curveTqPeakRpm = tqPeakRow ? tqPeakRow.rpm : specs.tqPeakRpm;

  const getX = (rpm: number) =>
    padding.left + ((rpm - minRpm) / (maxRpm - minRpm)) * (width - padding.left - padding.right);
  const getY = (val: number) =>
    height - padding.bottom - (val / maxVal) * (height - padding.top - padding.bottom);

  // Generate SVG path strings
  const hpPath = specs.dynoCurve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.rpm)} ${getY(pt.hp)}`)
    .join(' ');

  const tqPath = specs.dynoCurve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.rpm)} ${getY(pt.tq)}`)
    .join(' ');

  const x5252 = getX(5252);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 font-mono text-xs text-gray-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-700/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            WATER-BRAKE DYNO ABSORPTION CELL (SAE J1349 CORRECTED)
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-sans">
            MODSIM live power sweep reflecting {specs.displacementCi} CID, {specs.staticCR}:1 SCR, {specs.intakeData.name}, and {specs.camData.name}.
          </p>
        </div>

        {/* Start Dyno Pull Button */}
        <button
          onClick={() => setIsPulling(true)}
          disabled={isPulling}
          className={`px-4 py-2 rounded-xl text-xs font-bold border shadow-xl flex items-center gap-2 transition ${
            isPulling
              ? 'bg-amber-600 border-amber-400 text-white'
              : 'bg-orange-600 border-orange-500 hover:bg-orange-500 text-white shadow-orange-950/50'
          }`}
        >
          <Play className={`w-4 h-4 fill-current ${isPulling ? 'animate-spin' : ''}`} />
          <span>{isPulling ? `RECORDING PULL (${liveRpm} RPM)` : 'TRIGGER DYNO PULL'}</span>
        </button>
      </div>

      {onUpdateConfig && (
        <SpecialModControlsStrip
          config={config}
          specs={specs}
          onUpdateConfig={onUpdateConfig}
          variant="compact"
        />
      )}

      {/* Hero Peak Dyno Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#181e24] p-4 rounded-xl border border-orange-500/40 relative overflow-hidden shadow-lg">
          <div className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">PEAK HORSEPOWER</div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">{specs.peakHp} HP</div>
          <div className="text-[10px] text-gray-400 mt-0.5">@ {curveHpPeakRpm} RPM</div>
        </div>

        <div className="bg-[#181e24] p-4 rounded-xl border border-amber-500/40 relative overflow-hidden shadow-lg">
          <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">PEAK TORQUE</div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">{specs.peakTq} FT-LBS</div>
          <div className="text-[10px] text-gray-400 mt-0.5">@ {curveTqPeakRpm} RPM</div>
        </div>

        <div className="bg-[#181e24] p-4 rounded-xl border border-cyan-500/40 relative overflow-hidden shadow-lg">
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">VOLUMETRIC EFFICIENCY</div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-300 mt-1 font-mono">
            {Math.round(specs.camData.ve * 100)}%
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">At Peak Power Node</div>
        </div>

        <div className="bg-[#181e24] p-4 rounded-xl border border-emerald-500/40 relative overflow-hidden shadow-lg">
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">FUEL MASS CONSUMPTION</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1 font-mono">
            {specs.bsfcLbHr} LB/HR
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">{specs.fuelGph} Gallons / Hr @ WOT</div>
        </div>
      </div>

      {/* Live Pull Tachometer Needle if Pulling */}
      {isPulling && (
        <div className="bg-gradient-to-r from-orange-950/60 via-black to-orange-950/60 p-3 rounded-xl border border-orange-500 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <Gauge className="w-6 h-6 text-orange-400 animate-spin" />
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase block">LIVE WATER BRAKE TACHOMETER:</span>
              <span className="text-2xl font-black text-white font-mono">{liveRpm} RPM</span>
            </div>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <span className="text-[10px] text-orange-400 font-bold block">ABSORBED HP:</span>
              <span className="text-xl font-bold text-white font-mono">{liveHp} HP</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 font-bold block">TORQUE:</span>
              <span className="text-xl font-bold text-white font-mono">{liveTq} FT-LBS</span>
            </div>
          </div>
        </div>
      )}

      {/* Vector Dyno Power & Torque Curves Chart */}
      <div className="bg-[#181e24] p-4 sm:p-5 rounded-2xl border border-gray-800 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-xs font-bold text-white">Horsepower (HP)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="text-xs font-bold text-white">Torque (FT-LBS)</span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400">
            5252 RPM Crossover Point: HP = (Torque × RPM) / 5252
          </span>
        </div>

        {/* SVG Curve Canvas */}
        <div className="relative w-full overflow-hidden">
          <svg className="w-full h-72" viewBox={`0 0 ${width} ${height}`}>
            {/* Background Grid Lines */}
            {[100, 200, 300, 400, 500].map((v) => (
              <g key={v}>
                <line
                  x1={padding.left}
                  y1={getY(v)}
                  x2={width - padding.right}
                  y2={getY(v)}
                  stroke="#262d35"
                  strokeWidth="1"
                />
                <text x={padding.left - 10} y={getY(v) + 3} fill="#64748b" fontSize="10" textAnchor="end">
                  {v}
                </text>
              </g>
            ))}

            {/* RPM Vertical Grid Lines */}
            {[2000, 3000, 4000, 5000, 6000].map((r) => (
              <g key={r}>
                <line
                  x1={getX(r)}
                  y1={padding.top}
                  x2={getX(r)}
                  y2={height - padding.bottom}
                  stroke="#262d35"
                  strokeWidth="1"
                />
                <text x={getX(r)} y={height - padding.bottom + 16} fill="#64748b" fontSize="10" textAnchor="middle">
                  {r}
                </text>
              </g>
            ))}

            {/* 5252 RPM Crossover Dashed Line */}
            <line
              x1={x5252}
              y1={padding.top}
              x2={x5252}
              y2={height - padding.bottom}
              stroke="#00f0ff"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text x={x5252 + 5} y={padding.top + 15} fill="#00f0ff" fontSize="10" fontWeight="bold">
              5252 RPM Crossover (HP = TQ)
            </text>

            {/* Torque Curve */}
            <path d={tqPath} fill="none" stroke="#e5a823" strokeWidth="3.5" strokeLinecap="round" />

            {/* Horsepower Curve */}
            <path d={hpPath} fill="none" stroke="#d83b01" strokeWidth="3.5" strokeLinecap="round" />

            {/* Peak Markers */}
            <circle cx={getX(curveHpPeakRpm)} cy={getY(specs.peakHp)} r="5" fill="#d83b01" stroke="#ffffff" strokeWidth="2" />
            <circle cx={getX(curveTqPeakRpm)} cy={getY(specs.peakTq)} r="5" fill="#e5a823" stroke="#ffffff" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Itemized Dyno Pull Data Table */}
      <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2">
        <h3 className="font-bold text-white uppercase text-xs">RECORDED ABSORPTION TEST CELL LOG (SAE J1349)</h3>
        <div className="overflow-x-auto max-h-60 overflow-y-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-black/60 text-gray-400 sticky top-0 border-b border-gray-800">
              <tr>
                <th className="py-1.5 px-3">ENGINE RPM</th>
                <th className="py-1.5 px-3 text-orange-400">BRAKE HP</th>
                <th className="py-1.5 px-3 text-amber-400">TORQUE (FT-LBS)</th>
                <th className="py-1.5 px-3 text-cyan-400">VE %</th>
                <th className="py-1.5 px-3 text-emerald-400">FUEL FLOW (LB/HR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {specs.dynoCurve.map((row) => (
                <tr key={row.rpm} className="hover:bg-gray-800/50">
                  <td className="py-1.5 px-3 font-bold text-white">{row.rpm} RPM</td>
                  <td className="py-1.5 px-3 text-orange-400 font-bold">{row.hp} HP</td>
                  <td className="py-1.5 px-3 text-amber-400 font-bold">{row.tq} FT-LBS</td>
                  <td className="py-1.5 px-3 text-cyan-300">{Math.round(row.ve * 100)}%</td>
                  <td className="py-1.5 px-3 text-emerald-400">{row.fuelFlowLbsHr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
