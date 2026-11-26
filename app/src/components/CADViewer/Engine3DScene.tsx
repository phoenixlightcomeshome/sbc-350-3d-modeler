/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  EngineConfig,
  CoordinatedSpecs,
  CutawayMode,
  SubsystemIsolation,
  InspectionData,
  MeasurementState,
  TechDrawingSheet,
  CinematicLightingPreset,
  DynamicKinematicTelemetry,
  HoverProbeData,
  MountedStudioDesign
} from '../../types/engine';
import {
  createProceduralTextureSet,
  createARP12PointBolt,
  createGearGeometry,
  createCamLobeGeometry,
  createCounterweightGeometry,
  createHelicalSpringGeometry,
  createHBeamConnectingRod,
  createV8BlockProfileGeometry,
  createRollerRockerGroup,
  createCrankTriggerWheelGeometry,
  createVentedAlternatorGroup,
  createDetailedOilPanGroup,
  createTimingCoverGroup,
  createChassisAndRadiatorGroup,
  createHollowValveCoverGroup,
  createStudGirdleBarGroup,
  createHolley4150CarburetorGroup,
  createEngineTestStandGroup,
  createDetailedPistonAssembly,
  createSplineShaftGeometry,
  applyTechnicalEdges
} from './mechanicalGeometry';

import { AnalysisMode } from './SpecificationTreeDrawer';
import { exportObject3DToSTL } from '../../utils/cadExporters';

export type EngineViewMode =
  | 'cinematic'
  | 'iso_paper'
  | 'realistic'
  | 'dark'
  | 'ghost'
  | 'wireframe'
  | 'drawing';
export type CameraPresetId =
  | 'iso'
  | 'hero'
  | 'cutaway_detail'
  | 'valvetrain_macro'
  | 'front'
  | 'right'
  | 'top'
  | 'rear';
export type InductionDressMode = 'carb_hei' | 'mpfi_cnp';
export type SupportMode = 'shop_stand' | 'hotrod_chassis';

interface Engine3DSceneProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  cutawayMode: CutawayMode;
  subsystemIsolation: SubsystemIsolation;
  explodedAmount: number;
  sectionOffset?: number;
  cameraPreset?: { id: CameraPresetId; nonce: number } | null;
  projectionMode?: 'perspective' | 'orthographic';
  analysisMode?: AnalysisMode;
  inductionDress?: InductionDressMode;
  supportMode?: SupportMode;
  cinematicPreset?: CinematicLightingPreset;
  hiddenParts?: Record<string, boolean>;
  onRegisterCapture?: (fn: (() => void) | null) => void;
  onRegisterStlExport?: (fn: (() => void) | null) => void;
  rpm: number;
  isRunning: boolean;
  viewMode: EngineViewMode;
  showMarkups: boolean;
  onSelectPart: (data: InspectionData | null) => void;
  selectedPart: InspectionData | null;
  measurementState: MeasurementState;
  onUpdateMeasurement: (state: MeasurementState) => void;
  techDrawing?: TechDrawingSheet | null;
  mountedDesign?: MountedStudioDesign | null;
  focusPartRequest?: { key: string; nonce: number } | null;
  onOpenDrawingsTab?: () => void;
  onTelemetryUpdate?: (telemetry: DynamicKinematicTelemetry) => void;
  onHoverProbe?: (probe: HoverProbeData | null) => void;
}

function detectSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext | null): boolean {
  if (!gl) return true;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

// Module-level reusable math helpers (zero GC inside animation loop)
const _rayMouse = new THREE.Vector2();
const _ptA = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3(0, 1.0, 0);
const _engineFocusBox = new THREE.Box3();
const _engineFocusCenter = new THREE.Vector3();

const CAMERA_PRESET_COORDS: Record<CameraPresetId, [number, number, number]> = {
  iso: [17.5, 12.0, 21.0],
  hero: [14.8, 7.2, 16.8],
  cutaway_detail: [9.8, 3.6, 10.6],
  valvetrain_macro: [6.8, 7.4, 7.2],
  front: [0, 1.8, 25.0],
  right: [24.0, 2.5, 0],
  top: [0, 26.5, 0.05],
  rear: [0, 2.2, -25.0]
};

export const Engine3DScene: React.FC<Engine3DSceneProps> = ({
  config,
  specs,
  cutawayMode,
  subsystemIsolation,
  explodedAmount,
  sectionOffset = 0,
  cameraPreset = null,
  projectionMode = 'perspective',
  analysisMode = 'none',
  inductionDress = 'carb_hei',
  supportMode = 'shop_stand',
  cinematicPreset = 'dyno_cell',
  hiddenParts = {},
  onRegisterCapture,
  onRegisterStlExport,
  rpm,
  isRunning,
  viewMode,
  onSelectPart,
  selectedPart,
  measurementState,
  onUpdateMeasurement,
  techDrawing = null,
  focusPartRequest = null,
  onOpenDrawingsTab,
  onTelemetryUpdate,
  onHoverProbe
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const isRunningRef = useRef(isRunning);
  const rpmRef = useRef(rpm);
  const explodedRef = useRef(explodedAmount);
  const sectionOffsetRef = useRef(sectionOffset);
  const hiddenPartsRef = useRef(hiddenParts);
  const measurementRef = useRef(measurementState);
  const selectedPartRef = useRef(selectedPart);
  const onSelectPartRef = useRef(onSelectPart);
  const onUpdateMeasurementRef = useRef(onUpdateMeasurement);
  const onRegisterCaptureRef = useRef(onRegisterCapture);
  const onRegisterStlExportRef = useRef(onRegisterStlExport);
  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  const onHoverProbeRef = useRef(onHoverProbe);
  const specsRef = useRef(specs);
  const configRef = useRef(config);
  const enginePartsRef = useRef<Record<string, THREE.Object3D>>({});
  const engineReticleStateRef = useRef<{
    reticle: THREE.Mesh;
    camera: THREE.Camera;
  } | null>(null);
  const camTransitionRef = useRef<{ active: boolean; pos: THREE.Vector3 }>({
    active: false,
    pos: new THREE.Vector3(...CAMERA_PRESET_COORDS.iso)
  });

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { rpmRef.current = rpm; }, [rpm]);
  useEffect(() => { explodedRef.current = explodedAmount; }, [explodedAmount]);
  useEffect(() => { sectionOffsetRef.current = sectionOffset; }, [sectionOffset]);
  useEffect(() => { hiddenPartsRef.current = hiddenParts; }, [hiddenParts]);
  useEffect(() => { measurementRef.current = measurementState; }, [measurementState]);
  useEffect(() => { selectedPartRef.current = selectedPart; }, [selectedPart]);
  useEffect(() => { onSelectPartRef.current = onSelectPart; }, [onSelectPart]);
  useEffect(() => { onUpdateMeasurementRef.current = onUpdateMeasurement; }, [onUpdateMeasurement]);
  useEffect(() => { onRegisterCaptureRef.current = onRegisterCapture; }, [onRegisterCapture]);
  useEffect(() => { onRegisterStlExportRef.current = onRegisterStlExport; }, [onRegisterStlExport]);
  useEffect(() => { onTelemetryUpdateRef.current = onTelemetryUpdate; }, [onTelemetryUpdate]);
  useEffect(() => { onHoverProbeRef.current = onHoverProbe; }, [onHoverProbe]);
  useEffect(() => { specsRef.current = specs; }, [specs]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => {
    if (!cameraPreset) return;
    const coords = CAMERA_PRESET_COORDS[cameraPreset.id];
    camTransitionRef.current.pos.set(coords[0], coords[1], coords[2]);
    camTransitionRef.current.active = true;
  }, [cameraPreset]);

  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 560;

    const isDrawing = viewMode === 'drawing';
    const isIsoPaper = viewMode === 'iso_paper';
    const isWire = viewMode === 'wireframe';
    const isGhost = viewMode === 'ghost';
    const isStudio = viewMode === 'realistic';
    const isCinematic = viewMode === 'cinematic';

    let candidateRenderer = rendererRef.current;
    if (!candidateRenderer) {
      try {
        candidateRenderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: 'default',
          preserveDrawingBuffer: true
        });
        rendererRef.current = candidateRenderer;
      } catch (err) {
        setWebglError(
          err instanceof Error
            ? err.message
            : 'WebGL 3D context could not be initialized by your browser.'
        );
        return;
      }
    }
    const renderer: THREE.WebGLRenderer = candidateRenderer;
    const initialGl = renderer.getContext();
    if (!initialGl) {
      setWebglError('WebGL rendering context is unavailable or was lost.');
      return;
    }
    setWebglError(null);

    const isSoftwareGl = detectSoftwareRenderer(initialGl);

    // 2. Scene, Fog & Renderer Setup
    const scene = new THREE.Scene();
    const cinematicBg =
      cinematicPreset === 'showroom'
        ? 0x05070b
        : cinematicPreset === 'machine_shop'
        ? 0x0a0d12
        : 0x06080d;
    const bgHex = isCinematic
      ? cinematicBg
      : isIsoPaper
      ? 0xf5f6f8
      : isDrawing
      ? 0x091628
      : isWire
      ? 0x07111a
      : isStudio
      ? 0xdce1e7
      : 0x101419;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(
      bgHex,
      isCinematic ? 0.013 : isIsoPaper ? 0.0022 : isStudio ? 0.004 : 0.011
    );

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isCinematic ? 1.18 : isIsoPaper ? 1.14 : isStudio ? 1.08 : 1.16;
    renderer.localClippingEnabled = true;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (renderer.domElement.parentNode !== container) {
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    }

    // 3. Camera & OrbitControls (Perspective or True CAD Orthographic)
    const aspect = width / height;
    const orthoHalf = 9.5;
    const camera: THREE.PerspectiveCamera | THREE.OrthographicCamera =
      projectionMode === 'orthographic'
        ? new THREE.OrthographicCamera(
            -orthoHalf * aspect,
            orthoHalf * aspect,
            orthoHalf,
            -orthoHalf,
            -120,
            400
          )
        : new THREE.PerspectiveCamera(isCinematic ? 36 : 40, aspect, 0.1, 400);
    camera.position.set(17.5, 11.5, 20.5);
    camera.lookAt(0, 1.0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 6.5;
    controls.maxDistance = 48;
    controls.target.set(0, 1.0, 0);
    controls.addEventListener('start', () => {
      camTransitionRef.current.active = false;
    });

    // 4. Studio Environment Map (RoomEnvironment) + 3-Point Warm/Cool Lighting + Softboxes
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(
      isCinematic
        ? cinematicPreset === 'machine_shop'
          ? 0xfef3c7
          : 0xbae6fd
        : isIsoPaper || isStudio
        ? 0xffffff
        : 0xcbe4ff,
      isCinematic ? 0x1e293b : isIsoPaper ? 0x94a3b8 : isStudio ? 0x64748b : 0x2a1f18,
      isCinematic ? 0.85 : isIsoPaper ? 1.25 : isStudio ? 1.05 : 0.72
    );
    scene.add(hemiLight);

    const keyColor =
      isCinematic && cinematicPreset === 'machine_shop'
        ? 0xffedd5
        : isCinematic && cinematicPreset === 'showroom'
        ? 0xf8fafc
        : 0xfff7ed;
    const keyLight = new THREE.DirectionalLight(
      keyColor,
      isCinematic ? 2.25 : isIsoPaper ? 1.95 : isStudio ? 1.85 : 1.65
    );
    keyLight.position.set(18, 25, 18);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = isCinematic ? 2048 : 1024;
      keyLight.shadow.mapSize.height = isCinematic ? 2048 : 1024;
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 65;
      keyLight.shadow.camera.left = -14;
      keyLight.shadow.camera.right = 14;
      keyLight.shadow.camera.top = 14;
      keyLight.shadow.camera.bottom = -14;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(
      isCinematic
        ? cinematicPreset === 'machine_shop'
          ? 0x38bdf8
          : 0x67e8f9
        : isIsoPaper || isStudio
        ? 0xe0f2fe
        : 0x7cc4ff,
      isCinematic ? 1.45 : isIsoPaper || isStudio ? 0.95 : 0.9
    );
    rimLight.position.set(-18, 14, -18);
    scene.add(rimLight);

    const underLight = new THREE.DirectionalLight(
      isCinematic ? 0xfb923c : 0xffcf99,
      isCinematic ? 0.65 : isStudio ? 0.55 : 0.45
    );
    underLight.position.set(2, -12, 8);
    scene.add(underLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softboxTop = new THREE.RectAreaLight(
        0xffffff,
        isCinematic ? 4.4 : isIsoPaper || isStudio ? 3.2 : 2.4,
        16,
        7
      );
      softboxTop.position.set(0, 14, 4);
      softboxTop.lookAt(0, 1, 0);
      scene.add(softboxTop);

      if (isCinematic) {
        const softboxSide = new THREE.RectAreaLight(0x38bdf8, 2.8, 12, 5);
        softboxSide.position.set(-14, 4, -8);
        softboxSide.lookAt(0, 0.5, 0);
        scene.add(softboxSide);
      }
    }

    // 5. Procedural CAD Textures & Stage Grounding
    const maxAniso = isSoftwareGl ? 1 : Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const textures = createProceduralTextureSet(maxAniso);

    const stagePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34),
      new THREE.MeshStandardMaterial({
        map: isIsoPaper || isStudio ? textures.studioFloorShadowMap : textures.blueprintScaleMap,
        color: isCinematic ? 0x0b1017 : 0xffffff,
        roughness: isCinematic ? 0.28 : 0.9,
        metalness: isCinematic ? 0.35 : 0.0,
        transparent: true,
        opacity: isCinematic ? 0.92 : isIsoPaper ? 0.42 : isStudio ? 0.92 : 0.85,
        depthWrite: isCinematic
      })
    );
    stagePlane.rotation.x = -Math.PI / 2;
    stagePlane.position.y = -5.78;
    stagePlane.receiveShadow = !isSoftwareGl;
    scene.add(stagePlane);

    const grid = new THREE.GridHelper(
      34,
      34,
      isCinematic ? 0x1e293b : isIsoPaper ? 0xcbd5e1 : isDrawing ? 0x38bdf8 : isStudio ? 0x94a3b8 : 0x0ea5e9,
      isCinematic ? 0x0f172a : isIsoPaper ? 0xe2e8f0 : isDrawing ? 0x16324f : isStudio ? 0xc5cdd8 : 0x1c2833
    );
    grid.position.y = -5.80;
    scene.add(grid);

    // 6. Cutaway Clipping Planes & Isolation Helpers
    let activeClippingPlanes: THREE.Plane[] = [];
    let baseClipConstant = 0;
    if (cutawayMode === 'rightBank') {
      // Diagonal front-right museum cutaway: preserves rear half & left bank while slicing open
      // front-right valve cover, cylinder head, block bores, and timing cover.
      baseClipConstant = 2.15;
      activeClippingPlanes = [
        new THREE.Plane(new THREE.Vector3(-0.68, -0.38, -0.62).normalize(), baseClipConstant)
      ];
    } else if (cutawayMode === 'centerLongitudinal') {
      baseClipConstant = 0.15;
      activeClippingPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), baseClipConstant)];
    } else if (cutawayMode === 'valvetrain') {
      baseClipConstant = 3.75;
      activeClippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), baseClipConstant)];
    }

    const isIsolated = (sub: SubsystemIsolation) =>
      subsystemIsolation === 'all' || subsystemIsolation === sub;
    const getAlpha = (sub: SubsystemIsolation) => (isIsolated(sub) ? 1.0 : 0.11);

    // 7. Performance PBR Materials Library (with SIMULIA FEA Stress / Thermal / Clearance mapping)
    const isStress = analysisMode === 'stress';
    const isThermal = analysisMode === 'thermal';
    const isClearance = analysisMode === 'clearance';
    const quenchPass = specs.quenchDistance >= 0.038 && specs.quenchDistance <= 0.062;

    const mats = {
      chevyBlock: new THREE.MeshPhysicalMaterial({
        color: isStress
          ? 0x1d4ed8
          : isThermal
          ? 0x0284c7
          : isClearance
          ? 0x334155
          : isDrawing
          ? 0x162a45
          : isIsoPaper
          ? 0x94a3b8
          : 0xd83b01,
        roughness: isDrawing ? 0.85 : isIsoPaper ? 0.48 : 0.72,
        metalness: isDrawing ? 0.1 : isIsoPaper ? 0.48 : 0.24,
        bumpMap: isDrawing || isIsoPaper || analysisMode !== 'none' ? null : textures.castIronBump,
        bumpScale: 0.032,
        normalMap: isDrawing || isIsoPaper || analysisMode !== 'none' ? null : textures.castIronNormal,
        normalScale: new THREE.Vector2(0.72, 0.72),
        clearcoat: isDrawing || analysisMode !== 'none' ? 0 : 0.08,
        wireframe: isWire,
        transparent: isGhost || !isIsolated('all'),
        opacity: isGhost ? 0.30 : getAlpha('all'),
        clippingPlanes: activeClippingPlanes
      }),
      machinedDeck: new THREE.MeshPhysicalMaterial({
        color: isStress ? 0x06b6d4 : isThermal ? 0x38bdf8 : isClearance ? 0x22d3ee : isDrawing ? 0x1f3b5c : 0xdde3ea,
        map: isDrawing || analysisMode !== 'none' ? null : textures.machinedSwirl,
        normalMap: isDrawing || analysisMode !== 'none' ? null : textures.machinedNormal,
        normalScale: new THREE.Vector2(0.42, 0.42),
        roughness: 0.20,
        metalness: 0.90,
        anisotropy: 0.65,
        wireframe: isWire,
        transparent: !isIsolated('all') && !isIsolated('rotating'),
        opacity: isIsolated('all') ? 1.0 : Math.max(getAlpha('all'), getAlpha('rotating')),
        clippingPlanes: activeClippingPlanes
      }),
      machinedInternal: new THREE.MeshPhysicalMaterial({
        color: isStress ? 0x06b6d4 : isThermal ? 0x38bdf8 : isClearance ? 0x22d3ee : isDrawing ? 0x1f3b5c : 0xdde3ea,
        map: isDrawing || analysisMode !== 'none' ? null : textures.machinedSwirl,
        normalMap: isDrawing || analysisMode !== 'none' ? null : textures.machinedNormal,
        normalScale: new THREE.Vector2(0.40, 0.40),
        roughness: 0.18,
        metalness: 0.92,
        anisotropy: 0.68,
        wireframe: isWire,
        transparent: !isIsolated('rotating') && !isIsolated('valvetrain'),
        opacity: isIsolated('all') ? 1.0 : Math.max(getAlpha('rotating'), getAlpha('valvetrain'))
      }),
      sleeveBore: new THREE.MeshStandardMaterial({
        color: isStress ? 0x22c55e : isThermal ? 0xf59e0b : isClearance ? (quenchPass ? 0x10b981 : 0xef4444) : 0x94a3b8,
        map: analysisMode === 'none' ? textures.crosshatchHone : null,
        roughness: 0.18,
        metalness: 0.88,
        side: THREE.DoubleSide,
        wireframe: isWire,
        transparent: !isIsolated('all'),
        opacity: getAlpha('all'),
        clippingPlanes: activeClippingPlanes
      }),
      crankForged: new THREE.MeshPhysicalMaterial({
        color: isStress ? 0xf97316 : isThermal ? 0x22c55e : isClearance ? 0x38bdf8 : isDrawing ? 0x2b4f75 : 0xe2e8f0,
        normalMap: isDrawing || analysisMode !== 'none' ? null : textures.machinedNormal,
        normalScale: new THREE.Vector2(0.28, 0.28),
        roughness: 0.13,
        metalness: 0.96,
        anisotropy: 0.78,
        wireframe: isWire,
        transparent: !isIsolated('rotating'),
        opacity: getAlpha('rotating')
      }),
      rods4340: new THREE.MeshPhysicalMaterial({
        color: isStress ? 0xef4444 : isThermal ? 0x10b981 : isClearance ? (specs.rodStrokeRatio >= 1.6 ? 0x10b981 : 0xf59e0b) : isDrawing ? 0x213d5c : 0x64748b,
        normalMap: isDrawing || analysisMode !== 'none' ? null : textures.castIronNormal,
        normalScale: new THREE.Vector2(0.32, 0.32),
        roughness: 0.30,
        metalness: 0.88,
        anisotropy: 0.55,
        wireframe: isWire,
        transparent: !isIsolated('rotating'),
        opacity: getAlpha('rotating')
      }),
      pistonsAlloy: new THREE.MeshPhysicalMaterial({
        color: isStress ? 0xfacc15 : isThermal ? 0xf97316 : isClearance ? (quenchPass ? 0x10b981 : 0xef4444) : isDrawing ? 0x335e8c : 0xe2e8f0,
        map: isDrawing || analysisMode !== 'none' ? null : textures.pistonSkirtMoly,
        normalMap: isDrawing || analysisMode !== 'none' ? null : textures.machinedNormal,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.17,
        metalness: 0.86,
        anisotropy: 0.65,
        wireframe: isWire,
        transparent: !isIsolated('rotating'),
        opacity: getAlpha('rotating')
      }),
      wristPins: new THREE.MeshStandardMaterial({
        color: isStress ? 0xef4444 : isThermal ? 0xf59e0b : 0xf8fafc,
        roughness: 0.08,
        metalness: 0.98,
        wireframe: isWire,
        transparent: !isIsolated('rotating'),
        opacity: getAlpha('rotating')
      }),
      arpBlackOxide: new THREE.MeshStandardMaterial({
        color: isStress ? 0xeab308 : 0x1e293b,
        bumpMap: isDrawing || analysisMode !== 'none' ? null : textures.boltThreadBump,
        bumpScale: 0.014,
        roughness: 0.24,
        metalness: 0.92,
        wireframe: isWire
      }),
      brassBronze: new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.28,
        metalness: 0.88,
        wireframe: isWire
      }),
      felProCopper: new THREE.MeshStandardMaterial({
        color: isClearance ? (quenchPass ? 0x22c55e : 0xef4444) : isThermal ? 0xfacc15 : 0xc26d38,
        roughness: 0.26,
        metalness: 0.85,
        wireframe: isWire,
        transparent: !isIsolated('all'),
        opacity: getAlpha('all')
      }),
      aluminumHeads: new THREE.MeshPhysicalMaterial({
        color: isStress ? 0x3b82f6 : isThermal ? 0xfb923c : isClearance ? 0x475569 : isDrawing ? 0x1b3452 : 0xc4cbd2,
        bumpMap: isDrawing || analysisMode !== 'none' ? null : textures.castIronBump,
        bumpScale: 0.015,
        normalMap: isDrawing || analysisMode !== 'none' ? null : textures.castIronNormal,
        normalScale: new THREE.Vector2(0.50, 0.50),
        roughness: 0.34,
        metalness: 0.72,
        wireframe: isWire,
        transparent: isGhost || !isIsolated('valvetrain'),
        opacity: isGhost ? 0.28 : getAlpha('valvetrain'),
        clippingPlanes: activeClippingPlanes
      }),
      billetRockersBlue: new THREE.MeshPhysicalMaterial({
        color: isStress ? 0x22c55e : 0x0284c7,
        roughness: 0.22,
        metalness: 0.88,
        anisotropy: 0.6,
        wireframe: isWire,
        transparent: !isIsolated('valvetrain'),
        opacity: getAlpha('valvetrain')
      }),
      valveSpringsGold: new THREE.MeshStandardMaterial({
        color: isStress ? 0xf97316 : 0xeab308,
        roughness: 0.26,
        metalness: 0.88,
        wireframe: isWire,
        transparent: !isIsolated('valvetrain'),
        opacity: getAlpha('valvetrain')
      }),
      valvesSteel: new THREE.MeshStandardMaterial({
        color: isThermal ? 0xef4444 : isClearance ? 0x22d3ee : 0xf1f5f9,
        roughness: 0.14,
        metalness: 0.94,
        wireframe: isWire,
        transparent: !isIsolated('valvetrain'),
        opacity: getAlpha('valvetrain')
      }),
      chromePolish: new THREE.MeshPhysicalMaterial({
        color: isDrawing ? 0x3b6998 : 0xf8fafc,
        roughness: 0.08,
        metalness: 0.98,
        clearcoat: 0.6,
        wireframe: isWire,
        transparent: isGhost || !isIsolated('all'),
        opacity: isGhost ? 0.32 : getAlpha('all'),
        clippingPlanes: activeClippingPlanes
      }),
      standChrome: new THREE.MeshPhysicalMaterial({
        color: isDrawing ? 0x3b6998 : 0xe2e8f0,
        roughness: 0.14,
        metalness: 0.92,
        clearcoat: 0.4,
        wireframe: isWire,
        transparent: isGhost,
        opacity: isGhost ? 0.35 : 1.0
      }),
      valveCoverBody: new THREE.MeshPhysicalMaterial({
        color: isIsoPaper ? 0xe2e8f0 : isDrawing ? 0x1f3b5c : 0x1e242c,
        roughness: isIsoPaper ? 0.14 : 0.38,
        metalness: isIsoPaper ? 0.12 : 0.55,
        clearcoat: isIsoPaper ? 0.85 : 0.3,
        wireframe: isWire,
        transparent: isIsoPaper || isGhost || !isIsolated('valvetrain'),
        opacity: isIsoPaper ? 0.36 : isGhost ? 0.26 : getAlpha('valvetrain'),
        depthWrite: !isIsoPaper,
        clippingPlanes: activeClippingPlanes
      }),
      valveCoverFin: new THREE.MeshPhysicalMaterial({
        color: isDrawing ? 0x3b6998 : 0xdbe2e9,
        roughness: 0.16,
        metalness: 0.92,
        wireframe: isWire,
        transparent: isIsoPaper || isGhost || !isIsolated('valvetrain'),
        opacity: isIsoPaper ? 0.55 : isGhost ? 0.28 : getAlpha('valvetrain'),
        clippingPlanes: activeClippingPlanes
      }),
      headerCeramic: new THREE.MeshPhysicalMaterial({
        color: isThermal ? 0xef4444 : isDrawing ? 0x2b4f75 : 0x9ca3af,
        roughness: 0.25,
        metalness: 0.85,
        wireframe: isWire,
        transparent: isGhost || !isIsolated('all'),
        opacity: isGhost ? 0.25 : getAlpha('all'),
        clippingPlanes: activeClippingPlanes
      }),
      damperTiming: new THREE.MeshStandardMaterial({
        map: textures.harmonicTimingTape,
        roughness: 0.35,
        metalness: 0.45,
        wireframe: isWire,
        transparent: !isIsolated('rotating'),
        opacity: getAlpha('rotating')
      }),
      ignitionRed: new THREE.MeshStandardMaterial({
        color: 0xd92626,
        roughness: 0.35,
        metalness: 0.25,
        wireframe: isWire,
        transparent: !isIsolated('ignition'),
        opacity: getAlpha('ignition')
      }),
      sparkPlugWhite: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.12,
        metalness: 0.08,
        wireframe: isWire,
        transparent: !isIsolated('ignition'),
        opacity: getAlpha('ignition')
      }),
      oilPumpBronze: new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.34,
        metalness: 0.82,
        wireframe: isWire,
        transparent: !isIsolated('lubrication'),
        opacity: getAlpha('lubrication')
      }),
      filterBlue: new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        roughness: 0.28,
        metalness: 0.5,
        wireframe: isWire,
        transparent: !isIsolated('lubrication'),
        opacity: getAlpha('lubrication')
      }),
      coolingAlum: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.38,
        metalness: 0.65,
        wireframe: isWire,
        transparent: !isIsolated('cooling'),
        opacity: getAlpha('cooling')
      }),
      beltsBlack: new THREE.MeshStandardMaterial({
        color: 0x14171a,
        roughness: 0.85,
        metalness: 0.05,
        wireframe: isWire,
        transparent: !isIsolated('cooling'),
        opacity: getAlpha('cooling')
      }),
      fuelBlueAnodized: new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.2,
        metalness: 0.88,
        wireframe: isWire,
        transparent: !isIsolated('fuel'),
        opacity: getAlpha('fuel')
      }),
      starterDark: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.82,
        wireframe: isWire,
        transparent: !isIsolated('starter'),
        opacity: getAlpha('starter')
      }),
      techEdgeLine: new THREE.LineBasicMaterial({
        color: isIsoPaper ? 0x1e293b : 0x38bdf8,
        transparent: true,
        opacity: isIsoPaper ? 0.72 : isDrawing ? 0.92 : 0.45
      }),
      billetAlum: new THREE.MeshPhysicalMaterial({
        color: isStress ? 0x3b82f6 : isThermal ? 0xfb923c : isDrawing ? 0x24466b : 0xdbe2e9,
        map: isDrawing || analysisMode !== 'none' ? null : textures.machinedSwirl,
        normalMap: isDrawing || analysisMode !== 'none' ? null : textures.machinedNormal,
        normalScale: new THREE.Vector2(0.38, 0.38),
        roughness: 0.20,
        metalness: 0.88,
        anisotropy: 0.6,
        wireframe: isWire,
        transparent: isGhost || !isIsolated('valvetrain'),
        opacity: isGhost ? 0.30 : getAlpha('valvetrain'),
        clippingPlanes: activeClippingPlanes
      }),
      carbGoldZinc: new THREE.MeshPhysicalMaterial({
        color: isDrawing ? 0x3b6998 : 0xc9a24b,
        roughness: 0.28,
        metalness: 0.82,
        wireframe: isWire,
        transparent: isGhost || !isIsolated('fuel'),
        opacity: isGhost ? 0.32 : isIsolated('all') ? 1.0 : getAlpha('fuel')
      }),
      copperWinding: new THREE.MeshStandardMaterial({
        color: 0xc26d27,
        roughness: 0.26,
        metalness: 0.88,
        wireframe: isWire
      }),
      braidedStainless: new THREE.MeshStandardMaterial({
        map: textures.braidedSteelMap,
        color: 0xe2e8f0,
        roughness: 0.36,
        metalness: 0.72,
        wireframe: isWire
      }),
      coilBlue: new THREE.MeshPhysicalMaterial({
        color: 0x1d4ed8,
        roughness: 0.26,
        metalness: 0.58,
        clearcoat: 0.45,
        wireframe: isWire,
        transparent: !isIsolated('ignition'),
        opacity: getAlpha('ignition')
      }),
      chassisBlack: new THREE.MeshStandardMaterial({
        color: isDrawing ? 0x1b3452 : 0x1a1e24,
        roughness: 0.48,
        metalness: 0.48,
        wireframe: isWire,
        transparent: isGhost,
        opacity: isGhost ? 0.35 : 1.0
      }),
      anodizedBlack: new THREE.MeshStandardMaterial({
        color: 0x181c22,
        roughness: 0.30,
        metalness: 0.76,
        wireframe: isWire
      }),
      anRed: new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.24,
        metalness: 0.84,
        wireframe: isWire
      }),
      radiatorFin: new THREE.MeshStandardMaterial({
        map: textures.radiatorCoreMap,
        color: 0xd8dee6,
        roughness: 0.38,
        metalness: 0.76,
        wireframe: isWire
      }),
      oilPanCoat: new THREE.MeshStandardMaterial({
        color: isDrawing ? 0x162a45 : 0xd83b01,
        roughness: 0.46,
        metalness: 0.35,
        wireframe: isWire,
        transparent: isGhost || !isIsolated('lubrication'),
        opacity: isGhost ? 0.28 : isIsolated('all') ? 1.0 : getAlpha('lubrication'),
        clippingPlanes: activeClippingPlanes
      }),
      timingCoverAlum: new THREE.MeshPhysicalMaterial({
        color: isDrawing ? 0x1f3b5c : 0xd2d9e1,
        map: isDrawing || analysisMode !== 'none' ? null : textures.machinedSwirl,
        normalMap: isDrawing || analysisMode !== 'none' ? null : textures.machinedNormal,
        normalScale: new THREE.Vector2(0.42, 0.42),
        roughness: 0.24,
        metalness: 0.86,
        anisotropy: 0.5,
        wireframe: isWire,
        transparent: isGhost || !isIsolated('all'),
        opacity: isGhost ? 0.28 : getAlpha('all'),
        clippingPlanes: activeClippingPlanes
      })
    };

    const engineGroup = new THREE.Group();
    const parts: Record<string, THREE.Object3D> = {};

    // Real-World Scaled Kinematic Constants (1 scene unit ≈ 1.48 inches on engine centerline)
    const crankCenterY = -1.0;
    const boreRadius = (config.bore / 4.000) * 1.02;
    const crankRadius = (config.stroke / 3.480) * 0.64;
    const scaledRodLen = crankRadius * (config.rodLength / (config.stroke * 0.5));
    const journalZ = [-3.9, -1.3, 1.3, 3.9];
    const crankPhases = [0, Math.PI / 2, (3 * Math.PI) / 2, Math.PI];

    // =========================================================================
    // 1. CAST-IRON 90° V8 BLOCK CASTING, 4-BOLT SPLAYED MAIN CAPS & BORES
    // =========================================================================
    const blockGroup = new THREE.Group();

    const blockCasting = new THREE.Mesh(createV8BlockProfileGeometry(11.4), mats.chevyBlock);
    blockCasting.position.y = -0.2;
    blockCasting.castShadow = true;
    blockCasting.receiveShadow = true;
    blockCasting.userData = {
      name: 'SBC 350 Cast-Iron 4-Bolt Main Block (GM 10243880)',
      category: 'Engine Block',
      desc: `90° V8 sand-cast iron block. Deck height: ${config.deckHeight.toFixed(3)}" | Bore: ${config.bore.toFixed(3)}" | Quench: ${specs.quenchDistance}".`,
      torque: 'Main Caps: 70 ft-lbs (inner) / 65 ft-lbs (splayed outer)',
      partNumber: 'GM-10243880'
    };
    blockGroup.add(blockCasting);

    // 5 Splayed 4-Bolt Main Bearing Caps
    for (let m = 0; m < 5; m++) {
      const capZ = -5.2 + m * 2.6;
      const capBridge = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.15, 0.85), mats.machinedDeck);
      capBridge.position.set(0, -1.85, capZ);
      blockGroup.add(capBridge);

      // Inner vertical & splayed outer ARP main bolts
      [-0.85, 0.85].forEach((xOff) => {
        const innerBolt = createARP12PointBolt(0.11, 1.2, mats.arpBlackOxide);
        innerBolt.position.set(xOff, -2.42, capZ);
        innerBolt.rotation.x = Math.PI;
        blockGroup.add(innerBolt);
      });
      [-1.42, 1.42].forEach((xOff, i) => {
        const splayedBolt = createARP12PointBolt(0.10, 1.25, mats.arpBlackOxide);
        splayedBolt.position.set(xOff, -2.35, capZ);
        splayedBolt.rotation.z = i === 0 ? -0.28 : 0.28;
        splayedBolt.rotation.x = Math.PI;
        blockGroup.add(splayedBolt);
      });
    }

    // 8 Plateau-Honed Cylinder Bore Sleeves & Brass Freeze Plugs
    [-1, 1].forEach((side) => {
      // 3 Brass Core Freeze Plugs along outer block skirt
      [-3.5, 0, 3.5].forEach((zPlug) => {
        const freezePlug = new THREE.Mesh(
          new THREE.CylinderGeometry(0.46, 0.44, 0.16, 20),
          mats.brassBronze
        );
        freezePlug.rotation.z = Math.PI / 2;
        freezePlug.position.set(side * 3.35, -0.45, zPlug);
        freezePlug.userData = {
          name: '1-5/8" Brass Core Freeze Plug',
          category: 'Engine Block',
          desc: 'Deep-cup brass expansion core plug sealed with Permatex #2.'
        };
        blockGroup.add(freezePlug);
      });

      // Honed Cylinder Sleeves + Deck Fire Ring
      for (let c = 0; c < 4; c++) {
        const zOff = journalZ[c] + (side === 1 ? 0.22 : -0.22);
        const bankRot = -side * (Math.PI / 4);
        const sleeve = new THREE.Mesh(
          new THREE.CylinderGeometry(boreRadius + 0.04, boreRadius + 0.04, 2.75, 28, 1, true),
          mats.sleeveBore
        );
        const midDist = 2.05;
        sleeve.position.set(
          -Math.sin(bankRot) * midDist,
          crankCenterY + Math.cos(bankRot) * midDist,
          zOff
        );
        sleeve.rotation.z = bankRot;
        blockGroup.add(sleeve);
      }

      // Machined Cylinder Deck Plane + Fel-Pro 1003 (.039") Copper/Composite Head Gasket
      const bankRot = -side * (Math.PI / 4);
      const deckDist = 3.22;
      const deckPlate = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.14, 11.4),
        mats.machinedDeck
      );
      deckPlate.position.set(
        -Math.sin(bankRot) * deckDist,
        crankCenterY + Math.cos(bankRot) * deckDist,
        0
      );
      deckPlate.rotation.z = bankRot;
      blockGroup.add(deckPlate);

      const headGasket = new THREE.Mesh(
        new THREE.BoxGeometry(3.15, 0.07, 11.35),
        mats.felProCopper
      );
      headGasket.position.set(
        -Math.sin(bankRot) * (deckDist + 0.11),
        crankCenterY + Math.cos(bankRot) * (deckDist + 0.11),
        0
      );
      headGasket.rotation.z = bankRot;
      headGasket.userData = {
        name: `Fel-Pro 1003 Head Gasket (${config.gasketThickness.toFixed(3)}" Compressed)`,
        category: 'Sealing & Quench',
        desc: `Pre-flattened copper wire ring armor. Contributes ${specs.gasketVolumeCc}cc to clearance volume; sets total quench to ${specs.quenchDistance}".`,
        partNumber: 'FEL-1003'
      };
      blockGroup.add(headGasket);

      // 3-Bolt Motor Mount Casting Boss on SBC Block Side
      const mountBoss = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.82, 1.35),
        mats.chevyBlock
      );
      mountBoss.position.set(side * 3.15, -1.35, 0.55);
      blockGroup.add(mountBoss);

      // Hollow Deck Alignment Dowel Pins (front & rear deck corners)
      [-4.95, 4.95].forEach((dZ) => {
        const dowel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.24, 14, 1, true),
          mats.machinedInternal
        );
        dowel.position.set(
          -Math.sin(bankRot) * (deckDist + 0.08) + Math.cos(bankRot) * (side * 1.15),
          crankCenterY + Math.cos(bankRot) * (deckDist + 0.08) + Math.sin(bankRot) * (side * 1.15),
          dZ
        );
        dowel.rotation.z = bankRot;
        blockGroup.add(dowel);
      });
    });

    // Dura-Bond Cam Tunnel Babbit Bearings + Front/Rear 1/4" NPT Brass Oil Gallery Plugs
    for (let m = 0; m < 5; m++) {
      const camBearing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.46, 20, 1, true),
        mats.brassBronze
      );
      camBearing.rotation.x = Math.PI / 2;
      camBearing.position.set(0, 1.05, -5.2 + m * 2.6);
      blockGroup.add(camBearing);
    }
    [-5.72, 5.72].forEach((endZ) => {
      [-0.72, 0.72].forEach((px) => {
        const nptPlug = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.16, 6),
          mats.brassBronze
        );
        nptPlug.rotation.x = Math.PI / 2;
        nptPlug.position.set(px, 1.05, endZ);
        nptPlug.userData = {
          name: '1/4" NPT Brass Oil Gallery Plug',
          category: 'Lubrication',
          desc: 'Tapered pipe plug with 0.030" front-timing-chain splash orifice for main oil gallery.'
        };
        blockGroup.add(nptPlug);
      });
    });

    engineGroup.add(blockGroup);
    parts.block = blockGroup;

    // 1B. FRONT ALUMINUM TIMING CHAIN COVER + CRANK SEAL + TIMING POINTER
    const timingCoverGroup = createTimingCoverGroup(
      mats.timingCoverAlum,
      mats.beltsBlack,
      mats.arpBlackOxide,
      mats.chromePolish
    );
    timingCoverGroup.position.set(0, 0, 6.28);
    timingCoverGroup.userData = {
      name: 'Billet Aluminum Timing Chain Cover & TDC Pointer',
      category: 'Engine Block',
      desc: 'CNC machined aluminum front timing cover with Viton front crank seal and adjustable 0° TDC timing pointer.',
      torque: 'Timing Cover Bolts: 12 ft-lbs',
      partNumber: 'SUM-G6320'
    };
    engineGroup.add(timingCoverGroup);
    parts.timingCover = timingCoverGroup;

    // 1C. DEEP-SUMP OIL PAN, GASKET RAIL, MAGNETIC DRAIN PLUG & DIPSTICK TUBE
    const oilPanGroup = createDetailedOilPanGroup(
      mats.oilPanCoat,
      mats.anodizedBlack,
      mats.arpBlackOxide,
      mats.brassBronze,
      mats.chromePolish,
      mats.valveSpringsGold
    );
    oilPanGroup.userData = {
      name: 'SBC 6-Quart Deep-Sump Baffled Oil Pan & Dipstick',
      category: 'Lubrication',
      desc: 'Baffled performance sump with 3/8" pickup clearance, magnetic drain plug, and chrome dipstick tube.',
      torque: 'Oil Pan Rail Bolts: 12 ft-lbs (corner nuts 15 ft-lbs)',
      partNumber: 'MIL-30900'
    };
    engineGroup.add(oilPanGroup);
    parts.oilPan = oilPanGroup;

    // =========================================================================
    // 2. CROSS-PLANE 4340 FORGED CRANKSHAFT, COUNTERWEIGHTS, DAMPER & FLEXPLATE
    // =========================================================================
    const crankGroup = new THREE.Group();
    crankGroup.position.set(0, crankCenterY, 0);

    // 5 Main Journals (2.450" diameter scaled) + Thrust Flanges + Splined Snout + Rear Flange
    for (let m = 0; m < 5; m++) {
      const mz = -5.2 + m * 2.6;
      const mj = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.56, 0.88, 24),
        mats.crankForged
      );
      mj.rotation.x = Math.PI / 2;
      mj.position.z = mz;
      crankGroup.add(mj);

      // Rear Main #5 Thrust Bearing Flange Cheeks
      if (m === 0) {
        [-0.44, 0.44].forEach((tz) => {
          const thrustCheek = new THREE.Mesh(
            new THREE.CylinderGeometry(0.84, 0.84, 0.07, 24),
            mats.machinedInternal
          );
          thrustCheek.rotation.x = Math.PI / 2;
          thrustCheek.position.z = mz + tz;
          crankGroup.add(thrustCheek);
        });
      }
    }

    const frontSnout = new THREE.Mesh(
      createSplineShaftGeometry(0.44, 2.2, 18),
      mats.crankForged
    );
    frontSnout.position.z = 6.32;
    crankGroup.add(frontSnout);

    // 3/16" Hardened Woodruff Keyway Bar on Crank Snout
    const keyway = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.35), mats.arpBlackOxide);
    keyway.position.set(0, 0.44, 6.25);
    crankGroup.add(keyway);

    // Rear Crank Flange Hub + Oilite Bronze Pilot Bushing + 6 ARP Flexplate Bolts
    const rearHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 0.36, 26),
      mats.crankForged
    );
    rearHub.rotation.x = Math.PI / 2;
    rearHub.position.z = -5.78;
    crankGroup.add(rearHub);

    const pilotBushing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.29, 0.38, 16, 1, true),
      mats.brassBronze
    );
    pilotBushing.rotation.x = Math.PI / 2;
    pilotBushing.position.z = -5.92;
    crankGroup.add(pilotBushing);

    for (let fb = 0; fb < 6; fb++) {
      const a = (fb / 6) * Math.PI * 2;
      const fpBolt = createARP12PointBolt(0.08, 0.30, mats.arpBlackOxide);
      fpBolt.rotation.x = -Math.PI / 2;
      fpBolt.position.set(Math.cos(a) * 0.66, Math.sin(a) * 0.66, -6.16);
      crankGroup.add(fpBolt);
    }

    // 4 Offset Rod Journals (2.100" diameter) + Cross-Drilled Oil Holes + 8 Counterweights
    const cwGeo = createCounterweightGeometry(1.55, 0.36);
    journalZ.forEach((zPin, idx) => {
      const phase = crankPhases[idx];
      const px = crankRadius * Math.sin(phase);
      const py = crankRadius * Math.cos(phase);

      const rodJournal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.44, 0.44, 1.15, 24),
        mats.crankForged
      );
      rodJournal.rotation.x = Math.PI / 2;
      rodJournal.position.set(px, py, zPin);
      rodJournal.userData = {
        name: `Scat 4340 Forged Crankshaft (Throw #${idx + 1})`,
        category: 'Rotating Assembly',
        desc: `Stroke: ${config.stroke.toFixed(3)}" | 2.450" Mains / 2.100" Rod Journals | Cross-plane 90° throw phasing.`,
        torque: 'Harmonic Damper Bolt: 85 ft-lbs | Flexplate Bolts: 65 ft-lbs',
        partNumber: 'SCA-43500'
      };
      crankGroup.add(rodJournal);

      // Chamfered Cross-Drilled Rod Journal Oil Feed Ports (twin paired throws)
      [-0.22, 0.22].forEach((oz) => {
        const oilPort = new THREE.Mesh(
          new THREE.CylinderGeometry(0.065, 0.065, 0.91, 10),
          mats.anodizedBlack
        );
        oilPort.position.set(px, py, zPin + oz);
        oilPort.rotation.z = -phase + 0.45;
        crankGroup.add(oilPort);
      });

      // Pair of teardrop counterweights flanking each throw (unclipped internal steel)
      [-0.78, 0.78].forEach((zOff) => {
        const cw = new THREE.Mesh(cwGeo, mats.machinedInternal);
        cw.position.z = zPin + zOff;
        cw.rotation.z = -phase;
        const drill = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.4, 12),
          mats.arpBlackOxide
        );
        drill.rotation.x = Math.PI / 2;
        drill.position.set(0.42, -1.05, 0);
        cw.add(drill);

        if (idx === 0 || idx === 3) {
          const malloryPlug = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, 0.39, 14),
            mats.brassBronze
          );
          malloryPlug.rotation.x = Math.PI / 2;
          malloryPlug.position.set(-0.36, -1.08, 0);
          cw.add(malloryPlug);
        }
        crankGroup.add(cw);
      });
    });

    // Crank Timing Sprocket (22 Teeth)
    const crankSprocket = new THREE.Mesh(
      createGearGeometry(0.68, 22, 0.38, 0.35, 0.12),
      mats.arpBlackOxide
    );
    crankSprocket.position.z = 5.95;
    crankSprocket.userData = {
      name: 'Billet Steel Double-Roller Crank Sprocket',
      category: 'Timing Drive',
      desc: '9-keyway adjustable billet timing gear with 2:1 ratio to camshaft.',
      partNumber: 'CLY-9-1100'
    };
    crankGroup.add(crankSprocket);

    // SFI Harmonic Damper / Balancer with 360° Timing Tape
    const damperHub = new THREE.Mesh(
      new THREE.CylinderGeometry(1.42, 1.42, 0.88, 32),
      mats.damperTiming
    );
    damperHub.rotation.x = Math.PI / 2;
    damperHub.position.z = 6.90;
    damperHub.userData = {
      name: 'ATI Super Damper SFI 18.1 Harmonic Balancer',
      category: 'Rotating Assembly',
      desc: `6.78" OD elastomer inertia ring with engraved timing scale (Target timing: ${config.ignitionTiming}° BTDC).`,
      torque: 'Crank Snout ARP Bolt: 85 ft-lbs',
      partNumber: 'ATI-917781'
    };
    crankGroup.add(damperHub);

    // Rear 168-Tooth SFI Flexplate / Flywheel Ring Gear
    const flexplate = new THREE.Mesh(
      createGearGeometry(2.65, 64, 0.24, 0.55, 0.11),
      mats.machinedInternal
    );
    flexplate.position.z = -6.05;
    flexplate.userData = {
      name: '168-Tooth SFI 29.1 Forged Flexplate / Flywheel',
      category: 'Driveline Interface',
      desc: '14.13" OD 168-tooth starter ring gear, internal neutral balance.',
      torque: 'ARP Flywheel Bolts: 74 ft-lbs w/ Red Loctite',
      partNumber: 'TCI-399173'
    };
    crankGroup.add(flexplate);

    // 60-2 Billet Crankshaft Trigger Reluctor Wheel (Shown behind pulley in MPFI+CNP mode)
    if (inductionDress === 'mpfi_cnp') {
      const triggerWheel = new THREE.Mesh(
        createCrankTriggerWheelGeometry(1.62, 60, 2, 0.18, 0.65),
        mats.machinedInternal
      );
      triggerWheel.position.z = 7.36;
      triggerWheel.userData = {
        name: '60-2 CNC Billet Crank Trigger Reluctor Wheel',
        category: 'Ignition & Timing',
        desc: '60-tooth precision crank wheel with 2-tooth missing TDC index gap for sequential EFI & coil-near-plug timing.',
        torque: 'Damper Center Bolt: 85 ft-lbs',
        partNumber: 'HOL-556-112'
      };
      crankGroup.add(triggerWheel);
    }

    engineGroup.add(crankGroup);
    parts.crank = crankGroup;

    // =========================================================================
    // 3. TRUE ARTICULATING 5.700" H-BEAM RODS, PISTONS & 3-RING PACKS
    // =========================================================================
    const rotatingGroup = new THREE.Group();
    const pistonNodes: Array<{
      bankRot: number;
      pinPhase: number;
      rodGroup: THREE.Group;
      pistonAsm: THREE.Group;
    }> = [];

    for (let p = 0; p < 8; p++) {
      const isRight = p % 2 === 1; // Odd = 2,4,6,8 (Right Bank); Even = 1,3,5,7 (Left Bank)
      const bankSign = isRight ? 1 : -1;
      const bankRot = -bankSign * (Math.PI / 4);
      const journalIdx = Math.floor(p / 2);
      const zPos = journalZ[journalIdx] + (isRight ? 0.22 : -0.22);
      const pinPhase = crankPhases[journalIdx];

      // Bank-local kinematic carrier centered on crankshaft centerline at cylinder Z
      const bankCarrier = new THREE.Group();
      bankCarrier.position.set(0, crankCenterY, zPos);
      bankCarrier.rotation.z = bankRot;

      // Connecting Rod (origin at big-end crankpin)
      const rodGroup = createHBeamConnectingRod(
        scaledRodLen,
        0.44,
        0.22,
        mats.rods4340,
        mats.brassBronze,
        mats.arpBlackOxide
      );
      rodGroup.userData = {
        name: `Connecting Rod #${p + 1} (Ray's ${config.rodLength.toFixed(3)}" Spec)`,
        category: 'Connecting Rods',
        desc: `Scat 4340 Forged H-Beam ${config.rodLength.toFixed(3)}" C-to-C | Rod/Stroke ratio: ${specs.rodStrokeRatio}:1 | Max angle: ${specs.maxRodAngleDeg}°.`,
        torque: 'ARP 2000 Rod Bolts: 45 ft-lbs (0.0058" - 0.0062" stretch)',
        partNumber: 'SCA-25700'
      };
      bankCarrier.add(rodGroup);

      // Forged Slipper-Skirt Piston + 3-Piece Oil/Compression Ring Pack + Hollow Wrist Pin & Spiralox Clips
      const pistonAsm = new THREE.Group();
      const detailedPiston = createDetailedPistonAssembly(
        boreRadius,
        mats.pistonsAlloy,
        mats.anodizedBlack,
        mats.chromePolish,
        mats.arpBlackOxide,
        mats.brassBronze,
        mats.wristPins,
        mats.arpBlackOxide
      );
      // Scale Y to match SBC compression height & align wrist pin centerline directly onto rod small-end eye (y=0)
      detailedPiston.scale.set(1, 0.58, 1);
      detailedPiston.position.y = 0.16;
      pistonAsm.add(detailedPiston);
      pistonAsm.userData = {
        name: `Forged Piston #${p + 1} (${config.pistonAlloy.toUpperCase()} Alloy)`,
        category: 'Rotating Assembly',
        desc: `Bore: ${config.bore.toFixed(3)}" | ${config.pistonReliefCc.toFixed(1)}cc 4-eyebrow flat top | PTFE moly skirts | PTW: ${specs.ptwClearance} | Rings: ${specs.topRingGap}"/${specs.secondRingGap}"/${specs.oilRingGap}".`,
        partNumber: 'KB-115-000'
      };

      bankCarrier.add(pistonAsm);
      rotatingGroup.add(bankCarrier);

      pistonNodes.push({ bankRot, pinPhase, rodGroup, pistonAsm });
    }
    engineGroup.add(rotatingGroup);
    parts.rotating = rotatingGroup;

    // =========================================================================
    // 4. DOUBLE-ROLLER TIMING DRIVE, CAMSHAFT, DISTRIBUTOR DRIVE, LIFTERS & PUSHRODS
    // =========================================================================
    const camGroup = new THREE.Group();
    const camY = 1.05;

    const camCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 11.8, 18),
      mats.rods4340
    );
    camCore.rotation.x = Math.PI / 2;
    camCore.position.set(0, camY, 0.2);
    camCore.userData = {
      name: `Hydraulic Roller Camshaft (${specs.camData.name})`,
      category: 'Valvetrain',
      desc: `Intake: ${specs.camData.intakeDur050}° | Exh: ${specs.camData.exhDur050}° @ .050" | Lobe Lift: ${specs.camData.lobeLift}" | IVC: ${specs.camData.ivcDeg}° ABDC.`,
      partNumber: 'CCA-CL12-422-8'
    };
    camGroup.add(camCore);

    // Rear Camshaft Distributor & Oil-Pump Drive Bevel Gear (at z = -4.85)
    const camDistGear = new THREE.Mesh(
      createGearGeometry(0.56, 14, 0.38, 0.36, 0.10),
      mats.brassBronze
    );
    camDistGear.position.set(0, camY, -4.85);
    camDistGear.userData = {
      name: 'Bronze Distributor & Oil Pump Drive Gear',
      category: 'Ignition & Lubrication',
      desc: 'Wear-matched aluminum-bronze gear driving HEI distributor shaft & Melling M-55HV oil pump hex shaft 1:1 with cam.'
    };
    camGroup.add(camDistGear);

    // 44-Tooth Cam Timing Sprocket (2:1 exact ratio to 22-tooth crank sprocket) + 3 ARP Cam Bolts
    const camSprocket = new THREE.Mesh(
      createGearGeometry(1.36, 44, 0.38, 0.36, 0.12),
      mats.arpBlackOxide
    );
    camSprocket.position.set(0, camY, 5.95);
    for (let cb = 0; cb < 3; cb++) {
      const a = (cb / 3) * Math.PI * 2;
      const cBolt = createARP12PointBolt(0.07, 0.22, mats.chromePolish);
      cBolt.rotation.x = Math.PI / 2;
      cBolt.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.22);
      camSprocket.add(cBolt);
    }
    camSprocket.userData = {
      name: 'Cloyes Billet Double-Roller Cam Sprocket',
      category: 'Timing Drive',
      desc: '44-tooth CNC induction-hardened cam gear driven at 0.5x crank speed with 3-bolt ARP retention.',
      torque: 'Cam Bolts: 25 ft-lbs w/ Loctite',
      partNumber: 'CLY-9-1100'
    };
    camGroup.add(camSprocket);

    // Double-Roller Timing Chain Loop connecting Crank (0, -1.0) & Cam (0, 1.05)
    const chainPoints: THREE.Vector3[] = [];
    const chainZ = 5.95;
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI;
      chainPoints.push(new THREE.Vector3(Math.cos(a) * 1.42, camY + Math.sin(a) * 1.42, chainZ));
    }
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + (i / 16) * Math.PI;
      chainPoints.push(new THREE.Vector3(Math.cos(a) * 0.74, crankCenterY + Math.sin(a) * 0.74, chainZ));
    }
    const chainCurve = new THREE.CatmullRomCurve3(chainPoints, true);
    const timingChain = new THREE.Mesh(
      new THREE.TubeGeometry(chainCurve, 48, 0.14, 8, true),
      mats.crankForged
    );
    timingChain.userData = {
      name: 'True-Roller Double Timing Chain',
      category: 'Timing Drive',
      desc: '0.250" solid roller pre-stretched timing chain linking crank & cam 2:1.'
    };
    camGroup.add(timingChain);

    // =========================================================================
    // 5. CYLINDER HEADS, REAL PUSHROD VALVETRAIN (E-I-I-E), STUD GIRDLE & HOLLOW COVERS
    // =========================================================================
    const headsGroup = new THREE.Group();
    const headShape = new THREE.Shape();
    headShape.moveTo(-1.55, -1.05);
    headShape.lineTo(1.55, -1.05);
    headShape.lineTo(1.55, 0.72);
    headShape.lineTo(0.82, 1.12);
    headShape.lineTo(-0.92, 1.12);
    headShape.lineTo(-1.55, 0.55);
    headShape.closePath();

    const headGeo = new THREE.ExtrudeGeometry(headShape, {
      depth: 11.4,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 2
    });
    headGeo.translate(0, 0, -5.7);

    const lobeGeo = createCamLobeGeometry(0.42, 0.28, 0.30);
    const springGeo = createHelicalSpringGeometry(0.28, 0.055, 0.88, 6);
    const valvetrainNodes: Array<{
      lobe: THREE.Mesh;
      lifter: THREE.Mesh;
      pushrod: THREE.Mesh;
      pushrodBasePos: THREE.Vector3;
      pushrodAxis: THREE.Vector3;
      valve: THREE.Mesh;
      retainer: THREE.Mesh;
      spring: THREE.Mesh;
      rocker: THREE.Group;
      baseLifterPos: THREE.Vector3;
      lifterAxis: THREE.Vector3;
      baseValvePos: THREE.Vector3;
      baseRetainerPos: THREE.Vector3;
      valveAxis: THREE.Vector3;
      offset: number;
      lSide: number;
    }> = [];

    // SBC 1-8-4-3-6-5-7-2 firing angle per cylinder (indexed by side & journal 0..3)
    const cylFireDegLeft = [0, 270, 450, 540];   // Cyl 1, 3, 5, 7
    const cylFireDegRight = [90, 180, 360, 630]; // Cyl 2, 4, 6, 8
    const upVec = new THREE.Vector3(0, 1, 0);

    [-1, 1].forEach((side) => {
      const headSub = new THREE.Group();
      const bankRot = -side * (Math.PI / 4);
      const headDist = 4.45;
      const headOrigin = new THREE.Vector3(
        -Math.sin(bankRot) * headDist,
        crankCenterY + Math.cos(bankRot) * headDist,
        0
      );
      headSub.position.copy(headOrigin);
      headSub.rotation.z = bankRot;

      const headMesh = new THREE.Mesh(headGeo, mats.aluminumHeads);
      headMesh.castShadow = true;
      headMesh.userData = {
        name: `23° CNC Aluminum Cylinder Head (${side === 1 ? 'Right / Pass' : 'Left / Driver'})`,
        category: 'Cylinder Heads',
        desc: `4.400" Bore Spacing | Chamber: ${config.chamberCc.toFixed(1)}cc | 2.02" Intake / 1.60" Exhaust (E-I-I-E-E-I-I-E) | Static CR: ${specs.staticCR}:1.`,
        torque: '17 Head Bolts: 25 ➔ 45 ➔ 70 ft-lbs (w/ thread sealant)',
        partNumber: 'EDL-5089'
      };
      headSub.add(headMesh);

      // Rectangular CNC Port Openings & Integrated Spark Plug Wells scaled dynamically by port & valve mods
      const intPortScale3D = Math.sqrt((config.intakePortCc ?? 185) / 185);
      const exhPortScale3D = Math.sqrt((config.exhaustPortCc ?? 68) / 68);
      const exhShapeMode = config.exhaustPortShape || 'd_port';
      const exhRaisedOffset = exhShapeMode === 'raised_runner' || exhShapeMode === 'cnc_race' ? 0.12 : 0;

      for (let portIdx = 0; portIdx < 4; portIdx++) {
        const pZ = journalZ[portIdx] + (side === 1 ? 0.22 : -0.22);
        const exhPocket = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.72 * exhPortScale3D, 0.92 * exhPortScale3D),
          mats.anodizedBlack
        );
        exhPocket.position.set(side * 1.50, -0.15 + exhRaisedOffset, pZ);
        headSub.add(exhPocket);

        const intPocket = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.85 * intPortScale3D, 0.96 * intPortScale3D),
          mats.anodizedBlack
        );
        intPocket.position.set(-side * 1.50, -0.05, pZ);
        headSub.add(intPocket);

        const plugWell = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.42, 16),
          mats.machinedInternal
        );
        plugWell.rotation.z = -side * 0.58;
        plugWell.position.set(side * 1.38, 0.58, pZ + 0.32);
        headSub.add(plugWell);
      }

      // Authentic 17-Bolt SBC Fastener Layout (9 intake-side + 8 exhaust-side bolts)
      for (let b = 0; b < 9; b++) {
        const bZ = -4.95 + b * 1.24;
        const topBolt = createARP12PointBolt(0.11, 1.35, mats.arpBlackOxide);
        topBolt.position.set(-side * 1.15, 0.95, bZ);
        headSub.add(topBolt);
      }
      for (let b = 0; b < 8; b++) {
        const bZ = -4.35 + b * 1.24;
        const botBolt = createARP12PointBolt(0.11, 1.15, mats.arpBlackOxide);
        botBolt.position.set(side * 1.22, 0.72, bZ);
        headSub.add(botBolt);
      }

      // Blue Anodized Billet Stud Girdle / Shaft Rocker Bar inside Hollow Valve Cover
      const studGirdle = createStudGirdleBarGroup(mats.billetRockersBlue, mats.valvesSteel);
      studGirdle.position.set(-side * 0.22, 1.82, side * 0.22);
      studGirdle.userData = {
        name: `Anodized Blue Billet Stud Girdle (${side === 1 ? 'Right' : 'Left'} Bank)`,
        category: 'Valvetrain',
        desc: `7075-T6 CNC shaft-mounted stud girdle clamping 7/16" ARP rocker studs and locking ${config.rockerRatio}:1 valve lash.`
      };
      headSub.add(studGirdle);

      // 8 Cylinder-Aligned Valvetrain Assemblies per Bank (E-I-I-E-E-I-I-E)
      // Valves, Springs, Retainers & Rockers sit inside headSub; Cam Lobes, Lifters & Pushrods connect from camGroup!
      const valveAxisHead = new THREE.Vector3(side * Math.sin(0.14), Math.cos(0.14), 0).normalize();
      const headRotQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bankRot);

      for (let jIdx = 0; jIdx < 4; jIdx++) {
        const cylZ = journalZ[jIdx] + (side === 1 ? 0.22 : -0.22);
        const cylNum = side === -1 ? jIdx * 2 + 1 : jIdx * 2 + 2;
        const fireDeg = side === -1 ? cylFireDegLeft[jIdx] : cylFireDegRight[jIdx];

        for (let vIdx = 0; vIdx < 2; vIdx++) {
          const isIntake = jIdx % 2 === 0 ? vIdx === 1 : vIdx === 0;
          const valveZ = cylZ + (vIdx === 0 ? -0.34 : 0.34);
          const camOffset = -((fireDeg * 0.5) * Math.PI) / 180 + (isIntake ? 0.35 : -1.45);

          // 1. Valve sized dynamically by config.intakeValveIn / config.exhaustValveIn
          const intValveInVal = config.intakeValveIn ?? 2.02;
          const exhValveInVal = config.exhaustValveIn ?? 1.60;
          const valveHeadRad = isIntake
            ? (intValveInVal / 2.02) * 0.42
            : (exhValveInVal / 1.60) * 0.34;
          const valve = new THREE.Mesh(
            new THREE.CylinderGeometry(0.072, valveHeadRad, 2.15, 16),
            mats.valvesSteel
          );
          const baseValvePos = new THREE.Vector3(side * 0.11, 0.38, valveZ);
          valve.position.copy(baseValvePos);
          valve.rotation.z = -side * 0.14;
          valve.userData = {
            name: `${isIntake ? `${intValveInVal.toFixed(2)}" Intake` : `${exhValveInVal.toFixed(2)}" Exhaust`} Stainless Valve (Cyl #${cylNum})`,
            category: 'Valvetrain',
            desc: `Int Port ${config.intakePortCc ?? 185}cc / Exh Port ${config.exhaustPortCc ?? 68}cc (${exhShapeMode.replace('_', '-').toUpperCase()}) | Net Lift: ${specs.totalValveLift}".`
          };
          headSub.add(valve);

          // 2. Manganese-Bronze Valve Guide + Viton Stem Seal + Helical Beehive Spring + Titanium Retainer & Split 7° Keepers
          const vGuide = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.13, 0.38, 12),
            mats.brassBronze
          );
          vGuide.position.set(side * 0.14, 0.62, valveZ);
          vGuide.rotation.z = -side * 0.14;
          headSub.add(vGuide);

          const vitonSeal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.105, 0.125, 0.12, 12),
            mats.fuelBlueAnodized
          );
          vitonSeal.position.set(side * 0.17, 0.80, valveZ);
          vitonSeal.rotation.z = -side * 0.14;
          headSub.add(vitonSeal);

          const spring = new THREE.Mesh(springGeo, mats.valveSpringsGold);
          spring.position.set(side * 0.20, 0.98, valveZ);
          spring.rotation.z = -side * 0.14;
          headSub.add(spring);

          const retainer = new THREE.Mesh(
            new THREE.CylinderGeometry(0.29, 0.23, 0.11, 16),
            mats.machinedInternal
          );
          const keeperCollar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.085, 0.09, 12),
            mats.arpBlackOxide
          );
          keeperCollar.position.y = 0.05;
          retainer.add(keeperCollar);
          const baseRetainerPos = new THREE.Vector3(side * 0.25, 1.39, valveZ);
          retainer.position.copy(baseRetainerPos);
          retainer.rotation.z = -side * 0.14;
          headSub.add(retainer);

          // 3. Billet Roller Rocker Arm pivoting under Blue Stud Girdle
          const rocker = createRollerRockerGroup(mats.billetRockersBlue, mats.valvesSteel);
          rocker.position.set(-side * 0.22, 1.54, valveZ);
          rocker.scale.x = side;
          rocker.userData = {
            name: `Billet Roller Rocker #${cylNum}${isIntake ? 'I' : 'E'} (${config.rockerRatio}:1)`,
            category: 'Valvetrain',
            desc: `7075-T6 CNC roller rocker stabilized by blue stud girdle | Lift: ${specs.totalValveLift}" | 0.004" hot lash.`,
            partNumber: 'SCP-1024'
          };
          headSub.add(rocker);

          // 4. Camshaft Lobe at exact valveZ
          const lobe = new THREE.Mesh(lobeGeo, mats.machinedInternal);
          lobe.position.set(0, camY, valveZ);
          lobe.rotation.z = camOffset;
          camGroup.add(lobe);

          // 5. Hydraulic/Solid Roller Lifter riding on Cam Lobe along 45° Lifter Bore
          const lifterAxis = new THREE.Vector3(side * Math.SQRT1_2, Math.SQRT1_2, 0).normalize();
          const baseLifterPos = new THREE.Vector3(side * 0.51, 1.56, valveZ);
          const lifter = new THREE.Mesh(
            new THREE.CylinderGeometry(0.20, 0.20, 0.84, 14),
            mats.machinedInternal
          );
          lifter.position.copy(baseLifterPos);
          lifter.rotation.z = -side * (Math.PI / 4);
          lifter.userData = {
            name: `Link-Bar Roller Lifter (Cyl #${cylNum}${isIntake ? 'I' : 'E'})`,
            category: 'Valvetrain',
            desc: '0.842" hardened tool-steel body with needle-bearing roller wheel tracking camshaft lobe.'
          };
          camGroup.add(lifter);

          // 6. Exact 3D Chromoly Pushrod bridging Lifter Cup -> Rocker Pushrod Cup in World Space
          const lifterTopWorld = baseLifterPos.clone().addScaledVector(lifterAxis, 0.40);
          const cupLocalHead = new THREE.Vector3(-side * 0.64, 1.49, valveZ);
          const cupWorld = cupLocalHead.clone().applyQuaternion(headRotQuat).add(headOrigin);
          const pushrodVec = cupWorld.clone().sub(lifterTopWorld);
          const pushrodLen = pushrodVec.length();
          const pushrodDir = pushrodVec.clone().normalize();
          const pushrodBasePos = lifterTopWorld.clone().lerp(cupWorld, 0.5);

          const pushrod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.068, 0.068, pushrodLen, 10),
            mats.crankForged
          );
          pushrod.position.copy(pushrodBasePos);
          pushrod.quaternion.setFromUnitVectors(upVec, pushrodDir);
          pushrod.userData = {
            name: `7.800" Chromoly Pushrod (Cyl #${cylNum}${isIntake ? 'I' : 'E'})`,
            category: 'Valvetrain',
            desc: '5/16" × 0.080" wall 4130 chromoly pushrod linking roller lifter directly to billet roller rocker cup.'
          };
          camGroup.add(pushrod);

          valvetrainNodes.push({
            lobe,
            lifter,
            pushrod,
            pushrodBasePos,
            pushrodAxis: pushrodDir,
            valve,
            retainer,
            spring,
            rocker,
            baseLifterPos,
            lifterAxis,
            baseValvePos,
            baseRetainerPos,
            valveAxis: valveAxisHead,
            offset: camOffset,
            lSide: side
          });
        }
      }

      // Hollow Finned Racing Aluminum Valve Cover (reveals stud girdle, rockers & springs inside on cutaway!)
      const hollowValveCover = createHollowValveCoverGroup(
        side,
        mats.valveCoverBody,
        mats.valveCoverFin,
        mats.arpBlackOxide,
        mats.chromePolish
      );
      hollowValveCover.userData = {
        name: `Hollow Finned Racing Valve Cover (${side === 1 ? 'Right' : 'Left'})`,
        category: 'Valvetrain',
        desc: 'Tall die-cast finned aluminum cover clearing billet roller rockers and blue stud girdle.'
      };
      headSub.add(hollowValveCover);

      // Custom Stainless 4-into-1 Tubular Exhaust Headers + Collector Flanges + Wideband O2
      const headerFlange = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.92, 10.8),
        mats.headerCeramic
      );
      headerFlange.position.set(side * 1.68, -0.15, 0);
      headSub.add(headerFlange);

      for (let hb = 0; hb < 8; hb++) {
        const hbZ = -4.85 + hb * 1.38;
        const hBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 6), mats.arpBlackOxide);
        hBolt.rotation.z = Math.PI / 2;
        hBolt.position.set(side * 1.82, -0.15, hbZ);
        headSub.add(hBolt);
      }

      const headerPrimaryVal = config.headerPrimaryIn ?? 1.625;
      const primaryTubeR = 0.28 * (headerPrimaryVal / 1.625);

      for (let pIdx = 0; pIdx < 4; pIdx++) {
        const portZ = journalZ[pIdx] + (side === 1 ? 0.22 : -0.22);
        const collectorZ = -3.8;
        const primaryCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 1.72, -0.15 + exhRaisedOffset, portZ),
          new THREE.Vector3(side * 3.15, -0.55, portZ * 0.75 - 0.5),
          new THREE.Vector3(side * 3.45, -2.15, (portZ + collectorZ) * 0.5),
          new THREE.Vector3(side * 2.75, -3.55, collectorZ)
        ]);
        const primaryTube = new THREE.Mesh(
          new THREE.TubeGeometry(primaryCurve, 18, primaryTubeR, 10, false),
          mats.headerCeramic
        );
        primaryTube.userData = {
          name: `Custom 304 Stainless 4-into-1 Swept Headers (${headerPrimaryVal.toFixed(3)}" OD)`,
          category: 'Exhaust',
          desc: `Mandrel-bent ${headerPrimaryVal.toFixed(3)}" 304 stainless primaries matched to ${config.exhaustPortCc ?? 68}cc ${exhShapeMode.replace('_', '-').toUpperCase()} exhaust ports.`
        };
        headSub.add(primaryTube);
      }

      const collector = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 2.35, 16),
        mats.headerCeramic
      );
      collector.rotation.x = Math.PI / 2;
      collector.position.set(side * 2.75, -3.55, -4.75);
      headSub.add(collector);

      const colFlange = new THREE.Mesh(
        new THREE.CylinderGeometry(0.86, 0.86, 0.22, 3),
        mats.machinedDeck
      );
      colFlange.rotation.x = Math.PI / 2;
      colFlange.position.set(side * 2.75, -3.55, -5.85);
      headSub.add(colFlange);

      const o2Sensor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.16, 0.65, 8),
        mats.chromePolish
      );
      o2Sensor.position.set(side * 2.75, -3.02, -5.1);
      o2Sensor.userData = {
        name: 'Bosch LSU 4.9 Wideband O2 Sensor',
        category: 'Exhaust & EFI Tuning',
        desc: `Closed-loop AFR feedback targeting ${config.targetAFR}:1 under WOT.`
      };
      headSub.add(o2Sensor);

      headsGroup.add(headSub);
    });

    engineGroup.add(camGroup);
    parts.cam = camGroup;
    engineGroup.add(headsGroup);
    parts.heads = headsGroup;

    // =========================================================================
    // 6. INTAKE MANIFOLD, HOLLEY 4150 CARBURETOR (DEFAULT) OR MPFI FUEL RAILS
    // =========================================================================
    const intakeGroup = new THREE.Group();
    const isTunnelRam = config.selectedIntake === 'tunnelram_dual';
    const isSinglePlane = config.selectedIntake === 'singleplane_victor';

    // Sculpted Intake Runners bridging head intake ports to valley manifold (scaled by intakePortCc)
    const runnerPortScale = Math.sqrt((config.intakePortCc ?? 185) / 185);
    for (let r = 0; r < 8; r++) {
      const rSide = r % 2 === 0 ? 1 : -1;
      const rZ = -3.9 + Math.floor(r / 2) * 2.6 + (rSide === 1 ? 0.22 : -0.22);
      const runner = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 0.56 * runnerPortScale, 0.86 * runnerPortScale),
        mats.billetAlum
      );
      runner.position.set(
        rSide * 1.15,
        isSinglePlane ? 3.05 : 2.76 + (r % 2) * 0.12,
        rZ
      );
      runner.rotation.z = -rSide * 0.22;
      intakeGroup.add(runner);
    }

    const efiRailsGroup = new THREE.Group();

    if (inductionDress === 'mpfi_cnp' && !isTunnelRam) {
      // Modern Real-World MPFI Plenum + 90mm Throttle Body + Billet Injector Rails
      const valleyPlenum = new THREE.Mesh(
        new THREE.BoxGeometry(2.75, 0.68, 9.6),
        mats.billetAlum
      );
      valleyPlenum.position.set(0, 2.58, 0);
      valleyPlenum.userData = {
        name: `${specs.intakeData.name} (MPFI Conversion)`,
        category: 'Induction',
        desc: `Runner Volume: ${specs.intakeData.runnerCc}cc | Flow: ${specs.intakeData.flowCfm} CFM | Sequential Port EFI.`,
        torque: 'Intake Bolts: 30 ft-lbs (center spiral)',
        partNumber: specs.intakeData.id
      };
      intakeGroup.add(valleyPlenum);

      const tbHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.05, 1.15, 24),
        mats.billetAlum
      );
      tbHousing.rotation.x = Math.PI / 2;
      tbHousing.position.set(0, 2.68, 5.25);
      tbHousing.userData = {
        name: `90mm CNC Billet EFI Throttle Body (${config.carbCfm} CFM Rated)`,
        category: 'Induction',
        desc: `CNC 6061-T6 bore feeding ${specs.peakCfmDemand} CFM engine demand at ${config.targetAFR}:1 Target AFR.`
      };
      intakeGroup.add(tbHousing);

      const tbButterfly = new THREE.Mesh(
        new THREE.CylinderGeometry(0.84, 0.84, 0.10, 24),
        mats.brassBronze
      );
      tbButterfly.rotation.x = Math.PI / 2;
      tbButterfly.position.set(0, 2.68, 5.78);
      intakeGroup.add(tbButterfly);

      [-1.55, 1.55].forEach((railX, rBank) => {
        const fuelRail = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.42, 9.4),
          rBank === 0 ? mats.anodizedBlack : mats.billetAlum
        );
        fuelRail.position.set(railX, 3.68, 0);
        fuelRail.userData = {
          name: `Billet High-Flow MPFI Fuel Rail (${rBank === 0 ? 'Left' : 'Right'} Bank)`,
          category: 'Fuel System',
          desc: 'CNC -8 AN bored aluminum fuel rail with 8× 42 lb/hr port injectors & braided crossover.',
          partNumber: 'HOL-534-212'
        };
        efiRailsGroup.add(fuelRail);

        [-4.85, 4.85].forEach((fz, fIdx) => {
          const anHex = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.22, 0.42, 6),
            fIdx === 0 ? mats.anRed : mats.fuelBlueAnodized
          );
          anHex.rotation.x = Math.PI / 2;
          anHex.position.set(railX, 3.68, fz);
          efiRailsGroup.add(anHex);
        });

        for (let inj = 0; inj < 4; inj++) {
          const iz = journalZ[inj] + (rBank === 1 ? 0.22 : -0.22);
          const injector = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.12, 0.85, 12),
            mats.anodizedBlack
          );
          injector.position.set(railX * 0.92, 3.22, iz);
          injector.rotation.z = rBank === 1 ? -0.26 : 0.26;
          injector.userData = {
            name: `MPFI Fuel Injector #${inj + 1 + rBank * 4} (42 lb/hr EV14)`,
            category: 'Fuel System',
            desc: 'High-impedance sequential port injector feeding cylinder head intake runner.'
          };
          efiRailsGroup.add(injector);
        }
      });

      const frontCrossover = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.55, 3.68, 4.95),
        new THREE.Vector3(0, 3.92, 5.25),
        new THREE.Vector3(1.55, 3.68, 4.95)
      ]);
      efiRailsGroup.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(frontCrossover, 16, 0.095, 8, false),
          mats.braidedStainless
        )
      );
    } else {
      // Proven Racing SBC High-Rise Manifold + Holley 4150 Double-Pumper 4-Barrel Carburetor
      const manifoldBase = new THREE.Mesh(
        new THREE.BoxGeometry(3.05, isTunnelRam ? 2.1 : 1.08, 9.4),
        mats.aluminumHeads
      );
      manifoldBase.position.set(0, isTunnelRam ? 3.55 : 2.98, 0);
      manifoldBase.userData = {
        name: specs.intakeData.name,
        category: 'Induction',
        desc: `Runner Volume: ${specs.intakeData.runnerCc}cc | Flow: ${specs.intakeData.flowCfm} CFM | Style: ${specs.intakeData.style}.`,
        torque: 'Intake Bolts: 30 ft-lbs (center spiral)',
        partNumber: specs.intakeData.id
      };
      intakeGroup.add(manifoldBase);

      // Raised Square-Bore Carb Plenum Pad on Manifold
      const plenumPad = new THREE.Mesh(
        new THREE.BoxGeometry(2.25, 0.42, 2.35),
        mats.billetAlum
      );
      plenumPad.position.set(0, isTunnelRam ? 4.72 : 3.62, 0);
      intakeGroup.add(plenumPad);

      const carbOffsetsZ = isTunnelRam || config.carbStyle === 'dual_quad' ? [-1.85, 1.85] : [0];
      const carbStyleActive = config.carbStyle || '4150_dp';
      const carbVenturiActive = config.carbVenturiIn ?? 1.375;
      carbOffsetsZ.forEach((cz) => {
        const holleyCarb = createHolley4150CarburetorGroup(
          mats.carbGoldZinc,
          mats.billetAlum,
          mats.anodizedBlack,
          mats.brassBronze,
          mats.anRed,
          mats.fuelBlueAnodized,
          mats.braidedStainless,
          {
            style: carbStyleActive,
            venturiRatio: carbVenturiActive / 1.375,
            cfm: config.carbCfm,
            airBonus: config.airFilterCfmBonus
          }
        );
        holleyCarb.position.set(0, isTunnelRam ? 5.65 : 4.66, cz);
        holleyCarb.userData = {
          name: `${carbStyleActive.replace('_', ' ').toUpperCase()} (${config.carbCfm} CFM · ${carbVenturiActive.toFixed(3)}" Venturi)`,
          category: 'Induction',
          desc: `Eff. Capacity: ${specs.effectiveCarbCfm} CFM (${specs.carbSizingStatus}) | Target AFR: ${config.targetAFR}:1.`,
          partNumber: `HLY-${carbStyleActive.toUpperCase()}-${config.carbCfm}`
        };
        intakeGroup.add(holleyCarb);
      });
    }

    engineGroup.add(efiRailsGroup);
    parts.efiRails = efiRailsGroup;
    engineGroup.add(intakeGroup);
    parts.intake = intakeGroup;

    // =========================================================================
    // 7. IGNITION: MSD PRO-BILLET HEI DISTRIBUTOR (DEFAULT) OR COIL-NEAR-PLUG
    // =========================================================================
    const ignitionGroup = new THREE.Group();

    if (inductionDress === 'mpfi_cnp' && !isTunnelRam) {
      // Hall-Effect Crank Position Sensor reading 60-2 Trigger Wheel
      const hallBracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.32, 0.42),
        mats.billetAlum
      );
      hallBracket.position.set(-1.78, crankCenterY + 0.38, 7.22);
      hallBracket.rotation.z = -0.35;
      ignitionGroup.add(hallBracket);

      const hallSensor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.72, 12),
        mats.anodizedBlack
      );
      hallSensor.rotation.z = Math.PI / 2 - 0.25;
      hallSensor.position.set(-1.76, crankCenterY + 0.44, 7.36);
      hallSensor.userData = {
        name: 'Hall-Effect Crankshaft Position Sensor (60-2)',
        category: 'Ignition & Timing',
        desc: `0.040" air gap to 60-2 billet trigger wheel | Total Timing: ${config.ignitionTiming}° BTDC.`,
        partNumber: 'HOL-554-118'
      };
      ignitionGroup.add(hallSensor);

      // Center-Valley Billet Coil Carrier + 4 Anodized Blue Twin-Tower Spark Plug Coils
      const coilBracket = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.18, 8.8),
        mats.billetAlum
      );
      coilBracket.position.set(0, 3.04, 0);
      ignitionGroup.add(coilBracket);

      for (let c = 0; c < 4; c++) {
        const cz = -3.3 + c * 2.2;
        const coilBlock = new THREE.Mesh(
          new THREE.BoxGeometry(1.05, 0.82, 1.35),
          mats.coilBlue
        );
        coilBlock.position.set(0, 3.52, cz);
        coilBlock.userData = {
          name: `High-Output Blue Coil-Near-Plug Pack #${c + 1}`,
          category: 'Ignition',
          desc: `Dual-post smart IGN-1A coil pack | Dwell-controlled ${config.ignitionTiming}° BTDC | Gap: ${config.sparkPlugGap.toFixed(3)}".`,
          partNumber: 'MSD-82878'
        };
        ignitionGroup.add(coilBlock);

        const coilCap = new THREE.Mesh(
          new THREE.BoxGeometry(1.12, 0.14, 1.42),
          mats.anodizedBlack
        );
        coilCap.position.set(0, 3.96, cz);
        ignitionGroup.add(coilCap);
      }

      // Rear Low-Profile Billet Cam Sync Sensor engaging Cam Gear (z = -4.85)
      const camSync = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.36, 1.4, 16),
        mats.machinedInternal
      );
      camSync.position.set(0, 2.95, -4.85);
      camSync.userData = {
        name: 'Billet Cam Sync Phase Sensor',
        category: 'Ignition',
        desc: '1x camshaft phase reference for sequential fuel & ignition firing order (1-8-4-3-6-5-7-2).'
      };
      ignitionGroup.add(camSync);
    } else {
      // Rear MSD Pro-Billet HEI Distributor engaging Camshaft Bevel Gear at z = -4.85
      const distShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 3.1, 16),
        mats.crankForged
      );
      distShaft.position.set(0, 2.65, -4.85);
      ignitionGroup.add(distShaft);

      const distHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.48, 0.85, 18),
        mats.machinedInternal
      );
      distHousing.position.set(0, 3.85, -4.85);
      ignitionGroup.add(distHousing);

      const distCap = new THREE.Mesh(
        new THREE.CylinderGeometry(1.02, 1.10, 1.25, 22),
        mats.ignitionRed
      );
      distCap.position.set(0, 4.78, -4.85);
      distCap.userData = {
        name: 'MSD Pro-Billet HEI Distributor',
        category: 'Ignition',
        desc: `Engages rear cam bevel gear & oil pump hex shaft | Total Advance: ${config.ignitionTiming}° BTDC | Firing Order: 1-8-4-3-6-5-7-2.`,
        partNumber: 'MSD-8360'
      };
      ignitionGroup.add(distCap);

      const vacCan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.44, 0.68, 14),
        mats.machinedInternal
      );
      vacCan.rotation.z = Math.PI / 2;
      vacCan.position.set(1.12, 4.25, -4.85);
      ignitionGroup.add(vacCan);
    }

    for (let sp = 0; sp < 8; sp++) {
      const spSide = sp % 2 === 1 ? 1 : -1;
      const jIdx = Math.floor(sp / 2);
      const spZ = journalZ[jIdx] + (spSide === 1 ? 0.22 : -0.22);

      const plugGroup = new THREE.Group();
      plugGroup.position.set(spSide * 4.35, 2.25, spZ);
      plugGroup.rotation.z = -spSide * 0.45;

      const plugHex = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.45, 6), mats.crankForged);
      const plugThreadBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 12), mats.arpBlackOxide);
      plugThreadBase.position.y = -0.32;
      const plugCeramic = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 0.46, 14), mats.sparkPlugWhite);
      plugCeramic.position.y = 0.42;
      for (let cr = 0; cr < 3; cr++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.016, 6, 14), mats.sparkPlugWhite);
        rib.rotation.x = Math.PI / 2;
        rib.position.y = 0.28 + cr * 0.10;
        plugGroup.add(rib);
      }
      const plugBoot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 0.52, 12),
        inductionDress === 'mpfi_cnp' && !isTunnelRam ? mats.anodizedBlack : mats.ignitionRed
      );
      plugBoot.position.y = 0.78;
      plugGroup.add(plugHex, plugThreadBase, plugCeramic, plugBoot);
      plugGroup.userData = {
        name: `Iridium Spark Plug #${sp + 1}`,
        category: 'Ignition',
        desc: `Gap: ${config.sparkPlugGap.toFixed(3)}" | 14mm tapered seat | Ribbed alumina ceramic insulator.`
      };
      ignitionGroup.add(plugGroup);

      const wireCurve =
        inductionDress === 'mpfi_cnp' && !isTunnelRam
          ? new THREE.CatmullRomCurve3([
              new THREE.Vector3(spSide * 0.52, 3.65, -3.3 + jIdx * 2.2),
              new THREE.Vector3(spSide * 1.95, 3.85, spZ),
              new THREE.Vector3(spSide * 3.75, 3.45, spZ),
              new THREE.Vector3(spSide * 4.65, 2.85, spZ)
            ])
          : new THREE.CatmullRomCurve3([
              new THREE.Vector3(spSide * 0.45, 5.25, -4.85),
              new THREE.Vector3(spSide * 2.15, 4.95, -2.5 + jIdx * 0.6),
              new THREE.Vector3(spSide * 3.85, 3.65, spZ),
              new THREE.Vector3(spSide * 4.65, 2.85, spZ)
            ]);
      const wireMesh = new THREE.Mesh(
        new THREE.TubeGeometry(wireCurve, 14, 0.055, 6, false),
        inductionDress === 'mpfi_cnp' && !isTunnelRam ? mats.braidedStainless : mats.ignitionRed
      );
      ignitionGroup.add(wireMesh);
    }
    engineGroup.add(ignitionGroup);
    parts.ignition = ignitionGroup;

    // =========================================================================
    // 8. LUBRICATION: MELLING M-55HV OIL PUMP, 3/8" PICKUP & WIX FILTER
    // =========================================================================
    const lubeGroup = new THREE.Group();
    const oilPumpBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 1.55, 1.35),
      mats.oilPumpBronze
    );
    oilPumpBody.position.set(0, -2.45, -4.8);
    oilPumpBody.userData = {
      name: 'Melling M-55HV High-Volume Oil Pump',
      category: 'Lubrication',
      desc: '60 PSI cast-iron high-volume pump bolted to rear main cap. Driven via ARP chromoly hex shaft.',
      torque: 'Oil Pump Stud: 65 ft-lbs',
      partNumber: 'MEL-M55HV'
    };
    lubeGroup.add(oilPumpBody);

    const oilDriveShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 4.8, 6),
      mats.crankForged
    );
    oilDriveShaft.position.set(0, -0.1, -4.8);
    lubeGroup.add(oilDriveShaft);

    const pickupCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -2.7, -4.3),
      new THREE.Vector3(0, -3.35, -3.1),
      new THREE.Vector3(0, -3.65, -1.8)
    ]);
    const pickupTube = new THREE.Mesh(
      new THREE.TubeGeometry(pickupCurve, 12, 0.18, 10, false),
      mats.crankForged
    );
    lubeGroup.add(pickupTube);

    const pickupScreen = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.15, 0.32, 20),
      mats.brassBronze
    );
    pickupScreen.position.set(0, -3.72, -1.7);
    pickupScreen.userData = {
      name: 'Oil Pump Pickup Screen (3/8" Pan Clearance)',
      category: 'Lubrication',
      desc: 'TIG-brazed pickup foot verified to 0.375" pan-floor clearance.'
    };
    lubeGroup.add(pickupScreen);

    const oilFilter = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.15, 2.3, 24),
      mats.filterBlue
    );
    oilFilter.rotation.x = 0.25;
    oilFilter.position.set(-2.55, -2.35, -4.8);
    oilFilter.userData = {
      name: 'Wix 51069 Racing Spin-On Oil Filter',
      category: 'Lubrication',
      desc: '21-micron synthetic media with silicone anti-drainback valve.'
    };
    lubeGroup.add(oilFilter);

    engineGroup.add(lubeGroup);
    parts.lubrication = lubeGroup;

    // =========================================================================
    // 9. COOLING & COPLANAR ACCESSORY DRIVE: WATER PUMP, BYPASS HOSE, TENSIONER & VENTED ALT
    // =========================================================================
    const coolingGroup = new THREE.Group();

    const wpCenter = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.48, 1.45, 24),
      mats.billetAlum
    );
    wpCenter.rotation.x = Math.PI / 2;
    wpCenter.position.set(0, 1.65, 6.72);
    wpCenter.userData = {
      name: 'Edelbrock Victor High-Flow Aluminum Water Pump',
      category: 'Cooling',
      desc: '35 GPM CNC-machined billet impeller circulating coolant evenly across both cylinder banks.',
      partNumber: 'EDL-8810'
    };
    coolingGroup.add(wpCenter);

    [-1.45, 1.45].forEach((lx) => {
      const wpLeg = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.82, 0.62),
        mats.billetAlum
      );
      wpLeg.position.set(lx, 1.38, 6.18);
      wpLeg.rotation.z = lx > 0 ? -0.18 : 0.18;
      coolingGroup.add(wpLeg);
    });

    const tStatHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.66, 0.82, 1.15, 16),
      mats.chromePolish
    );
    tStatHousing.rotation.x = 0.45;
    tStatHousing.position.set(0, 3.68, 4.35);
    tStatHousing.userData = {
      name: 'Billet O-Ring Water Neck & 180°F Thermostat',
      category: 'Cooling',
      desc: 'Swivel billet thermostat housing with high-flow 180°F Robertshaw stat & lower pump bypass port.'
    };
    coolingGroup.add(tStatHousing);

    // Molded Rubber Coolant Bypass Hose (Intake Front Water Port -> Water Pump Top Bypass Boss)
    const bypassCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.55, 3.15, 4.72),
      new THREE.Vector3(0.68, 2.75, 5.65),
      new THREE.Vector3(0.58, 2.25, 6.48)
    ]);
    const bypassHose = new THREE.Mesh(
      new THREE.TubeGeometry(bypassCurve, 14, 0.16, 10, false),
      mats.beltsBlack
    );
    bypassHose.userData = {
      name: 'Molded EPDM Coolant Bypass Hose',
      category: 'Cooling',
      desc: 'Recirculates coolant between intake crossover and water pump until 180°F thermostat opens.'
    };
    coolingGroup.add(bypassHose);

    const crankPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(1.32, 1.32, 0.52, 28),
      mats.chromePolish
    );
    crankPulley.rotation.x = Math.PI / 2;
    crankPulley.position.set(0, crankCenterY, 7.62);
    coolingGroup.add(crankPulley);

    const wpPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(1.08, 1.08, 0.52, 28),
      mats.chromePolish
    );
    wpPulley.rotation.x = Math.PI / 2;
    wpPulley.position.set(0, 1.65, 7.62);
    coolingGroup.add(wpPulley);

    const altBracketArm = new THREE.Mesh(
      new THREE.BoxGeometry(2.65, 0.68, 0.35),
      mats.billetAlum
    );
    altBracketArm.position.set(2.05, 2.15, 6.68);
    altBracketArm.rotation.z = 0.35;
    coolingGroup.add(altBracketArm);

    const altLowerLink = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 0.42, 0.32),
      mats.billetAlum
    );
    altLowerLink.position.set(2.15, 0.72, 6.95);
    altLowerLink.rotation.z = 0.25;
    coolingGroup.add(altLowerLink);

    const tensionerPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 0.42, 20),
      mats.anodizedBlack
    );
    tensionerPulley.rotation.x = Math.PI / 2;
    tensionerPulley.position.set(2.15, 0.72, 7.62);
    tensionerPulley.userData = {
      name: 'Billet Spring-Loaded Belt Idler & Tensioner',
      category: 'Accessory Drive',
      desc: '6061-T6 CNC tensioner maintaining constant belt wrap across 160A alternator & water pump.'
    };
    coolingGroup.add(tensionerPulley);

    const alternator = createVentedAlternatorGroup(
      mats.billetAlum,
      mats.copperWinding,
      mats.chromePolish,
      mats.anodizedBlack,
      mats.anRed,
      mats.arpBlackOxide
    );
    alternator.position.set(3.85, 2.25, 6.40);
    alternator.userData = {
      name: 'Heavy-Duty 160A High-Output Vented Alternator',
      category: 'Electrical',
      desc: 'Slotted cast-aluminum housing with exposed copper stator windings, billet fan, and CNC slotted bracket.',
      partNumber: 'PWM-47294'
    };
    coolingGroup.add(alternator);

    // Coplanar Multi-Rib Serpentine Belt (all pulleys at z = 7.62)
    const beltCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-1.32, crankCenterY, 7.62),
        new THREE.Vector3(0, crankCenterY - 1.32, 7.62),
        new THREE.Vector3(1.28, crankCenterY - 0.28, 7.62),
        new THREE.Vector3(2.45, 0.32, 7.62),
        new THREE.Vector3(4.46, 2.02, 7.62),
        new THREE.Vector3(3.92, 2.91, 7.62),
        new THREE.Vector3(0.32, 2.71, 7.62),
        new THREE.Vector3(-1.08, 1.68, 7.62)
      ],
      true
    );
    const vBelt = new THREE.Mesh(
      new THREE.TubeGeometry(beltCurve, 56, 0.11, 8, true),
      mats.beltsBlack
    );
    coolingGroup.add(vBelt);

    engineGroup.add(coolingGroup);
    parts.cooling = coolingGroup;

    // =========================================================================
    // 10. HOLLEY FUEL PUMP, POWERMASTER MINI STARTER & SHOP DISPLAY STAND / CHASSIS
    // =========================================================================
    const fuelGroup = new THREE.Group();
    const fuelPump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.96, 0.96, 1.42, 18),
      mats.chromePolish
    );
    fuelPump.position.set(2.95, -0.45, 4.65);
    fuelPump.userData = {
      name: 'Holley 110 GPH High-Flow Mechanical Fuel Pump',
      category: 'Fuel System',
      desc: `Cam-eccentric pushrod driven supply feeding ${specs.fuelGph} GPH peak demand to Holley dual-feed log.`,
      partNumber: 'HLY-12-327-11'
    };
    fuelGroup.add(fuelPump);

    const fuelPumpTarget =
      inductionDress === 'mpfi_cnp' && !isTunnelRam
        ? [
            new THREE.Vector3(2.95, 0.25, 4.65),
            new THREE.Vector3(3.05, 1.85, 4.75),
            new THREE.Vector3(1.95, 3.35, 4.85),
            new THREE.Vector3(1.55, 3.68, 4.85)
          ]
        : [
            new THREE.Vector3(2.95, 0.25, 4.65),
            new THREE.Vector3(2.85, 2.25, 4.05),
            new THREE.Vector3(1.85, 4.15, 2.45),
            new THREE.Vector3(1.22, 4.88, 1.46)
          ];
    const fuelLineCurve = new THREE.CatmullRomCurve3(fuelPumpTarget);
    const fuelLine = new THREE.Mesh(
      new THREE.TubeGeometry(fuelLineCurve, 18, 0.085, 8, false),
      mats.braidedStainless
    );
    fuelGroup.add(fuelLine);
    engineGroup.add(fuelGroup);
    parts.fuel = fuelGroup;

    const starterGroup = new THREE.Group();
    const starterMain = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 1.02, 2.75, 20),
      mats.starterDark
    );
    starterMain.rotation.x = Math.PI / 2;
    starterMain.position.set(2.50, -2.05, -4.45);
    starterGroup.add(starterMain);

    const starterNose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.72, 0.65, 16),
      mats.machinedInternal
    );
    starterNose.rotation.x = Math.PI / 2;
    starterNose.position.set(2.48, -2.05, -5.92);
    starterGroup.add(starterNose);

    const solenoid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 2.05, 16),
      mats.starterDark
    );
    solenoid.rotation.x = Math.PI / 2;
    solenoid.position.set(2.50, -1.18, -4.45);
    starterGroup.add(solenoid);
    starterGroup.userData = {
      name: 'Powermaster MasterTorque Mini Starter',
      category: 'Starting System',
      desc: '4.4:1 planetary gear reduction engaging 168-tooth SFI flexplate (0.035" pinion backlash).',
      partNumber: 'PWM-9600'
    };
    engineGroup.add(starterGroup);
    parts.starter = starterGroup;

    // 11. SUPPORT STRUCTURE: TUBULAR ROLLING SHOP ENGINE DISPLAY STAND (DEFAULT) OR HOT-ROD CHASSIS
    if (supportMode === 'hotrod_chassis') {
      const chassisGroup = createChassisAndRadiatorGroup(
        mats.chassisBlack,
        mats.billetAlum,
        mats.radiatorFin,
        mats.beltsBlack,
        mats.anRed,
        mats.fuelBlueAnodized,
        mats.chromePolish
      );
      engineGroup.add(chassisGroup);
      parts.chassis = chassisGroup;
    } else {
      const standGroup = createEngineTestStandGroup(
        mats.standChrome,
        mats.chassisBlack,
        mats.beltsBlack
      );
      standGroup.userData = {
        name: 'Tubular Chrome Rolling Engine Display & Dyno Cradle Stand',
        category: 'Shop Fixture',
        desc: '1.5" TIG-welded tubular display cradle bolted directly to SBC 3-bolt side motor mounts and rear bellhousing flange.'
      };
      engineGroup.add(standGroup);
      parts.chassis = standGroup;
    }

    // Apply crisp EdgesGeometry technical CAD linework when in Tech Drawing or Tech Paper ISO mode
    const edgeLines: THREE.LineSegments[] = [];
    if (isDrawing || isIsoPaper) {
      edgeLines.push(...applyTechnicalEdges(engineGroup, mats.techEdgeLine, isIsoPaper ? 18 : 22));
    }

    scene.add(engineGroup);

    // 3D Spatial Caliper Visuals (Endpoint Markers + Dimension Line)
    const caliperMarkerMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const caliperLineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee });
    const caliperP1Marker = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), caliperMarkerMat);
    const caliperP2Marker = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), caliperMarkerMat);
    const caliperLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    const caliperLine = new THREE.Line(caliperLineGeo, caliperLineMat);
    caliperP1Marker.visible = false;
    caliperP2Marker.visible = false;
    caliperLine.visible = false;
    scene.add(caliperP1Marker, caliperP2Marker, caliperLine);

    // CAD Selection Highlight Ring/Marker at hit target
    const selectionRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthTest: false
    });
    const selectionReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.42, 24),
      selectionRingMat
    );
    selectionReticle.visible = false;
    scene.add(selectionReticle);

    // Store snapshot of base userData & register partsRef for live BOM callout binding
    engineGroup.traverse((obj) => {
      if (obj.userData?.name) {
        obj.userData._base = { ...obj.userData };
      }
    });
    enginePartsRef.current = parts;
    engineReticleStateRef.current = { reticle: selectionReticle, camera };

    // Dynamic Cinematic Combustion Spark / Flame Pulse (Right Bank #2 Cylinder Cutaway Window)
    const combustionMat = new THREE.MeshBasicMaterial({
      color: 0xff7b1c,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const combustionGlow = new THREE.Mesh(
      new THREE.SphereGeometry(boreRadius * 0.72, 16, 12),
      combustionMat
    );
    combustionGlow.position.set(1.92, crankCenterY + 1.92, journalZ[0] + 0.22);
    combustionGlow.visible = false;
    engineGroup.add(combustionGlow);

    // Optional Hardware Post-Processing Composer for Cinematic Mode
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (isCinematic && !isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.26, 0.45, 0.86);
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    // Pre-compile shaders on hardware WebGL for silky first-frame interaction
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================================
    // KINEMATICS UPDATE FUNCTION (SLIDER-CRANK + 2:1 VALVETRAIN)
    // =========================================================================
    let lastTelemetryPush = 0;
    const updateKinematics = (crankAngle: number, pushTelemetry = false) => {
      crankGroup.rotation.z = crankAngle;
      // Fixed Nov 24 (carried from v10/v11): spin on the shaft axis (rotation.y),
      // not rotation.z — the old line tumbled the cam end-over-end through the block.
      camCore.rotation.y = crankAngle * 0.5;
      camSprocket.rotation.z = crankAngle * 0.5;

      // Exact 2D Slider-Crank solution per cylinder bank plane
      for (let i = 0; i < pistonNodes.length; i++) {
        const node = pistonNodes[i];
        const phi = node.pinPhase - crankAngle + node.bankRot;
        const xc = crankRadius * Math.sin(phi);
        const yc = crankRadius * Math.cos(phi);
        const yp = yc + Math.sqrt(Math.max(0.01, scaledRodLen * scaledRodLen - xc * xc));
        const rodTilt = Math.atan2(xc, yp - yc);

        node.rodGroup.position.set(xc, yc, 0);
        node.rodGroup.rotation.z = rodTilt;
        node.pistonAsm.position.set(0, yp, 0);
      }

      // Synchronized Cam Lobe / Lifter / Pushrod / Rocker / Valve / Spring Motion
      let intakeLiftFactor0 = 0;
      let exhaustLiftFactor0 = 0;
      for (let i = 0; i < valvetrainNodes.length; i++) {
        const v = valvetrainNodes[i];
        const thetaCam = crankAngle * 0.5 + v.offset;
        v.lobe.rotation.z = thetaCam;
        const liftFactor = Math.pow(Math.max(0, Math.sin(thetaCam)), 2);
        if (i === 0) intakeLiftFactor0 = liftFactor;
        if (i === 1) exhaustLiftFactor0 = liftFactor;
        const travel = liftFactor * 0.24;

        v.lifter.position.copy(v.baseLifterPos).addScaledVector(v.lifterAxis, travel);
        v.pushrod.position.copy(v.pushrodBasePos).addScaledVector(v.pushrodAxis, travel);
        v.rocker.rotation.z = -v.lSide * liftFactor * 0.22;
        v.valve.position.copy(v.baseValvePos).addScaledVector(v.valveAxis, -travel);
        v.retainer.position.copy(v.baseRetainerPos).addScaledVector(v.valveAxis, -travel);
        v.spring.scale.y = 1.0 - liftFactor * 0.22;
      }

      // 720-degree 4-stroke cycle phase & cinematic combustion/header thermal effects
      const cycleDeg = (((crankAngle * 180) / Math.PI) % 720 + 720) % 720;
      const runningNow = isRunningRef.current;
      const currentRpm = rpmRef.current;

      // Subtle exhaust header thermal glow at sustained high RPM in Cinematic/PBR modes
      if (runningNow && (isCinematic || isStudio) && analysisMode === 'none') {
        const heatFactor = Math.max(0, Math.min(1, (currentRpm - 2600) / 3900));
        mats.headerCeramic.emissive.setHex(0xb4320c);
        mats.headerCeramic.emissiveIntensity = heatFactor * (isCinematic ? 0.42 : 0.22);
      } else if (analysisMode === 'none') {
        mats.headerCeramic.emissiveIntensity = 0;
      }

      // Combustion spark pulse in Power stroke window (355° - 435° crank angle)
      if (runningNow && cutawayMode !== 'none' && cycleDeg >= 355 && cycleDeg <= 435) {
        const norm = (cycleDeg - 355) / 80;
        const pulse = Math.sin(norm * Math.PI);
        combustionGlow.visible = true;
        combustionMat.opacity = pulse * (isCinematic ? 0.78 : 0.55);
        combustionGlow.scale.setScalar(0.75 + pulse * 0.45);
      } else {
        combustionGlow.visible = false;
      }

      if (pushTelemetry && onTelemetryUpdateRef.current) {
        const cfg = configRef.current;
        const sp = specsRef.current;
        const rIn = cfg.stroke * 0.5;
        const lIn = cfg.rodLength;
        const thetaRad = (cycleDeg * Math.PI) / 180;
        const omega = (currentRpm * 2 * Math.PI) / 60;
        const sinT = Math.sin(thetaRad);
        const cosT = Math.cos(thetaRad);
        const rodSin = Math.max(-0.99, Math.min(0.99, (rIn / lIn) * sinT));
        const rodCos = Math.sqrt(1 - rodSin * rodSin);
        // Exact piston displacement from TDC (inches)
        const pistonPosFromCenter = rIn * cosT + lIn * rodCos;
        const tdcCenterDist = rIn + lIn;
        const pistonDepthFromTdcIn = Math.max(0, tdcCenterDist - pistonPosFromCenter);
        // Exact instantaneous piston velocity: v = omega * r * (sin(theta) + (r*sin(theta)*cos(theta))/(L*rodCos))
        const velInPerSec =
          omega * rIn * (sinT + (rIn * sinT * cosT) / Math.max(0.1, lIn * rodCos));
        const pistonVelocityFpm = Math.abs(velInPerSec * 5); // in/s * 60 / 12 = * 5
        const pistonVelocityMs = Math.abs(velInPerSec * 0.0254);
        const rodAngleDeg = (Math.asin(rodSin) * 180) / Math.PI;

        const cyl1Phase: DynamicKinematicTelemetry['cyl1Phase'] =
          cycleDeg < 180
            ? 'POWER'
            : cycleDeg < 360
            ? 'EXHAUST'
            : cycleDeg < 540
            ? 'INTAKE'
            : 'COMPRESSION';

        // Approximate Wiebe cylinder pressure trace for live readout
        let cylinderPressurePsi = 14.7;
        if (cyl1Phase === 'COMPRESSION') {
          const compRatioPos = (cycleDeg - 540) / 180;
          cylinderPressurePsi = 14.7 * Math.pow(1 + compRatioPos * (sp.staticCR - 1), 1.32);
        } else if (cyl1Phase === 'POWER') {
          const pwrPos = cycleDeg / 180;
          const peakPsi = 620 + sp.staticCR * 58;
          cylinderPressurePsi = 14.7 + peakPsi * Math.exp(-Math.pow((pwrPos - 0.14) / 0.24, 2));
        } else if (cyl1Phase === 'EXHAUST') {
          cylinderPressurePsi = 28 - (cycleDeg - 180) * 0.06;
        }

        // Interpolate live Torque & HP at current test RPM from coordinated dynoCurve
        const curve = sp.dynoCurve;
        let instTq = sp.peakTq * 0.65;
        let instHp = (instTq * currentRpm) / 5252;
        if (curve.length > 0) {
          const clampedRpm = Math.max(curve[0].rpm, Math.min(curve[curve.length - 1].rpm, currentRpm));
          let lower = curve[0];
          let upper = curve[curve.length - 1];
          for (let ci = 0; ci < curve.length - 1; ci++) {
            if (clampedRpm >= curve[ci].rpm && clampedRpm <= curve[ci + 1].rpm) {
              lower = curve[ci];
              upper = curve[ci + 1];
              break;
            }
          }
          const span = Math.max(1, upper.rpm - lower.rpm);
          const alpha = (clampedRpm - lower.rpm) / span;
          instTq = lower.tq + (upper.tq - lower.tq) * alpha;
          instHp = (instTq * currentRpm) / 5252;
        }

        onTelemetryUpdateRef.current({
          crankAngleDeg: +cycleDeg.toFixed(1),
          cyl1Phase,
          pistonDepthFromTdcIn: +pistonDepthFromTdcIn.toFixed(3),
          pistonVelocityFpm: Math.round(pistonVelocityFpm),
          pistonVelocityMs: +pistonVelocityMs.toFixed(2),
          rodAngleDeg: +rodAngleDeg.toFixed(2),
          intakeValveLiftIn: +(intakeLiftFactor0 * sp.totalValveLift).toFixed(3),
          exhaustValveLiftIn: +(exhaustLiftFactor0 * sp.totalValveLift).toFixed(3),
          instantaneousTorqueLbFt: Math.round(instTq),
          instantaneousHp: Math.round(instHp),
          cylinderPressurePsi: Math.round(cylinderPressurePsi)
        });
      }
    };

    // Initialize at TDC #1 clean resting pose
    let crankAngle = 0;
    updateKinematics(0, true);

    // =========================================================================
    // RAYCASTING & INTERACTION (CLICK INSPECT + THROTTLED SPATIAL PROBE)
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    let lastProbeAt = 0;
    const onPointerMove = (event: MouseEvent) => {
      if (!onHoverProbeRef.current) return;
      const now = performance.now();
      if (now - lastProbeAt < 55) return;
      lastProbeAt = now;

      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(engineGroup.children, true);
      if (hits.length > 0) {
        const hit = hits[0];
        let obj: THREE.Object3D | null = hit.object;
        while (obj && obj !== engineGroup) {
          if (obj.userData && obj.userData.name) break;
          obj = obj.parent;
        }
        onHoverProbeRef.current({
          xIn: +(hit.point.x * 1.48).toFixed(3),
          yIn: +(hit.point.y * 1.48).toFixed(3),
          zIn: +(hit.point.z * 1.48).toFixed(3),
          partName: (obj?.userData?.name as string) || 'Engine Assembly Surface'
        });
      } else {
        onHoverProbeRef.current(null);
      }
    };
    const onPointerLeave = () => {
      onHoverProbeRef.current?.(null);
    };
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(engineGroup.children, true);

      if (hits.length > 0) {
        const hit = hits[0];
        let obj: THREE.Object3D | null = hit.object;

        while (obj && obj !== engineGroup) {
          if (obj.userData && obj.userData.name) break;
          obj = obj.parent;
        }

        if (obj && obj.userData && obj.userData.name) {
          onSelectPartRef.current(obj.userData as InspectionData);
          selectionReticle.position.copy(hit.point);
          selectionReticle.lookAt(camera.position);
          selectionReticle.visible = true;
        }

        const currentMeasure = measurementRef.current;
        if (currentMeasure.mode === 'caliper') {
          const pt: [number, number, number] = [hit.point.x, hit.point.y, hit.point.z];
          if (!currentMeasure.point1) {
            onUpdateMeasurementRef.current({
              ...currentMeasure,
              point1: pt,
              point2: null,
              distanceInches: null,
              distanceMm: null,
              surfaceLabel: obj?.userData?.name || 'Point A'
            });
          } else {
            _ptA.set(...currentMeasure.point1);
            const distScene = _ptA.distanceTo(hit.point);
            const distIn = +(distScene * 1.48).toFixed(3);
            const distMm = +(distIn * 25.4).toFixed(1);

            onUpdateMeasurementRef.current({
              ...currentMeasure,
              point2: pt,
              distanceInches: distIn,
              distanceMm: distMm
            });
          }
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Resize Observer + Window Resize
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      const asp = w / h;
      if (camera instanceof THREE.OrthographicCamera) {
        camera.left = -orthoHalf * asp;
        camera.right = orthoHalf * asp;
        camera.top = orthoHalf;
        camera.bottom = -orthoHalf;
      } else {
        camera.aspect = asp;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) {
        composer.setSize(w, h);
      }
      if (bloomPass) {
        bloomPass.resolution.set(w, h);
      }
    };
    window.addEventListener('resize', onResize);

    // =========================================================================
    // PACED RENDER LOOP (SMOOTH DAMPED EXPLOSION + SOFTWARE-WEBGL GUARD)
    // =========================================================================
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let smoothedExploded = explodedRef.current;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext | null;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    // Register CATIA/HOOPS CAD Snapshot & Watertight STL Export callbacks
    if (onRegisterCaptureRef.current) {
      onRegisterCaptureRef.current(() => {
        if (disposed) return;
        if (composer) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }
        const url = renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `SBC350-CAD-${config.bore.toFixed(3)}x${config.stroke.toFixed(3)}.png`;
        link.click();
      });
    }
    if (onRegisterStlExportRef.current) {
      onRegisterStlExportRef.current(() => {
        if (disposed) return;
        exportObject3DToSTL(
          engineGroup,
          `MODSIM-${specs.displacementCi}CID-${config.bore.toFixed(3)}x${config.stroke.toFixed(3)}.stl`
        );
      });
    }

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Apply live Spec Tree component visibility
      const hidden = hiddenPartsRef.current;
      for (const key in parts) {
        if (parts[key]) {
          parts[key].visible = !hidden[key];
        }
      }

      // Damped HOOPS Camera Preset Transition
      if (camTransitionRef.current.active) {
        _camGoalPos.copy(camTransitionRef.current.pos);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 8, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 8, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 8, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, 8, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, 8, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, 8, dt);
        if (camera.position.distanceTo(_camGoalPos) < 0.05) {
          camera.position.copy(_camGoalPos);
          controls.target.copy(_camGoalTarget);
          camTransitionRef.current.active = false;
        }
      }

      controls.update();

      // Dynamic Section Plane Offset
      if (activeClippingPlanes.length > 0) {
        activeClippingPlanes[0].constant = baseClipConstant + sectionOffsetRef.current;
      }

      // Sync Selection Reticle & Spatial 3D Caliper Visuals
      if (!selectedPartRef.current) {
        selectionReticle.visible = false;
      } else if (selectionReticle.visible) {
        selectionReticle.lookAt(camera.position);
      }

      const m = measurementRef.current;
      if (m.mode === 'caliper' && m.point1) {
        caliperP1Marker.visible = true;
        caliperP1Marker.position.set(m.point1[0], m.point1[1], m.point1[2]);
        if (m.point2) {
          caliperP2Marker.visible = true;
          caliperP2Marker.position.set(m.point2[0], m.point2[1], m.point2[2]);
          const posAttr = caliperLine.geometry.attributes.position as THREE.BufferAttribute;
          posAttr.setXYZ(0, m.point1[0], m.point1[1], m.point1[2]);
          posAttr.setXYZ(1, m.point2[0], m.point2[1], m.point2[2]);
          posAttr.needsUpdate = true;
          caliperLine.visible = true;
        } else {
          caliperP2Marker.visible = false;
          caliperLine.visible = false;
        }
      } else {
        caliperP1Marker.visible = false;
        caliperP2Marker.visible = false;
        caliperLine.visible = false;
      }

      // Smooth exponential damping for exploded view separation
      smoothedExploded = THREE.MathUtils.damp(smoothedExploded, explodedRef.current, 9, dt);
      const f = smoothedExploded;

      if (parts.heads && parts.heads.children.length >= 2) {
        const leftHeadRot = Math.PI / 4;
        const rightHeadRot = -Math.PI / 4;
        const headDist = 4.45 + f * 3.8;
        parts.heads.children[0].position.set(
          -Math.sin(leftHeadRot) * headDist,
          crankCenterY + Math.cos(leftHeadRot) * headDist,
          0
        );
        parts.heads.children[1].position.set(
          -Math.sin(rightHeadRot) * headDist,
          crankCenterY + Math.cos(rightHeadRot) * headDist,
          0
        );
      }
      if (parts.intake) parts.intake.position.y = f * 4.4;
      if (parts.efiRails) parts.efiRails.position.y = f * 5.8;
      if (parts.ignition) parts.ignition.position.y = f * 3.8;
      if (parts.timingCover) parts.timingCover.position.z = 6.28 + f * 2.8;
      if (parts.cooling) parts.cooling.position.z = f * 4.4;
      if (parts.oilPan) parts.oilPan.position.y = -f * 4.0;
      if (parts.lubrication) parts.lubrication.position.y = -f * 2.4;
      if (parts.fuel) parts.fuel.position.x = f * 2.5;
      if (parts.starter) parts.starter.position.x = f * 2.8;
      if (parts.chassis) parts.chassis.position.y = -f * 3.0;

      if (isRunningRef.current) {
        // Visually readable scaled angular rate synchronized to RPM slider
        const radPerSec = Math.min(26, (rpmRef.current / 60) * 0.42 * Math.PI);
        crankAngle += radPerSec * dt;
        const shouldPush = now - lastTelemetryPush >= 65;
        if (shouldPush) lastTelemetryPush = now;
        updateKinematics(crankAngle, shouldPush);
      } else if (now - lastTelemetryPush >= 220) {
        lastTelemetryPush = now;
        updateKinematics(crankAngle, true);
      }

      try {
        if (composer) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }
      } catch (err) {
        disposed = true;
        setWebglError(
          err instanceof Error ? err.message : '3D WebGL frame rendering failed.'
        );
        return;
      }

      if (isSoftwareGl) {
        afterDraw(() => tick(performance.now()));
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick(performance.now());
    } else {
      frameId = requestAnimationFrame(tick);
    }

    const onContextLost = (e: Event) => {
      e.preventDefault();
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      setWebglError('3D WebGL context was interrupted by the browser.');
    };
    const onContextRestored = () => {
      setWebglError(null);
      setRetryNonce((n) => n + 1);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      disposed = true;
      enginePartsRef.current = {};
      engineReticleStateRef.current = null;
      onRegisterCaptureRef.current?.(null);
      onRegisterStlExportRef.current?.(null);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();

      // Cleanly dispose geometries, materials, and procedural textures (keep persistent WebGLRenderer)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Line) {
          obj.geometry?.dispose();
        }
      });
      combustionMat.dispose();
      caliperMarkerMat.dispose();
      caliperLineMat.dispose();
      selectionRingMat.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      edgeLines.forEach((l) => l.geometry.dispose());
      textures.dispose();
      composer?.dispose();
      if (scene.environment) scene.environment.dispose();
      renderer.renderLists.dispose();
    };
  }, [
    config.bore,
    config.stroke,
    config.rodLength,
    config.deckHeight,
    config.deckClearance,
    config.gasketThickness,
    config.chamberCc,
    config.pistonReliefCc,
    config.pistonAlloy,
    config.camProfile,
    config.rockerRatio,
    config.selectedIntake,
    config.carbCfm,
    config.carbStyle,
    config.carbVenturiIn,
    config.airFilterCfmBonus,
    config.intakePortCc,
    config.intakeValveIn,
    config.exhaustPortCc,
    config.exhaustPortShape,
    config.exhaustValveIn,
    config.headerPrimaryIn,
    config.targetAFR,
    config.ignitionTiming,
    config.sparkPlugGap,
    cutawayMode,
    subsystemIsolation,
    viewMode,
    projectionMode,
    analysisMode,
    inductionDress,
    supportMode,
    cinematicPreset,
    retryNonce
  ]);

  // Lightweight live binding of Technical Drawing BOM callouts onto Engine 3D subassemblies
  useEffect(() => {
    const partsMap = enginePartsRef.current;
    Object.values(partsMap).forEach((groupObj) => {
      groupObj.traverse((child) => {
        if (child.userData?._base) {
          const base = child.userData._base as Record<string, unknown>;
          child.userData = { ...base, _base: base };
        }
      });
    });

    if (!techDrawing) return;

    for (const callout of techDrawing.callouts) {
      const targetGroup = partsMap[callout.targetSubassembly];
      if (!targetGroup) continue;

      let primaryNamed: THREE.Object3D | null = targetGroup.userData?.name ? targetGroup : null;
      if (!primaryNamed) {
        targetGroup.traverse((child) => {
          if (!primaryNamed && child.userData?.name) {
            primaryNamed = child;
          }
        });
      }

      const targetObj = primaryNamed || targetGroup;
      const base = (targetObj.userData?._base || targetObj.userData || {}) as Record<string, unknown>;
      targetObj.userData = {
        ...base,
        _base: base,
        name: callout.partName || (base.name as string),
        category: callout.category || (base.category as string),
        desc: callout.notes || (base.desc as string),
        spec: callout.clearanceSpec,
        torque: callout.torqueSpec,
        partNumber: callout.partNumber,
        drawingIndex: callout.indexCode,
        material: callout.material,
        sourceUrls: techDrawing.sourceUrls
      };
    }
  }, [techDrawing, cutawayMode, viewMode, inductionDress, supportMode]);

  // Focus & reticle highlight when user clicks a BOM row in the Technical Drawing drawer
  useEffect(() => {
    if (!focusPartRequest) return;
    const obj = enginePartsRef.current[focusPartRequest.key];
    const reticleState = engineReticleStateRef.current;
    if (!obj || !reticleState) return;
    _engineFocusBox.setFromObject(obj);
    _engineFocusBox.getCenter(_engineFocusCenter);
    reticleState.reticle.position.copy(_engineFocusCenter);
    reticleState.reticle.lookAt(reticleState.camera.position);
    reticleState.reticle.visible = true;
  }, [focusPartRequest]);

  const handleRetryWebgl = () => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    setWebglError(null);
    setRetryNonce((n) => n + 1);
  };

  return (
    <div className="relative w-full h-full min-h-[480px]">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing blueprint-grid overflow-hidden"
        style={{ minHeight: '480px' }}
      />
      {webglError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1014]/95 p-6">
          <div className="max-w-md w-full rounded-xl border border-slate-700 bg-[#12161c] p-5 text-center space-y-3">
            <h3 className="text-sm font-bold text-white">3D WebGL Viewport Temporarily Unavailable</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{webglError}</p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRetryWebgl}
                className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition"
              >
                Retry 3D Viewport
              </button>
              {onOpenDrawingsTab && (
                <button
                  type="button"
                  onClick={onOpenDrawingsTab}
                  className="px-3.5 py-2 rounded-lg border border-cyan-500/60 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold transition"
                >
                  Open 2D Dimensioned Schematics
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
