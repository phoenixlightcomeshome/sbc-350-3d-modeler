import { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  Gauge,
  Layers,
  Monitor,
  Palette,
  Play,
  RotateCcw,
  Sliders,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AEROSPACE_MATERIALS, ASSEMBLY_PROFILES } from '../data/materials';
import { CAM_STRATEGIES, computeCamMachiningData } from '../three/cadCamExporter';
import { DynoTune } from '../three/engineKinetics';
import { DynoPanel } from './DynoPanel';
import { EngineTelemetry } from './Viewport3D';
import {
  ActionSequenceId,
  AssemblyId,
  CadEnvelopeMm,
  CameraPresetId,
  CamSimulationConfig,
  CamStrategyId,
  DisplayPrefs,
  DisplayUnits,
  EnvironmentId,
  MaterialId,
  ParametricConfig,
  RenderOverlayMode,
  RenderQuality,
  SbcBlockLiveConfig,
  SbcHeadVariant,
  SbcInductionStyle,
  SubsystemKey,
  SubsystemMaterials,
} from '../types/aerospace';

export type DockTab =
  | 'assembly'
  | 'parametric'
  | 'materials'
  | 'actions'
  | 'cam'
  | 'dyno'
  | 'display';

interface BottomControlDockProps {
  assemblyId: AssemblyId;
  onChangeAssembly: (id: AssemblyId) => void;
  params: ParametricConfig;
  onChangeParams: (next: Partial<ParametricConfig>) => void;
  onResetParams: () => void;
  materials: SubsystemMaterials;
  onChangeMaterial: (subsystem: SubsystemKey, materialId: MaterialId) => void;
  environment: EnvironmentId;
  onChangeEnvironment: (env: EnvironmentId) => void;
  cameraPreset: CameraPresetId;
  onSelectCameraPreset: (preset: CameraPresetId) => void;
  actionSequence: ActionSequenceId;
  onChangeActionSequence: (seq: ActionSequenceId) => void;
  overlayMode: RenderOverlayMode;
  onChangeOverlayMode: (mode: RenderOverlayMode) => void;
  bloomIntensity: number;
  onChangeBloom: (val: number) => void;
  audioEnabled: boolean;
  audioVolume: number;
  audioLabel: string;
  onToggleAudio: () => void;
  onChangeAudioVolume: (val: number) => void;
  camConfig: CamSimulationConfig;
  onChangeCamConfig: (next: Partial<CamSimulationConfig>) => void;
  envelopeMm: CadEnvelopeMm;
  onExportStl: () => void;
  onExportObj: () => void;
  onExportGCode: (gcode: string) => void;
  requestedTab?: { tab: DockTab; nonce: number };
  collapsed: boolean;
  onToggleCollapse: () => void;
  dyno: {
    isV8: boolean;
    onSelectV8: () => void;
    engineRunning: boolean;
    onToggleEngine: () => void;
    throttlePct: number;
    onChangeThrottle: (pct: number) => void;
    tune: DynoTune;
    onChangeTune: (tune: DynoTune) => void;
    telemetry: EngineTelemetry | null;
  };
  display: {
    prefs: DisplayPrefs;
    onChangePrefs: (next: Partial<DisplayPrefs>) => void;
    onCapture4K: () => void;
  };
  sbcConfig?: SbcBlockLiveConfig;
  onChangeSbcConfig?: (patch: Partial<SbcBlockLiveConfig>) => void;
}

const SUBSYSTEM_LABELS: Record<SubsystemKey, string> = {
  airframe: 'Airframe Hull',
  wings: 'Wings & Blades',
  propulsion: 'Propulsion',
  internal: 'Internal Frame',
};

export function BottomControlDock({
  assemblyId,
  onChangeAssembly,
  params,
  onChangeParams,
  onResetParams,
  materials,
  onChangeMaterial,
  environment,
  onChangeEnvironment,
  cameraPreset,
  onSelectCameraPreset,
  actionSequence,
  onChangeActionSequence,
  overlayMode,
  onChangeOverlayMode,
  bloomIntensity,
  onChangeBloom,
  audioEnabled,
  audioVolume,
  audioLabel,
  onToggleAudio,
  onChangeAudioVolume,
  camConfig,
  onChangeCamConfig,
  envelopeMm,
  onExportStl,
  onExportObj,
  onExportGCode,
  requestedTab,
  collapsed,
  onToggleCollapse,
  dyno,
  display,
  sbcConfig,
  onChangeSbcConfig,
}: BottomControlDockProps) {
  const [activeTab, setActiveTab] = useState<DockTab>('assembly');
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemKey>('airframe');

  useEffect(() => {
    if (requestedTab && requestedTab.nonce > 0) {
      setActiveTab(requestedTab.tab);
    }
  }, [requestedTab]);

  const profile = ASSEMBLY_PROFILES[assemblyId];
  const activeMaterial = AEROSPACE_MATERIALS[materials[selectedSubsystem]];
  const camTelemetry = useMemo(
    () =>
      computeCamMachiningData(
        assemblyId,
        materials,
        camConfig.strategy,
        camConfig.feedOverridePct,
        envelopeMm
      ),
    [assemblyId, materials, camConfig.strategy, camConfig.feedOverridePct, envelopeMm]
  );

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-20 w-[min(960px,95vw)]">
      {/* Main Dock Body (No backdrop-filter over WebGL) */}
      <div className="bg-[#0e141c] border border-slate-700/80 rounded-lg shadow-2xl overflow-hidden">
        {/* Dock Tab Bar — always visible; panels drop down from it and retract up */}
        <div
          className={`flex items-center justify-between gap-4 px-4 py-2 bg-[#121923] ${
            collapsed ? '' : 'border-b border-slate-800'
          }`}
        >
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'assembly', label: 'Assembly & Section', Icon: Layers },
                { id: 'parametric', label: 'Parametric CAD', Icon: Sliders },
                { id: 'materials', label: 'Materials & Polymers', Icon: Palette },
                { id: 'actions', label: 'Live Action Shots', Icon: Camera },
                { id: 'cam', label: 'CAM & Export', Icon: Cpu },
                { id: 'dyno', label: 'Live Dyno', Icon: Gauge },
                { id: 'display', label: 'Display & 4K', Icon: Monitor },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    if (collapsed) onToggleCollapse();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors whitespace-nowrap cursor-pointer"
              title="Retract panels up / drop them down (H)"
            >
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              <span>{collapsed ? 'Show Panels (H)' : 'Retract (H)'}</span>
            </button>
            <button
              type="button"
              onClick={onResetParams}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Reset CAD Parameters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Tab Contents — drop down from the tab strip, retract up out of view */}
        <div
          className={`transition-all duration-200 ease-out overflow-hidden ${
            collapsed ? 'max-h-0 opacity-0 -translate-y-2' : 'max-h-[62vh] opacity-100 translate-y-0'
          }`}
        >
          <div className="p-4 max-h-[62vh] overflow-y-auto">
          {activeTab === 'assembly' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Craft & CAD Assembly Selector */}
              <div className="md:col-span-5 space-y-1.5">
                <div className="text-xs font-medium text-slate-400">
                  Aerospace &amp; Automotive CAD Assembly
                </div>
                <select
                  value={assemblyId}
                  onChange={(e) => onChangeAssembly(e.target.value as AssemblyId)}
                  className="w-full px-3 py-2 text-xs font-medium rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  <optgroup label="Aerospace Craft & Propulsion">
                    <option value="sbc350">SBC-350 Supersonic Business Craft</option>
                    <option value="hx900">HX-900 Geared Axial Turbofan</option>
                    <option value="ares4">Ares-IV Orbital Crew Vehicle</option>
                  </optgroup>
                  <optgroup label="Automotive CAD/CAM Assemblies">
                    <option value="custom_build">Custom Engineered Vehicle Assembly</option>
                    <option value="sbc350_v8">SBC-350 5.7L Billet V8 Powertrain</option>
                    <option value="transmission_t56">Tremec T-56 / 8HP Billet Gearbox</option>
                    <option value="ev_axial_drive">900V Dual Axial-Flux EV Drive Unit</option>
                    <option value="monoblock_brake">6-Piston Monoblock &amp; Carbon-Ceramic Brake</option>
                    <option value="active_aero_chassis">Active Carbon-PEEK Wing &amp; Rear Subframe</option>
                  </optgroup>
                </select>
              </div>

              {/* Render Mode */}
              <div className="md:col-span-4 space-y-1.5">
                <div className="text-xs font-medium text-slate-400">Viewport Shading</div>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'pbr', label: 'PBR' },
                      { id: 'wireframe', label: 'Mesh' },
                      { id: 'xray', label: 'X-Ray' },
                      { id: 'thermal', label: 'Thermal' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeOverlayMode(m.id)}
                      className={`px-2 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                        overlayMode === m.id
                          ? 'bg-slate-800 border-amber-500 text-amber-300'
                          : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exploded & Section Cut Sliders */}
              <div className="md:col-span-3 space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Exploded View</span>
                    <span className="font-mono text-amber-400">{Math.round(params.exploded * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={params.exploded}
                    onChange={(e) => onChangeParams({ exploded: parseFloat(e.target.value) })}
                    className="w-full cad-slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Section Plane X</span>
                    <span className="font-mono text-amber-400">
                      {params.sectionCutX <= -0.98
                        ? 'Off'
                        : profile.domain === 'automotive'
                        ? `${Math.round(params.sectionCutX * (params.fuselageLengthM * 500))} mm`
                        : `${(params.sectionCutX * 5.8).toFixed(1)} m`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={0.95}
                    step={0.01}
                    value={params.sectionCutX}
                    onChange={(e) => onChangeParams({ sectionCutX: parseFloat(e.target.value) })}
                    className="w-full cad-slider"
                  />
                </div>
              </div>

              {(assemblyId === 'sbc350_v8' || assemblyId === 'custom_build') &&
                sbcConfig &&
                onChangeSbcConfig && (
                  <div className="md:col-span-12 pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                        Head Variant
                      </span>
                      <div className="grid grid-cols-2 gap-1 flex-1 max-w-xs">
                        {(
                          [
                            { id: 'cammed_ohv', label: 'Cammed OHV (Default)' },
                            { id: 'camless_billet', label: 'Camless Billet (Variant)' },
                          ] as { id: SbcHeadVariant; label: string }[]
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onChangeSbcConfig({ headVariant: opt.id })}
                            className={`px-2 py-1.5 text-[11px] font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                              sbcConfig.headVariant === opt.id
                                ? 'bg-slate-800 border-amber-500 text-amber-300'
                                : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                        Induction Dress
                      </span>
                      <div className="grid grid-cols-2 gap-1 flex-1 max-w-xs">
                        {(
                          [
                            { id: 'blower_671', label: '6-71 Blower (Concept)' },
                            { id: 'cross_ram', label: 'Cross-Ram Carbon' },
                          ] as { id: SbcInductionStyle; label: string }[]
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onChangeSbcConfig({ inductionStyle: opt.id })}
                            className={`px-2 py-1.5 text-[11px] font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                              sbcConfig.inductionStyle === opt.id
                                ? 'bg-slate-800 border-amber-500 text-amber-300'
                                : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}

          {activeTab === 'parametric' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 truncate">{profile.bounds.wingspanLabel}</span>
                  <span className="font-mono text-slate-100">{params.wingspanM.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={profile.bounds.wingspanMin}
                  max={profile.bounds.wingspanMax}
                  step={0.1}
                  value={params.wingspanM}
                  onChange={(e) => onChangeParams({ wingspanM: parseFloat(e.target.value) })}
                  className="w-full cad-slider"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 truncate">{profile.bounds.sweepLabel}</span>
                  <span className="font-mono text-slate-100">{params.sweepDeg.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min={profile.bounds.sweepMin}
                  max={profile.bounds.sweepMax}
                  step={1}
                  value={params.sweepDeg}
                  onChange={(e) => onChangeParams({ sweepDeg: parseFloat(e.target.value) })}
                  className="w-full cad-slider"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 truncate">{profile.bounds.lengthLabel}</span>
                  <span className="font-mono text-slate-100">{params.fuselageLengthM.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={profile.bounds.lengthMin}
                  max={profile.bounds.lengthMax}
                  step={0.2}
                  value={params.fuselageLengthM}
                  onChange={(e) => onChangeParams({ fuselageLengthM: parseFloat(e.target.value) })}
                  className="w-full cad-slider"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 truncate">Propulsion Scale</span>
                  <span className="font-mono text-slate-100">{params.nacelleScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.35}
                  step={0.02}
                  value={params.nacelleScale}
                  onChange={(e) => onChangeParams({ nacelleScale: parseFloat(e.target.value) })}
                  className="w-full cad-slider"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 truncate">Skin Gauge (mm)</span>
                  <span className="font-mono text-slate-100">{params.skinGaugeMm.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={1.4}
                  max={4.8}
                  step={0.1}
                  value={params.skinGaugeMm}
                  onChange={(e) => onChangeParams({ skinGaugeMm: parseFloat(e.target.value) })}
                  className="w-full cad-slider"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 truncate">Ribs / Stages</span>
                  <span className="font-mono text-slate-100">{params.ribDensity}</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={18}
                  step={1}
                  value={params.ribDensity}
                  onChange={(e) => onChangeParams({ ribDensity: parseInt(e.target.value, 10) })}
                  className="w-full cad-slider"
                />
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {(['airframe', 'wings', 'propulsion', 'internal'] as SubsystemKey[]).map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSubsystem(sub)}
                      className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                        selectedSubsystem === sub
                          ? 'bg-slate-800 border-amber-500 text-amber-300'
                          : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {SUBSYSTEM_LABELS[sub]}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-slate-400 font-mono truncate max-w-xl">
                  {activeMaterial.designation} · {activeMaterial.densityGCm3} g/cm³ · {activeMaterial.yieldStrengthMPa} MPa · {activeMaterial.sourceOrigin}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 max-h-36 overflow-y-auto pr-1">
                {(Object.keys(AEROSPACE_MATERIALS) as MaterialId[]).map((matId) => {
                  const mat = AEROSPACE_MATERIALS[matId];
                  const isAssigned = materials[selectedSubsystem] === matId;
                  return (
                    <button
                      key={matId}
                      type="button"
                      title={`${mat.name} — ${mat.sourceOrigin}`}
                      onClick={() => onChangeMaterial(selectedSubsystem, matId)}
                      className={`flex items-center gap-2.5 p-2 rounded border text-left transition-colors cursor-pointer ${
                        isAssigned
                          ? 'bg-slate-800 border-amber-500 text-white'
                          : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-sm shrink-0 border border-white/20"
                        style={{ backgroundColor: mat.colorHex }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{mat.name}</div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {mat.recyclabilityPct}% Recyc · {mat.maxServiceTempC}°C
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4 space-y-1.5">
                <div className="text-xs font-medium text-slate-400">Live Environment Rig</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'studio', label: 'Hangar Studio' },
                      { id: 'stratosphere', label: 'Stratosphere' },
                      { id: 'wind_tunnel', label: 'CFD Tunnel' },
                      { id: 'night_apron', label: 'Night Apron' },
                    ] as const
                  ).map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => onChangeEnvironment(env.id)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                        environment === env.id
                          ? 'bg-slate-800 border-amber-500 text-amber-300'
                          : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-5 space-y-1.5">
                <div className="text-xs font-medium text-slate-400">Camera Framing & Action Sequence</div>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { id: 'iso', label: '3/4 Iso' },
                      { id: 'hero_nose', label: 'Nose Hero' },
                      { id: 'wingtip', label: 'Wingtip' },
                      { id: 'intake', label: 'Engine' },
                      { id: 'top', label: 'Planform' },
                      { id: 'side', label: 'Profile' },
                    ] as const
                  ).map((cam) => (
                    <button
                      key={cam.id}
                      type="button"
                      onClick={() => onSelectCameraPreset(cam.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                        cameraPreset === cam.id && actionSequence === 'none'
                          ? 'bg-slate-800 border-amber-500 text-amber-300'
                          : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {cam.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {(
                    [
                      { id: 'none', label: 'Manual Orbit' },
                      { id: 'turntable', label: '360 Turntable' },
                      { id: 'climb', label: 'Mach Climb' },
                      { id: 'exploded_sweep', label: 'Exploded Reveal' },
                      { id: 'flyby', label: 'Flyby Pass' },
                    ] as const
                  ).map((seq) => (
                    <button
                      key={seq.id}
                      type="button"
                      onClick={() => onChangeActionSequence(seq.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                        actionSequence === seq.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-[#0b0f14] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {seq.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3 space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Cinematic Bloom</span>
                    <span className="font-mono text-amber-400">{bloomIntensity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.85}
                    step={0.05}
                    value={bloomIntensity}
                    onChange={(e) => onChangeBloom(parseFloat(e.target.value))}
                    className="w-full cad-slider"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <button
                      type="button"
                      onClick={onToggleAudio}
                      className="flex items-center gap-1.5 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                      title="Mute / Unmute Ambient Soundscape (M)"
                    >
                      {audioEnabled ? (
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span className="truncate">{audioEnabled ? audioLabel : 'Soundscape Muted'}</span>
                    </button>
                    <span className="font-mono text-amber-400">
                      {audioEnabled ? `${Math.round(audioVolume * 100)}%` : 'Off'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={audioEnabled ? audioVolume : 0}
                    onChange={(e) => onChangeAudioVolume(parseFloat(e.target.value))}
                    className="w-full cad-slider"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cam' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Toolpath Sim Controls & Strategy */}
              <div className="md:col-span-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeCamConfig({
                        enabled: !camConfig.enabled,
                        showStockEnvelope: !camConfig.enabled ? true : camConfig.showStockEnvelope,
                      })
                    }
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                      camConfig.enabled
                        ? 'bg-amber-500 border-amber-400 text-slate-950'
                        : 'bg-[#0b0f14] border-slate-700 text-slate-200 hover:border-amber-500'
                    }`}
                  >
                    {camConfig.enabled ? (
                      <>
                        <Square className="w-3 h-3" />
                        <span>Stop 5-Axis Sim</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Simulate 5-Axis CAM</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeCamConfig({ showStockEnvelope: !camConfig.showStockEnvelope })
                    }
                    className={`px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                      camConfig.showStockEnvelope
                        ? 'bg-slate-800 border-sky-500 text-sky-300'
                        : 'bg-[#0b0f14] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    G54 Billet Box
                  </button>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">Machining Strategy</div>
                  <select
                    value={camConfig.strategy}
                    onChange={(e) =>
                      onChangeCamConfig({ strategy: e.target.value as CamStrategyId })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-[#0b0f14] border border-slate-700 text-slate-100 focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    {(Object.keys(CAM_STRATEGIES) as CamStrategyId[]).map((sid) => (
                      <option key={sid} value={sid}>
                        {CAM_STRATEGIES[sid].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Feed Override</span>
                    <span className="font-mono text-amber-400">{camConfig.feedOverridePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    step={5}
                    value={camConfig.feedOverridePct}
                    onChange={(e) =>
                      onChangeCamConfig({ feedOverridePct: parseInt(e.target.value, 10) })
                    }
                    className="w-full cad-slider"
                  />
                </div>
              </div>

              {/* Live CAM Feeds, Speeds & Envelope Readout */}
              <div className="md:col-span-5 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#0b0f14] border border-slate-800 rounded p-2.5">
                  <div>
                    <div className="text-[10px] text-slate-500">CAD Envelope (mm)</div>
                    <div className="text-slate-100">
                      {envelopeMm.x} × {envelopeMm.y} × {envelopeMm.z}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Spindle / Feed</div>
                    <div className="text-amber-400">
                      {camTelemetry.spindleRpm.toLocaleString()} RPM · {camTelemetry.feedRateMmMin} mm/m
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Removal / Finish</div>
                    <div className="text-emerald-400">
                      {camTelemetry.mrrCm3Min} cm³/m · Ra {camTelemetry.raUm} µm
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Est. Cycle</div>
                    <div className="text-slate-200">{camTelemetry.estCycleMin} min</div>
                  </div>
                </div>

                <div className="bg-[#080c11] border border-slate-800/90 rounded px-2.5 py-1.5 font-mono text-[10px] text-slate-400 max-h-16 overflow-hidden leading-relaxed">
                  {camTelemetry.previewLines.slice(0, 4).map((ln, idx) => (
                    <div key={idx} className="truncate">
                      {ln}
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct 3D CAD & G-Code Exports */}
              <div className="md:col-span-3 space-y-2">
                <div className="text-xs font-medium text-slate-400">Live CAD/CAM Exports</div>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={onExportStl}
                    className="flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded border border-slate-700 bg-[#0b0f14] text-slate-100 hover:border-amber-500 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <span>Export Binary .STL</span>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onExportObj}
                    className="flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded border border-slate-700 bg-[#0b0f14] text-slate-100 hover:border-amber-500 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <span>Export Wavefront .OBJ</span>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportGCode(camTelemetry.gcodeProgram)}
                    className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 border border-slate-600 text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
                  >
                    <span>Export 5-Axis .NC G-Code</span>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dyno' && (
            <div className="space-y-3">
              <DynoPanel
                isV8={dyno.isV8}
                onSelectV8={dyno.onSelectV8}
                engineRunning={dyno.engineRunning}
                onToggleEngine={dyno.onToggleEngine}
                throttlePct={dyno.throttlePct}
                onChangeThrottle={dyno.onChangeThrottle}
                tune={dyno.tune}
                onChangeTune={dyno.onChangeTune}
                telemetry={dyno.telemetry}
                units={display.prefs.units}
              />
              {dyno.isV8 && sbcConfig && onChangeSbcConfig && (
                <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                      Head Variant
                    </span>
                    <div className="grid grid-cols-2 gap-1 flex-1 max-w-xs">
                      {(
                        [
                          { id: 'cammed_ohv', label: 'Cammed OHV (Default)' },
                          { id: 'camless_billet', label: 'Camless Billet (Variant)' },
                        ] as { id: SbcHeadVariant; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onChangeSbcConfig({ headVariant: opt.id })}
                          className={`px-2 py-1.5 text-[11px] font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                            sbcConfig.headVariant === opt.id
                              ? 'bg-slate-800 border-amber-500 text-amber-300'
                              : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                      Induction Dress
                    </span>
                    <div className="grid grid-cols-2 gap-1 flex-1 max-w-xs">
                      {(
                        [
                          { id: 'blower_671', label: '6-71 Blower (Concept)' },
                          { id: 'cross_ram', label: 'Cross-Ram Carbon' },
                        ] as { id: SbcInductionStyle; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onChangeSbcConfig({ inductionStyle: opt.id })}
                          className={`px-2 py-1.5 text-[11px] font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                            sbcConfig.inductionStyle === opt.id
                              ? 'bg-slate-800 border-amber-500 text-amber-300'
                              : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'display' && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-white mb-2">
                  Live Readouts — choose what the HUD shows
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'showRpm', label: 'RPM' },
                      { id: 'showHpTq', label: 'Power & Torque' },
                      { id: 'showCrank', label: 'Crank Angle' },
                      { id: 'showFiring', label: 'Firing Cylinder' },
                      { id: 'showPiston', label: 'Piston Velocity' },
                      { id: 'showValve', label: 'Valve Lift' },
                      { id: 'showDeck', label: 'Deck Depth' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        display.onChangePrefs({ [f.id]: !display.prefs[f.id] } as Partial<DisplayPrefs>)
                      }
                      className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                        display.prefs[f.id]
                          ? 'bg-slate-800 border-amber-500 text-amber-300'
                          : 'bg-[#0b0f14] border-slate-800 text-slate-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-white mb-2">Units</div>
                  <div className="grid grid-cols-2 gap-1">
                    {(
                      [
                        { id: 'imperial', label: 'Imperial (HP · lb-ft · in)' },
                        { id: 'metric', label: 'Metric (kW · Nm · mm)' },
                      ] as const
                    ).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() =>
                          display.onChangePrefs({ units: u.id as DisplayUnits })
                        }
                        className={`px-2 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                          display.prefs.units === u.id
                            ? 'bg-slate-800 border-amber-500 text-amber-300'
                            : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-white mb-2">Render Quality</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 1, label: 'Standard' },
                        { id: 1.5, label: 'High' },
                        { id: 2, label: 'Ultra' },
                      ] as const
                    ).map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() =>
                          display.onChangePrefs({ quality: q.id as RenderQuality })
                        }
                        className={`px-2 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                          display.prefs.quality === q.id
                            ? 'bg-slate-800 border-amber-500 text-amber-300'
                            : 'bg-[#0b0f14] border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-white mb-2">4K Still Capture</div>
                <button
                  type="button"
                  onClick={display.onCapture4K}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capture 4K Render (3840 × 2160 PNG)</span>
                </button>
                <p className="text-[11px] leading-relaxed text-slate-500 mt-2">
                  Renders one frame of the live 3D viewport at 3840 × 2160 and downloads
                  it as a PNG. This is a 4K still render — the live viewport itself runs
                  at your screen&apos;s resolution with the quality setting above.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
