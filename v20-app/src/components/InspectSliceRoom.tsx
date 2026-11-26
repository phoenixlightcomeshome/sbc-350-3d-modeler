/**
 * Quantum Aerospace Room 3: 3D Inspect & Slice
 * Section-Cut Inspection, Live SVG Drawing Sheet, and Honest WebGPU/WebGL2 Graphics Probe
 */
import React, { useState, useEffect } from 'react';
import { ParametricPartConfig } from '../engine/cadEngine';
import { renderDrawingSheetSvg } from '../engine/drawingSheet';
import { probeGraphicsCapability, GraphicsProbeResult } from '../engine/webgpuProbe';
import { Eye, FileText, Cpu, Download, AlertTriangle, Layers, Sliders, CheckCircle2 } from 'lucide-react';

interface InspectSliceRoomProps {
  config: ParametricPartConfig;
  displayMetric: boolean;
  slicePercent: number;
  onSliceChange: (percent: number) => void;
  onNavigateToExport: () => void;
}

export const InspectSliceRoom: React.FC<InspectSliceRoomProps> = ({
  config,
  displayMetric,
  slicePercent,
  onSliceChange,
  onNavigateToExport,
}) => {
  const [activeTab, setActiveTab] = useState<'SHEET' | 'GRAPHICS_PROBE'>('SHEET');
  const [graphicsProbe, setGraphicsProbe] = useState<GraphicsProbeResult | null>(null);

  useEffect(() => {
    probeGraphicsCapability().then(setGraphicsProbe);
  }, []);

  const drawingSvgString = renderDrawingSheetSvg(config, displayMetric);

  const downloadSvgSheet = () => {
    const blob = new Blob([drawingSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '_')}_DrawingSheet.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col space-y-5 p-5 text-slate-200">
      {/* Room Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center space-x-2">
            <Eye className="w-5 h-5 text-sky-400" />
            <span>3D INSPECT &amp; DRAWING SHEET</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Orthographic SVG Plan/Section Blueprint, Z-Axis Section Slicing &amp; WebGPU Capability Probe
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('SHEET')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-mono text-xs transition-colors ${
              activeTab === 'SHEET' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Live Blueprint SVG</span>
          </button>
          <button
            onClick={() => setActiveTab('GRAPHICS_PROBE')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-mono text-xs transition-colors ${
              activeTab === 'GRAPHICS_PROBE'
                ? 'bg-sky-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Graphics API Probe</span>
          </button>
        </div>
      </div>

      {activeTab === 'SHEET' ? (
        <div className="flex flex-col space-y-4">
          {/* Drawing Sheet Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-slate-300 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>ASME Y14.5 / ISO 10303-242 ORTHOGRAPHIC DRAWING SHEET</span>
              </span>
              <button
                onClick={downloadSvgSheet}
                className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded text-xs font-mono transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .SVG</span>
              </button>
            </div>

            {/* Live SVG container */}
            <div
              className="w-full bg-slate-950 border border-slate-800 rounded overflow-hidden shadow-inner flex items-center justify-center p-2"
              dangerouslySetInnerHTML={{ __html: drawingSvgString }}
            />
          </div>

          {/* Section Cut slider in room */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-slate-200">Z-AXIS SECTION CUT:</span>
              <span className="text-sky-400 font-bold">{slicePercent}%</span>
            </div>
            <div className="flex-1 mx-6 max-w-md">
              <input
                type="range"
                min="0"
                max="100"
                value={slicePercent}
                onChange={(e) => onSliceChange(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
              />
            </div>
            <div className="text-[11px] text-slate-400">
              Observing core flange thickness &amp; hole depth on pinned 3D viewport
            </div>
          </div>
        </div>
      ) : (
        /* Graphics API Probe View */
        <div className="flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 font-mono text-xs">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>HONEST GRAPHICS API &amp; WEBGPU CAPABILITY PROBE</span>
            </h3>

            {graphicsProbe ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* WebGL2 */}
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">WebGL2 Active Rasterizer</span>
                      <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600/50 rounded text-[9px] font-bold">
                        ACTIVE
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] truncate">
                      Renderer: {graphicsProbe.webgl2RendererInfo}
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      Drives THREE.WebGLRenderer for real-time mesh rasterization
                    </div>
                  </div>

                  {/* WebGPU */}
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">WebGPU Adapter Detection</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          graphicsProbe.webgpuSupported
                            ? 'bg-sky-950 text-sky-400 border border-sky-600/50'
                            : 'bg-amber-950 text-amber-400 border border-amber-600/50'
                        }`}
                      >
                        {graphicsProbe.webgpuSupported ? 'DETECTED' : 'NOT DETECTED'}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] truncate">
                      Adapter: {graphicsProbe.webgpuAdapterName}
                    </div>
                    <div className="text-amber-400 text-[10px]">
                      Compute Status: {graphicsProbe.computePipelineStatus}
                    </div>
                  </div>
                </div>

                {/* Honest Capability Banner */}
                <div className="p-3 bg-slate-950 rounded border border-amber-600/50 flex items-start space-x-2 text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Honest Implementation Notice:</strong> {graphicsProbe.honestNotice}
                  </div>
                </div>

                {/* WGSL Compute Shader Template */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 font-bold block">
                    WGSL @workgroup_size(64) Compute Shader Template (webgpuComputeEngineV19.js):
                  </span>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded text-[11px] text-sky-300 overflow-x-auto leading-relaxed">
                    {graphicsProbe.wgslComputeTemplate}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 py-6 text-center">Probing graphics capabilities...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
