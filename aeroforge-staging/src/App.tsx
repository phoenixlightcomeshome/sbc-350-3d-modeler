import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Volume2, VolumeX, X } from 'lucide-react';
import { ambientAudioEngine, AmbientAudioSnapshot } from './audio/ambientAudioEngine';
import { AutomotiveMatrixView } from './components/AutomotiveMatrixView';
import { AutoMatrixView } from './components/AutoMatrixView';
import { BottomControlDock, DockTab } from './components/BottomControlDock';
import { CustomDesignStudioView } from './components/CustomDesignStudioView';
import { DynoLabView } from './components/DynoLabView';
import { EngineBlockView } from './components/EngineBlockView';
import { EngineeringSpecsView } from './components/EngineeringSpecsView';
import { EngineHud } from './components/EngineHud';
import { FutureDrawingView } from './components/FutureDrawingView';
import { PowertrainView } from './components/PowertrainView';
import { ShotGalleryView } from './components/ShotGalleryView';
import { TechnicalDrawingView } from './components/TechnicalDrawingView';
import { VehicleCatalogView } from './components/VehicleCatalogView';
import { EngineTelemetry, Viewport3D, Viewport3DHandle } from './components/Viewport3D';
import { DynoTune, engineConfigFor, IDLE_RPM, REDLINE_RPM } from './three/engineKinetics';
import {
  AEROSPACE_MATERIALS,
  ASSEMBLY_PROFILES,
  computeAerospaceSpecs,
  DEFAULT_CUSTOM_DESIGN,
} from './data/materials';
import { exportGCodeFile } from './three/cadCamExporter';
import {
  ActionSequenceId,
  AssemblyId,
  CadEnvelopeMm,
  CameraPresetId,
  CamSimulationConfig,
  CamStrategyId,
  CapturedShot,
  CustomDesignConfig,
  DEFAULT_DISPLAY_PREFS,
  DisplayPrefs,
  EnvironmentId,
  InspectedPart,
  MaterialId,
  ParametricConfig,
  RenderOverlayMode,
  SubsystemKey,
  SubsystemMaterials,
  ViewMode,
} from './types/aerospace';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('studio');
  const [assemblyId, setAssemblyId] = useState<AssemblyId>('sbc350');
  const [params, setParams] = useState<ParametricConfig>(
    () => ({ ...ASSEMBLY_PROFILES.sbc350.defaults })
  );
  const [materials, setMaterials] = useState<SubsystemMaterials>(
    () => ({ ...ASSEMBLY_PROFILES.sbc350.defaultMaterials })
  );
  const [environment, setEnvironment] = useState<EnvironmentId>('studio');
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('iso');
  const [cameraPresetNonce, setCameraPresetNonce] = useState(0);
  const [actionSequence, setActionSequence] = useState<ActionSequenceId>('none');
  const [overlayMode, setOverlayMode] = useState<RenderOverlayMode>('pbr');
  const [bloomIntensity, setBloomIntensity] = useState(0.25);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [inspectedPart, setInspectedPart] = useState<InspectedPart | null>(null);
  const [shots, setShots] = useState<CapturedShot[]>([]);
  const [captureBanner, setCaptureBanner] = useState<string | null>(null);
  const [audioSnapshot, setAudioSnapshot] = useState<AmbientAudioSnapshot>(() =>
    ambientAudioEngine.getSnapshot()
  );
  const [camConfig, setCamConfig] = useState<CamSimulationConfig>({
    enabled: false,
    showStockEnvelope: false,
    strategy: 'adaptive_roughing',
    feedOverridePct: 100,
  });
  const [envelopeMm, setEnvelopeMm] = useState<CadEnvelopeMm>({ x: 1850, y: 1120, z: 1240 });
  const [customDesign, setCustomDesign] = useState<CustomDesignConfig>(() => ({
    ...DEFAULT_CUSTOM_DESIGN,
  }));
  const [requestedDockTab, setRequestedDockTab] = useState<{ tab: DockTab; nonce: number }>({
    tab: 'assembly',
    nonce: 0,
  });
  const [engineRunning, setEngineRunning] = useState(false);
  const [throttlePct, setThrottlePct] = useState(0);
  const [dynoTune, setDynoTune] = useState<DynoTune>('carb');
  const [engineTelemetry, setEngineTelemetry] = useState<EngineTelemetry | null>(null);
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPrefs>(DEFAULT_DISPLAY_PREFS);
  const [latestShot, setLatestShot] = useState<string | null>(null);

  const viewportRef = useRef<Viewport3DHandle | null>(null);

  const profile = ASSEMBLY_PROFILES[assemblyId];
  const specs = useMemo(
    () => computeAerospaceSpecs(assemblyId, params, materials),
    [assemblyId, params, materials]
  );

  // Live dyno target RPM: idle + throttle sweep to redline (V8 only)
  const targetRpm = engineRunning
    ? Math.round(IDLE_RPM + (throttlePct / 100) * (REDLINE_RPM - IDLE_RPM))
    : 0;

  // Configured cylinder count: nearest supported V6/V8/V10/V12 to the builder's
  // rib density. The 3D geometry renders perBank = floor(ribDensity / 2), so
  // the nearest supported config always matches what is on screen — except
  // ribDensity below 6, which renders a V4 the configurator does not offer.
  const engineCylCount =
    assemblyId === 'sbc350_v8'
      ? [6, 8, 10, 12].reduce(
          (best, c) =>
            Math.abs(c - params.ribDensity) < Math.abs(best - params.ribDensity) ? c : best,
          8
        )
      : 8;

  // Subscribe to ambient audio engine & unlock Web Audio on first user gesture
  useEffect(() => {
    const unsubscribe = ambientAudioEngine.subscribe(setAudioSnapshot);
    const handleFirstGesture = () => {
      void ambientAudioEngine.unlock();
    };
    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
    window.addEventListener('keydown', handleFirstGesture, { passive: true });
    return () => {
      unsubscribe();
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      ambientAudioEngine.dispose();
    };
  }, []);

  // Push live environment, action, assembly, and CAD state to the soundscape engine
  useEffect(() => {
    ambientAudioEngine.updateContext({
      environment,
      actionSequence,
      assemblyId,
      viewMode,
      params,
    });
  }, [environment, actionSequence, assemblyId, viewMode, params]);

  // Keyboard shortcuts: 'H' to toggle dock, 'M' to mute/unmute ambient audio
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        ambientAudioEngine.toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleChangeAssembly = useCallback((id: AssemblyId) => {
    setAssemblyId(id);
    setParams({ ...ASSEMBLY_PROFILES[id].defaults });
    setMaterials({ ...ASSEMBLY_PROFILES[id].defaultMaterials });
    setInspectedPart(null);
    setEngineRunning(false);
    setEngineTelemetry(null);
    setCameraPreset('iso');
    setCameraPresetNonce((n) => n + 1);
  }, []);

  const handleLaunchIn3DPortal = useCallback(
    (
      nextAssemblyId: AssemblyId,
      nextMaterials?: SubsystemMaterials,
      options?: {
        environment?: EnvironmentId;
        actionSequence?: ActionSequenceId;
        exploded?: number;
        openDrawing?: boolean;
        camSim?: boolean;
        camStrategy?: CamStrategyId;
      }
    ) => {
      setAssemblyId(nextAssemblyId);
      setParams({
        ...ASSEMBLY_PROFILES[nextAssemblyId].defaults,
        exploded: options?.exploded ?? 0,
      });
      setMaterials(
        nextMaterials
          ? { ...nextMaterials }
          : { ...ASSEMBLY_PROFILES[nextAssemblyId].defaultMaterials }
      );
      setEnvironment(options?.environment ?? 'studio');
      setActionSequence(options?.actionSequence ?? 'none');
      setOverlayMode('pbr');
      setInspectedPart(null);
      setCameraPreset('iso');
      setCameraPresetNonce((n) => n + 1);
      if (options?.camSim) {
        setCamConfig((prev) => ({
          ...prev,
          enabled: true,
          showStockEnvelope: true,
          strategy: options.camStrategy ?? prev.strategy,
        }));
        setDockCollapsed(false);
        setRequestedDockTab((prev) => ({ tab: 'cam', nonce: prev.nonce + 1 }));
      } else {
        setCamConfig((prev) => ({ ...prev, enabled: false, showStockEnvelope: false }));
      }
      setViewMode(options?.openDrawing ? 'drawing' : 'studio');
    },
    []
  );

  const showToast = useCallback((msg: string) => {
    setCaptureBanner(msg);
    window.setTimeout(() => {
      setCaptureBanner(null);
    }, 2800);
  }, []);

  const handleChangeCamConfig = useCallback((next: Partial<CamSimulationConfig>) => {
    setCamConfig((prev) => ({ ...prev, ...next }));
  }, []);

  const handleExportStl = useCallback(() => {
    const res = viewportRef.current?.exportStl(`${profile.code.toLowerCase()}_cad`);
    if (res) {
      showToast(`Exported ${profile.code} Binary .STL (${res.triangleCount.toLocaleString()} tris)`);
    }
  }, [profile.code, showToast]);

  const handleExportObj = useCallback(() => {
    const res = viewportRef.current?.exportObj(`${profile.code.toLowerCase()}_cad`);
    if (res) {
      showToast(`Exported ${profile.code} Wavefront .OBJ (${res.triangleCount.toLocaleString()} tris)`);
    }
  }, [profile.code, showToast]);

  const handleExportGCode = useCallback(
    (gcode: string) => {
      exportGCodeFile(gcode, `${profile.code.toLowerCase()}_5axis.nc`);
      showToast(`Exported ${profile.code} 5-Axis CNC .NC G-Code`);
    },
    [profile.code, showToast]
  );

  const handleChangeParams = useCallback((next: Partial<ParametricConfig>) => {
    setParams((prev) => ({ ...prev, ...next }));
  }, []);

  const handleResetParams = useCallback(() => {
    setParams({ ...ASSEMBLY_PROFILES[assemblyId].defaults });
    setMaterials({ ...ASSEMBLY_PROFILES[assemblyId].defaultMaterials });
    setOverlayMode('pbr');
    setActionSequence('none');
    setCamConfig((prev) => ({ ...prev, enabled: false, showStockEnvelope: false }));
    setCameraPreset('iso');
    setCameraPresetNonce((n) => n + 1);
  }, [assemblyId]);

  const handleChangeMaterial = useCallback(
    (subsystem: SubsystemKey, materialId: MaterialId) => {
      setMaterials((prev) => ({ ...prev, [subsystem]: materialId }));
      setInspectedPart((prev) =>
        prev && prev.subsystem === subsystem ? { ...prev, materialId } : prev
      );
    },
    []
  );

  const handleSelectCameraPreset = useCallback((preset: CameraPresetId) => {
    setActionSequence('none');
    setCameraPreset(preset);
    setCameraPresetNonce((n) => n + 1);
  }, []);

  const handleCaptureShot = useCallback(() => {
    if (viewMode !== 'studio' && viewMode !== 'builder') {
      setViewMode('studio');
      return;
    }
    const dataUrl = viewportRef.current?.captureActionShot();
    if (!dataUrl) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const newShot: CapturedShot = {
      id: `${Date.now()}`,
      title: `${profile.code} · ${
        environment === 'stratosphere'
          ? 'Stratosphere Flight'
          : environment === 'wind_tunnel'
          ? 'CFD Tunnel'
          : environment === 'night_apron'
          ? 'Night Apron'
          : 'Hangar Studio'
      }`,
      timestamp: timeStr,
      assemblyId,
      assemblyName: profile.name,
      environment,
      cameraPreset: actionSequence !== 'none' ? actionSequence : cameraPreset,
      resolution: `${window.innerWidth}×${window.innerHeight}`,
      dataUrl,
      machLabel:
        profile.domain === 'automotive'
          ? `$${specs.estimatedUnitCostUsd.toLocaleString()}`
          : `Mach ${specs.cruiseMach}`,
      massLabel: `${specs.mtowKg.toLocaleString()} kg`,
    };

    setShots((prev) => [newShot, ...prev]);
    setCaptureBanner(`Action shot saved (${shots.length + 1} in gallery)`);
    window.setTimeout(() => {
      setCaptureBanner(null);
    }, 2600);
  }, [
    viewMode,
    profile.code,
    profile.name,
    profile.domain,
    environment,
    assemblyId,
    actionSequence,
    cameraPreset,
    specs.cruiseMach,
    specs.estimatedUnitCostUsd,
    specs.mtowKg,
    shots.length,
  ]);

  const handleDeleteShot = useCallback((id: string) => {
    setShots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const syncParamsFromCustomDesign = useCallback((cfg: CustomDesignConfig) => {
    setParams((prev) => ({
      ...prev,
      wingspanM: Number((cfg.trackWidthMm / 1000).toFixed(2)),
      fuselageLengthM: Number((cfg.wheelbaseMm / 1000).toFixed(2)),
      sweepDeg: cfg.wingAngleDeg,
      skinGaugeMm: cfg.railGaugeMm,
      bypassRatio: cfg.firstGearRatio,
    }));
    setMaterials({
      airframe: cfg.chassisMaterial,
      wings: cfg.aeroMaterial,
      propulsion: cfg.engineBlockMaterial,
      internal: cfg.uprightMaterial,
    });
  }, []);

  const handleUpdateCustomDesign = useCallback(
    (patch: Partial<CustomDesignConfig>) => {
      setCustomDesign((prev) => {
        const next = { ...prev, ...patch };
        syncParamsFromCustomDesign(next);
        return next;
      });
    },
    [syncParamsFromCustomDesign]
  );

  const handleSnapDatums = useCallback(() => {
    setCustomDesign((prev) => ({ ...prev, bellhousingOffsetMm: 0 }));
    showToast('Datums snapped to 0.00 mm nominal alignment');
  }, [showToast]);

  const handleResetCustomDesign = useCallback(() => {
    const fresh = { ...DEFAULT_CUSTOM_DESIGN };
    setCustomDesign(fresh);
    setAssemblyId('custom_build');
    setParams({ ...ASSEMBLY_PROFILES.custom_build.defaults });
    setMaterials({ ...ASSEMBLY_PROFILES.custom_build.defaultMaterials });
    setCameraPreset('iso');
    setCameraPresetNonce((n) => n + 1);
  }, []);

  const handleOpenInCustomBuilder = useCallback(
    (patch: Partial<CustomDesignConfig>, label: string) => {
      const next = { ...customDesign, ...patch };
      setCustomDesign(next);
      setAssemblyId('custom_build');
      syncParamsFromCustomDesign(next);
      setInspectedPart(null);
      setOverlayMode('pbr');
      setActionSequence('none');
      setCameraPreset('iso');
      setCameraPresetNonce((n) => n + 1);
      setViewMode('builder');
      showToast(`Loaded ${label} in Design Studio`);
    },
    [customDesign, showToast, syncParamsFromCustomDesign]
  );

  const handleSelectTopNav = useCallback(
    (target: ViewMode) => {
      if (target === 'builder' && assemblyId !== 'custom_build') {
        setAssemblyId('custom_build');
        syncParamsFromCustomDesign(customDesign);
        setInspectedPart(null);
        setCameraPreset('iso');
        setCameraPresetNonce((n) => n + 1);
      }
      setViewMode(target);
    },
    [assemblyId, customDesign, syncParamsFromCustomDesign]
  );

  // 4K still capture: render one frame at 3840×2160 and download it as a PNG.
  const handleCapture4K = useCallback(() => {
    const dataUrl = viewportRef.current?.captureHiResShot?.(3840, 2160);
    if (!dataUrl) {
      showToast('4K capture unavailable — open the 3D studio first');
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `aeroforge-4k-${Date.now()}.png`;
    a.click();
    showToast('4K render captured (3840 × 2160 PNG)');
  }, [showToast]);

  // Showroom capture: the current 3D view becomes the Drawing Room's showroom render.
  const handleCaptureShowroom = useCallback(() => {
    const dataUrl = viewportRef.current?.captureActionShot();
    if (dataUrl) {
      setLatestShot(dataUrl);
      showToast('Showroom render captured');
    }
  }, [showToast]);

  // Powertrain configurator: load an engine type into the 3D builder.
  const handleSelectEngineConfig = useCallback(
    (cylinders: number) => {
      const cfg = engineConfigFor(cylinders);
      handleChangeAssembly('sbc350_v8');
      handleChangeParams({ ribDensity: cylinders, sweepDeg: cfg.bankAngleDeg / 2 });
      setViewMode('studio');
    },
    [handleChangeAssembly, handleChangeParams]
  );

  // Catalog: load an entry's linked assembly into the 3D studio.
  const handleLoadAssembly = useCallback(
    (id: AssemblyId) => {
      handleChangeAssembly(id);
      setViewMode('studio');
    },
    [handleChangeAssembly]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0f14] text-slate-100">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between gap-8 px-6 bg-[#0b0f14]/95 border-b border-slate-800/90">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setViewMode('studio');
          }}
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          AeroForge Studio
        </a>

        {/* Zone 2: 10 clean single-line nav links */}
        <nav className="flex items-center gap-6 text-sm font-medium overflow-x-auto">
          {(
            [
              { id: 'studio', label: '3D Studio' },
              { id: 'builder', label: 'Design Studio' },
              { id: 'dyno', label: 'Dyno Lab' },
              { id: 'catalog', label: 'Catalog' },
              { id: 'powertrain', label: 'Powertrain' },
              { id: 'engineblock', label: 'Engine Block' },
              { id: 'matrix', label: 'Global Matrix' },
              { id: 'drawing', label: 'Blueprints' },
              { id: 'futuredraw', label: 'Future Draw' },
              { id: 'automatrix', label: 'Auto Matrix' },
              {
                id: 'specs',
                label: shots.length > 0 ? `Specs & Shots (${shots.length})` : 'Specs & Shots',
              },
            ] as const
          ).map((nav) => {
            const active =
              nav.id === 'specs'
                ? viewMode === 'specs' || viewMode === 'gallery'
                : viewMode === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => handleSelectTopNav(nav.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                  active
                    ? 'text-white border-amber-500'
                    : 'text-slate-400 border-transparent hover:text-slate-100'
                }`}
              >
                {nav.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleCaptureShot}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>
              {viewMode === 'studio' || viewMode === 'builder' ? 'Capture Shot' : 'Open 3D Portal'}
            </span>
          </button>
        </div>
      </header>

      {/* Persistent 3D WebGL Viewport (full-screen in studio, right split-pane in builder / dyno / powertrain) */}
      <div
        className={`fixed top-14 right-0 bottom-0 transition-opacity duration-200 ${
          viewMode === 'builder' || viewMode === 'dyno' || viewMode === 'powertrain' || viewMode === 'engineblock'
            ? 'left-[460px] xl:left-[520px]'
            : 'left-0'
        } ${
          viewMode === 'studio' ||
          viewMode === 'builder' ||
          viewMode === 'dyno' ||
          viewMode === 'powertrain' ||
          viewMode === 'engineblock'
            ? 'opacity-100 pointer-events-auto z-0'
            : 'opacity-0 pointer-events-none -z-10'
        }`}
      >
        <Viewport3D
          ref={viewportRef}
          assemblyId={assemblyId}
          params={params}
          materials={materials}
          environment={environment}
          cameraPreset={cameraPreset}
          cameraPresetNonce={cameraPresetNonce}
          actionSequence={actionSequence}
          overlayMode={overlayMode}
          bloomIntensity={bloomIntensity}
          camConfig={camConfig}
          customDesign={customDesign}
          isVisible={
            viewMode === 'studio' ||
            viewMode === 'builder' ||
            viewMode === 'dyno' ||
            viewMode === 'powertrain' ||
            viewMode === 'engineblock'
          }
          engineRunning={engineRunning && assemblyId === 'sbc350_v8'}
          targetRpm={targetRpm}
          engineCylCount={engineCylCount}
          renderQuality={displayPrefs.quality}
          onEngineTelemetry={setEngineTelemetry}
          onSelectPart={setInspectedPart}
          onEnvelopeMeasured={setEnvelopeMm}
        />
      </div>

      {/* Left-Docked Custom Design Studio Builder */}
      {viewMode === 'builder' && (
        <CustomDesignStudioView
          config={customDesign}
          exploded={params.exploded}
          onChangeExploded={(val) => handleChangeParams({ exploded: val })}
          onChangeConfig={handleUpdateCustomDesign}
          onSnapDatums={handleSnapDatums}
          onResetConfig={handleResetCustomDesign}
          onOpenFullStudio={() => {
            setAssemblyId('custom_build');
            setViewMode('studio');
          }}
          onOpenBlueprint={() => {
            setAssemblyId('custom_build');
            setViewMode('drawing');
          }}
          onExportStl={handleExportStl}
        />
      )}

      {/* Left-Docked Dyno Lab — live dyno panel + run sheet, viewport on the right */}
      {viewMode === 'dyno' && (
        <div className="fixed top-14 left-0 bottom-0 w-[460px] xl:w-[520px] z-10 overflow-hidden bg-[#0b0f14] border-r border-slate-800">
          <DynoLabView
            isV8={assemblyId === 'sbc350_v8'}
            onSelectV8={() => handleChangeAssembly('sbc350_v8')}
            engineRunning={engineRunning}
            onToggleEngine={() => setEngineRunning((v) => !v)}
            throttlePct={throttlePct}
            onChangeThrottle={setThrottlePct}
            tune={dynoTune}
            onChangeTune={setDynoTune}
            telemetry={engineTelemetry}
            units={displayPrefs.units}
          />
        </div>
      )}

      {/* Left-Docked Powertrain Configurator — engine + gearbox tabs, viewport on the right */}
      {viewMode === 'powertrain' && (
        <div className="fixed top-14 left-0 bottom-0 w-[460px] xl:w-[520px] z-10 overflow-hidden bg-[#0b0f14] border-r border-slate-800">
          <PowertrainView
            engineCylCount={engineCylCount}
            onSelectEngine={handleSelectEngineConfig}
            onLoadTransmission={handleLoadAssembly}
            telemetry={engineTelemetry}
            engineRunning={engineRunning}
          />
        </div>
      )}

      {/* Left-Docked Engine Block — v16 block functionality, viewport on the right */}
      {viewMode === 'engineblock' && (
        <div className="fixed top-14 left-0 bottom-0 w-[460px] xl:w-[520px] z-10 overflow-hidden bg-[#0b0f14] border-r border-slate-800">
          <EngineBlockView
            isV8={assemblyId === 'sbc350_v8'}
            onSelectV8={() => handleChangeAssembly('sbc350_v8')}
            engineRunning={engineRunning}
            onToggleEngine={() => setEngineRunning((v) => !v)}
            throttlePct={throttlePct}
            onChangeThrottle={setThrottlePct}
            tune={dynoTune}
            onChangeTune={setDynoTune}
            telemetry={engineTelemetry}
          />
        </div>
      )}

      {/* Minimal Bottom-Left Unboxed Spec Readout & Part Inspector in 3D Studio / Builder */}
      {(viewMode === 'studio' || viewMode === 'builder') && (
        <div
          className={`fixed bottom-4 z-10 pointer-events-none space-y-2 max-w-md ${
            viewMode === 'builder' ? 'left-[480px] xl:left-[540px]' : 'left-5'
          }`}
        >
          <div className="pointer-events-auto inline-block px-3.5 py-2 rounded bg-[#0e141c]/92 border border-slate-800">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs font-semibold text-white">
                {assemblyId === 'custom_build' ? customDesign.buildName : profile.name}
              </div>
              <button
                type="button"
                onClick={() => ambientAudioEngine.toggle()}
                className={`flex items-center gap-1.5 text-[11px] font-mono transition-colors cursor-pointer ${
                  audioSnapshot.enabled
                    ? 'text-slate-300 hover:text-amber-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Toggle Ambient Soundscape (M)"
              >
                {audioSnapshot.enabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                <span>
                  {audioSnapshot.enabled ? audioSnapshot.activeLabel : 'Audio Muted'}
                </span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-slate-300 mt-0.5">
              <span>{specs.mtowKg.toLocaleString()} kg</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>
                {profile.domain === 'automotive'
                  ? `$${specs.estimatedUnitCostUsd.toLocaleString()} Est.`
                  : `${specs.totalThrustKN} kN`}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>
                {profile.domain === 'automotive'
                  ? `${specs.structuralSafetyFactor}x SF`
                  : `Mach ${specs.cruiseMach}`}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400">{specs.compositeRecyclabilityPct}% Recyc</span>
            </div>
          </div>

          {inspectedPart && (
            <div className="pointer-events-auto p-3 rounded bg-[#0e141c]/95 border border-amber-500/50 max-w-xs space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono text-amber-400">
                    {inspectedPart.partCode} · {inspectedPart.subsystem.toUpperCase()}
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {inspectedPart.partName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedPart(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-xs text-slate-300 font-mono">
                {AEROSPACE_MATERIALS[inspectedPart.materialId].name} ·{' '}
                {AEROSPACE_MATERIALS[inspectedPart.materialId].yieldStrengthMPa} MPa ·{' '}
                {AEROSPACE_MATERIALS[inspectedPart.materialId].recyclabilityPct}% Recyc
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live engine HUD (V8 only) — top-right of the viewport */}
      {(viewMode === 'studio' ||
        viewMode === 'builder' ||
        viewMode === 'dyno' ||
        viewMode === 'powertrain' ||
        viewMode === 'engineblock') &&
        assemblyId === 'sbc350_v8' && (
          <div className="fixed top-[70px] right-5 z-10 pointer-events-none">
            <EngineHud telemetry={engineTelemetry} tune={dynoTune} prefs={displayPrefs} />
          </div>
        )}

      {/* Shot Capture Confirmation Banner */}
      {captureBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded bg-[#0e141c] border border-amber-500 text-xs font-medium text-amber-300 shadow-lg">
          {captureBanner}
        </div>
      )}

      {/* Collapsible Bottom Control Dock (3D Studio only) */}
      {viewMode === 'studio' && (
        <BottomControlDock
          assemblyId={assemblyId}
          onChangeAssembly={handleChangeAssembly}
          params={params}
          onChangeParams={handleChangeParams}
          onResetParams={handleResetParams}
          materials={materials}
          onChangeMaterial={handleChangeMaterial}
          environment={environment}
          onChangeEnvironment={setEnvironment}
          cameraPreset={cameraPreset}
          onSelectCameraPreset={handleSelectCameraPreset}
          actionSequence={actionSequence}
          onChangeActionSequence={setActionSequence}
          overlayMode={overlayMode}
          onChangeOverlayMode={setOverlayMode}
          bloomIntensity={bloomIntensity}
          onChangeBloom={setBloomIntensity}
          audioEnabled={audioSnapshot.enabled}
          audioVolume={audioSnapshot.volume}
          audioLabel={audioSnapshot.activeLabel}
          onToggleAudio={() => ambientAudioEngine.toggle()}
          onChangeAudioVolume={(val) => ambientAudioEngine.setVolume(val)}
          camConfig={camConfig}
          onChangeCamConfig={handleChangeCamConfig}
          envelopeMm={envelopeMm}
          onExportStl={handleExportStl}
          onExportObj={handleExportObj}
          onExportGCode={handleExportGCode}
          requestedTab={requestedDockTab}
          collapsed={dockCollapsed}
          onToggleCollapse={() => setDockCollapsed((v) => !v)}
          dyno={{
            isV8: assemblyId === 'sbc350_v8',
            onSelectV8: () => handleChangeAssembly('sbc350_v8'),
            engineRunning,
            onToggleEngine: () => setEngineRunning((v) => !v),
            throttlePct,
            onChangeThrottle: setThrottlePct,
            tune: dynoTune,
            onChangeTune: setDynoTune,
            telemetry: engineTelemetry,
          }}
          display={{
            prefs: displayPrefs,
            onChangePrefs: (next) => setDisplayPrefs((p) => ({ ...p, ...next })),
            onCapture4K: handleCapture4K,
          }}
        />
      )}

      {/* Dedicated Automotive Liberty CAD/CAM Matrix View */}
      {viewMode === 'matrix' && (
        <div className="relative z-10 w-full h-full">
          <AutomotiveMatrixView
            onLaunchIn3DPortal={handleLaunchIn3DPortal}
            onOpenInCustomBuilder={handleOpenInCustomBuilder}
          />
        </div>
      )}

      {/* Dedicated Technical Drawing View */}
      {viewMode === 'drawing' && (
        <div className="relative z-10 w-full h-full">
          <TechnicalDrawingView
            assemblyId={assemblyId}
            params={params}
            materials={materials}
            specs={specs}
            customDesign={customDesign}
            latestShot={latestShot}
            onCaptureShot={handleCaptureShowroom}
          />
        </div>
      )}

      {/* Dedicated Vehicle Catalog View */}
      {viewMode === 'catalog' && (
        <div className="relative z-10 w-full h-full">
          <VehicleCatalogView onLoadAssembly={handleLoadAssembly} />
        </div>
      )}

      {/* Dedicated Future Drawing Description View */}
      {viewMode === 'futuredraw' && (
        <div className="relative z-10 w-full h-full">
          <FutureDrawingView
            assemblyId={assemblyId}
            params={params}
            materials={materials}
            specs={specs}
            customDesign={customDesign}
          />
        </div>
      )}

      {/* Dedicated Automotive Universe (Auto Matrix) View */}
      {viewMode === 'automatrix' && (
        <div className="relative z-10 w-full h-full">
          <AutoMatrixView
            onSelectEngine={handleSelectEngineConfig}
            onLoadTransmission={handleLoadAssembly}
            onLoadAssembly={handleLoadAssembly}
          />
        </div>
      )}

      {/* Dedicated Real-World Specifications & Circularity Advisory View */}
      {viewMode === 'specs' && (
        <div className="relative z-10 w-full h-full">
          <EngineeringSpecsView
            assemblyId={assemblyId}
            params={params}
            materials={materials}
            specs={specs}
            shotsCount={shots.length}
            onOpenShotGallery={() => setViewMode('gallery')}
            onApplyPresetMaterials={setMaterials}
          />
        </div>
      )}

      {/* Dedicated Action Shot Gallery View */}
      {viewMode === 'gallery' && (
        <div className="relative z-10 w-full h-full">
          <ShotGalleryView
            shots={shots}
            onDeleteShot={handleDeleteShot}
            onBackToStudio={() => setViewMode('studio')}
            onOpenSpecs={() => setViewMode('specs')}
          />
        </div>
      )}
    </div>
  );
}
