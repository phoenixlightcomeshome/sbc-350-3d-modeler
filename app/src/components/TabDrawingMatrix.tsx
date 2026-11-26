/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { CoordinatedSpecs, EngineConfig, TabId } from '../types/engine';
import { ENGINE_FAMILIES } from '../data/engineFamilies';
import {
  getManufacturingMatrix,
  MATRIX_PROCESS_CATEGORIES,
  ManufacturingMatrixEntry,
  ManufacturingProcessCategory,
  MatrixComponentKey
} from '../data/manufacturingMatrix';
import {
  Component3DTechRenderer,
  ComponentProjectionMode,
  ComponentRenderMode,
  ComponentViewportLayout
} from './CADViewer/Component3DTechRenderer';
import { exportPartProfileToDXF } from '../utils/cadExporters';
import { SpecialModControlsStrip } from './SpecialModControlsStrip';
import {
  Box,
  CheckCircle2,
  Compass,
  FileCode2,
  Layers,
  Search,
  ShieldCheck,
  Wrench
} from 'lucide-react';

interface TabDrawingMatrixProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  selectedPartKey: MatrixComponentKey;
  onSelectPartKey: (key: MatrixComponentKey) => void;
  onJumpToTab: (tab: TabId) => void;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
}

export const TabDrawingMatrix: React.FC<TabDrawingMatrixProps> = ({
  config,
  specs,
  selectedPartKey,
  onSelectPartKey,
  onJumpToTab,
  onUpdateConfig
}) => {
  const [processFilter, setProcessFilter] = useState<ManufacturingProcessCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [renderMode, setRenderMode] = useState<ComponentRenderMode>('iso_paper');
  const [projection, setProjection] = useState<ComponentProjectionMode>('perspective');
  const [viewportLayout, setViewportLayout] = useState<ComponentViewportLayout>('single');

  const activeFamily = config.engineFamilyId
    ? ENGINE_FAMILIES[config.engineFamilyId]
    : ENGINE_FAMILIES.gm_sbc_350;

  const matrixEntries = useMemo(
    () => getManufacturingMatrix(config, specs, activeFamily),
    [config, specs, activeFamily]
  );

  const activeEntry: ManufacturingMatrixEntry = useMemo(
    () => matrixEntries.find((e) => e.id === selectedPartKey) || matrixEntries[0],
    [matrixEntries, selectedPartKey]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return matrixEntries.filter((entry) => {
      if (processFilter !== 'ALL' && entry.processCategory !== processFilter) return false;
      if (!q) return true;
      return (
        entry.partName.toLowerCase().includes(q) ||
        entry.drawingNumber.toLowerCase().includes(q) ||
        entry.materialStandard.toLowerCase().includes(q) ||
        entry.primaryProcess.toLowerCase().includes(q) ||
        entry.ndtMethods.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [matrixEntries, processFilter, searchQuery]);

  const handleQuickDxf = (entry: ManufacturingMatrixEntry) => {
    exportPartProfileToDXF({
      drawingNumber: entry.drawingNumber,
      title: entry.partName,
      partKey: entry.id,
      bore: config.bore,
      stroke: config.stroke,
      rodLength: config.rodLength,
      deckHeight: config.deckHeight,
      chamberCc: config.chamberCc,
      filename: `${entry.drawingNumber}-${entry.id}.dxf`
    });
  };

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-5 space-y-5 text-xs text-slate-200">
      {/* Header & Live Aerospace Tolerance Context Strip */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span>AS9100 REV D / ASME Y14.5-2018</span>
            <span>·</span>
            <span className="text-orange-400 font-semibold">
              {activeFamily?.shortName || `${specs.displacementCi} CID Powerplant`}
            </span>
            <span>·</span>
            <span>{matrixEntries.length} Individual CAD Subassemblies</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Technical Drawing Applications Matrix &amp; Individual 3D CAD Studio
          </h1>
          <p className="text-xs text-slate-400 max-w-3xl">
            Isolate any engine component in Perspective, Orthographic, or simultaneous 4-Viewport Quad projection with live X/Y/Z cross-section slicing, 3D GD&amp;T datum planes, CAM process routing, and native .STL / .DXF / .PNG exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onJumpToTab('block3d')}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-[#12161c] hover:border-orange-500/60 text-slate-200 hover:text-orange-300 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <Box className="w-3.5 h-3.5 text-orange-400" />
            <span>Full 3D Engine Rig</span>
          </button>
          <button
            type="button"
            onClick={() => onJumpToTab('drawings')}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-[#12161c] hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>2D Master Blueprints</span>
          </button>
        </div>
      </div>

      {/* Live Engine Parametric Stackup Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-[#12161c] border border-slate-800 rounded-lg px-3 py-2">
          <div className="text-[11px] text-slate-400">Displacement</div>
          <div className="font-mono text-sm font-bold text-white tabular-nums mt-0.5">
            {specs.displacementCi} CID ({specs.displacementL} L)
          </div>
        </div>
        <div className="bg-[#12161c] border border-slate-800 rounded-lg px-3 py-2">
          <div className="text-[11px] text-slate-400">Bore × Stroke</div>
          <div className="font-mono text-sm font-bold text-cyan-300 tabular-nums mt-0.5">
            {config.bore.toFixed(3)}&quot; × {config.stroke.toFixed(3)}&quot;
          </div>
        </div>
        <div className="bg-[#12161c] border border-slate-800 rounded-lg px-3 py-2">
          <div className="text-[11px] text-slate-400">Rod / Stroke Ratio</div>
          <div className="font-mono text-sm font-bold text-slate-100 tabular-nums mt-0.5">
            {specs.rodStrokeRatio}:1 ({config.rodLength.toFixed(3)}&quot;)
          </div>
        </div>
        <div className="bg-[#12161c] border border-slate-800 rounded-lg px-3 py-2">
          <div className="text-[11px] text-slate-400">Quench Stack</div>
          <div className="font-mono text-sm font-bold text-emerald-400 tabular-nums mt-0.5">
            {specs.quenchDistance}&quot; ({config.deckHeight.toFixed(3)}&quot; Deck)
          </div>
        </div>
        <div className="bg-[#12161c] border border-slate-800 rounded-lg px-3 py-2">
          <div className="text-[11px] text-slate-400">Static / Dynamic CR</div>
          <div className="font-mono text-sm font-bold text-amber-400 tabular-nums mt-0.5">
            {specs.staticCR}:1 / {specs.dynamicCR}:1
          </div>
        </div>
        <div className="bg-[#12161c] border border-slate-800 rounded-lg px-3 py-2">
          <div className="text-[11px] text-slate-400">Rated Output</div>
          <div className="font-mono text-sm font-bold text-orange-400 tabular-nums mt-0.5">
            {specs.peakHp} HP / {specs.peakTq} TQ
          </div>
        </div>
      </div>

      {/* Live Carburetor, Air Port & Exhaust Port Tuning Strip */}
      <SpecialModControlsStrip
        config={config}
        specs={specs}
        onUpdateConfig={onUpdateConfig}
        variant="compact"
      />

      {/* Individual Part Quick Selector Rail */}
      <div className="bg-[#12161c] border border-slate-800 rounded-xl p-2 flex flex-wrap items-center gap-1.5">
        <span className="px-2 text-[11px] font-semibold text-slate-400">Active 3D Part:</span>
        {matrixEntries.map((item) => {
          const active = item.id === activeEntry.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPartKey(item.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                active
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'bg-[#0d1014] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
            >
              {item.partName.split('(')[0].trim()}
            </button>
          );
        })}
      </div>

      {/* Split Individual 3D Tech Renderer + Aerospace Process & GD&T Spec Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-7">
          <Component3DTechRenderer
            partKey={activeEntry.id}
            entry={activeEntry}
            config={config}
            specs={specs}
            renderMode={renderMode}
            onChangeRenderMode={setRenderMode}
            projection={projection}
            onChangeProjection={setProjection}
            viewportLayout={viewportLayout}
            onChangeViewportLayout={setViewportLayout}
          />
        </div>

        {/* Right Side: Aerospace Manufacturing Route & ASME Y14.5 GD&T Panel */}
        <div className="xl:col-span-5 bg-[#12161c] border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="border-b border-slate-800 pb-3 space-y-1">
            <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
              <span className="text-orange-400 font-bold">{activeEntry.drawingNumber}</span>
              <span className="text-slate-400">
                {activeEntry.revision} · {activeEntry.cycleTimeEst}
              </span>
            </div>
            <h2 className="text-base font-bold text-white leading-snug">
              {activeEntry.partName}
            </h2>
            <p className="text-[11px] text-cyan-300 font-medium">
              {activeEntry.aerospaceGradeEquiv}
            </p>
          </div>

          {/* Material, Surface & Hardness Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-2.5 space-y-0.5">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                Alloy &amp; AMS/SAE Standard
              </div>
              <div className="text-xs font-semibold text-white">{activeEntry.materialStandard}</div>
              <div className="text-[11px] text-slate-400">{activeEntry.materialSpec}</div>
            </div>
            <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-2.5 space-y-0.5">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                Surface Finish &amp; Hardness
              </div>
              <div className="text-xs font-mono font-semibold text-emerald-300">
                {activeEntry.surfaceFinishRa}
              </div>
              <div className="text-[11px] text-slate-400">{activeEntry.hardnessSpec}</div>
            </div>
          </div>

          {/* Datum Reference Frame & Tolerance Stack */}
          <div className="bg-[#0d1014] border border-slate-800 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300">
              <Layers className="w-3.5 h-3.5" />
              <span>Datum Reference Frame (ASME Y14.5)</span>
            </div>
            <p className="text-[11px] text-slate-200 font-mono leading-relaxed">
              {activeEntry.datumScheme}
            </p>
            <p className="text-[11px] text-amber-300/90 pt-1 border-t border-slate-800/80">
              {activeEntry.toleranceStackSummary}
            </p>
          </div>

          {/* Key Parametric Dimensions */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
              Parametric Blueprint Dimensions (Live Build)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {activeEntry.keyDimensions.map((dim) => (
                <div
                  key={dim.label}
                  className="bg-[#0d1014] border border-slate-800 rounded-lg px-2.5 py-2"
                >
                  <div className="text-[10px] text-slate-400 truncate">{dim.label}</div>
                  <div className="font-mono text-xs font-bold text-white tabular-nums mt-0.5">
                    {dim.nominal}
                  </div>
                  <div className="font-mono text-[10px] text-cyan-400 tabular-nums">
                    {dim.toleranceBand}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ASME Y14.5 GD&T Feature Control Frame Table */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ASME Y14.5 Feature Control Frames</span>
            </div>
            <div className="overflow-x-auto border border-slate-800 rounded-lg bg-[#0d1014]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                    <th className="py-1.5 px-2">GD&amp;T</th>
                    <th className="py-1.5 px-2">Characteristic</th>
                    <th className="py-1.5 px-2">Tol / Datum</th>
                    <th className="py-1.5 px-2">Metrology Gate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {activeEntry.gdtCallouts.map((g, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-1.5 px-2 font-mono font-bold text-amber-300 text-sm">
                        {g.symbol}
                      </td>
                      <td className="py-1.5 px-2 text-slate-200 font-medium">{g.characteristic}</td>
                      <td className="py-1.5 px-2 font-mono text-cyan-300 tabular-nums whitespace-nowrap">
                        {g.tolerance} · {g.datumRef}
                      </td>
                      <td className="py-1.5 px-2 text-slate-400">{g.metrologyTool}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manufacturing Sequence, NDT & CAM Notes */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-300">
              <Wrench className="w-3.5 h-3.5" />
              <span>CAM Routing &amp; NDT Quality Gates</span>
            </div>
            <div className="text-[11px] text-white font-medium">{activeEntry.primaryProcess}</div>
            <ul className="space-y-1 text-[11px] text-slate-300">
              {activeEntry.secondaryProcesses.map((step, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <div className="text-[11px] text-slate-400 bg-[#0d1014] border border-slate-800 rounded-lg px-2.5 py-2">
              <span className="text-slate-200 font-semibold">NDT Gates: </span>
              {activeEntry.ndtMethods.join(' · ')}
            </div>
            <div className="text-[11px] text-slate-300 bg-[#0d1014] border border-slate-800 rounded-lg px-2.5 py-2">
              <span className="text-amber-300 font-semibold">Shop Floor Note: </span>
              {activeEntry.camToolingNotes}
            </div>
          </div>
        </div>
      </div>

      {/* Technical Drawing Applications Matrix Table */}
      <div className="bg-[#12161c] border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">
              Complete Manufacturing &amp; Technical Drawing Applications Matrix
            </h3>
            <p className="text-[11px] text-slate-400">
              Filter by aerospace process discipline or search alloys, tolerances, and NDT protocols. Click any row to render its isolated 3D CAD geometry above.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search part, AMS alloy, NDT..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#0d1014] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-[#0d1014] border border-slate-800 p-1 rounded-lg">
              {MATRIX_PROCESS_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setProcessFilter(cat)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                    processFilter === cat
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg bg-[#0d1014]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">DWG #</th>
                <th className="py-2.5 px-3">Subassembly / Component</th>
                <th className="py-2.5 px-3">Process Discipline</th>
                <th className="py-2.5 px-3">Material Standard</th>
                <th className="py-2.5 px-3">Primary Manufacturing Method</th>
                <th className="py-2.5 px-3">Finish Ra &amp; Primary GD&amp;T</th>
                <th className="py-2.5 px-3 text-right">CAD Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRows.map((row) => {
                const isSelected = row.id === activeEntry.id;
                const leadGdt = row.gdtCallouts[0];
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectPartKey(row.id)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-orange-600/10' : 'hover:bg-slate-800/35'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-orange-400 whitespace-nowrap">
                      {row.drawingNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white">{row.partName}</div>
                      <div className="text-[11px] text-slate-400">{row.aerospaceGradeEquiv}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-cyan-300 whitespace-nowrap">
                      {row.processCategory}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{row.materialStandard}</td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs">{row.primaryProcess}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <div className="text-emerald-300">{row.surfaceFinishRa.split('|')[0]}</div>
                      {leadGdt && (
                        <div className="text-amber-300 tabular-nums">
                          {leadGdt.symbol} {leadGdt.tolerance} ({leadGdt.datumRef})
                        </div>
                      )}
                    </td>
                    <td
                      className="py-2.5 px-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectPartKey(row.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                            isSelected
                              ? 'bg-orange-600 text-white font-semibold'
                              : 'bg-[#12161c] border border-slate-700 text-slate-200 hover:border-orange-500/60'
                          }`}
                        >
                          {isSelected ? 'Inspecting 3D' : 'Render 3D'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickDxf(row)}
                          className="px-2 py-1 rounded bg-[#12161c] border border-slate-700 hover:border-cyan-500/60 text-cyan-300 text-[11px] font-mono inline-flex items-center gap-1 transition"
                          title="Export AutoCAD R12 DXF"
                        >
                          <FileCode2 className="w-3 h-3" />
                          <span>DXF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
