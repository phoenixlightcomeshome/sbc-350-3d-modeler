import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { buildAerospaceAssembly, BuiltAssembly } from '../three/aerospaceModels';
import {
  exportAssemblyToBinaryStl,
  exportAssemblyToObj,
} from '../three/cadCamExporter';
import { createCamToolpathRig } from '../three/camToolpathRig';
import { createAerodynamicEffectsRig } from '../three/effectsRig';
import {
  camAngleDeg,
  depthBelowDeckIn,
  firingCylinderFor,
  pistonVelocityFtS,
  REDLINE_RPM,
  valveLiftInFor,
} from '../three/engineKinetics';
import {
  getCalibratedFloorGridTexture,
  getContactShadowTexture,
} from '../three/proceduralTextures';
import {
  ActionSequenceId,
  AssemblyId,
  CadEnvelopeMm,
  CameraPresetId,
  CamSimulationConfig,
  CustomDesignConfig,
  EnvironmentId,
  InspectedPart,
  MaterialId,
  ParametricConfig,
  RenderOverlayMode,
  SbcBlockLiveConfig,
  SubsystemKey,
  SubsystemMaterials,
} from '../types/aerospace';

export interface Viewport3DHandle {
  captureActionShot: () => string | null;
  captureHiResShot: (w: number, h: number) => string | null;
  exportStl: (filename: string) => { triangleCount: number } | null;
  exportObj: (filename: string) => { triangleCount: number } | null;
}

/** Live engine telemetry, emitted ~10 Hz while the V8 is assembled. All values are computed from the running engine clock — nothing is scripted. */
export interface EngineTelemetry {
  rpm: number;
  crankAngleDeg: number;
  camAngleDeg: number;
  firingCylinder: number;
  pistonVelocityFtS: number; // cylinder 1
  valveLiftIn: number; // highest lift across all valves right now
  depthBelowDeckIn: number; // cylinder 1 crown depth below the deck
  running: boolean;
}

interface Viewport3DProps {
  assemblyId: AssemblyId;
  params: ParametricConfig;
  materials: SubsystemMaterials;
  environment: EnvironmentId;
  cameraPreset: CameraPresetId;
  cameraPresetNonce: number;
  actionSequence: ActionSequenceId;
  overlayMode: RenderOverlayMode;
  bloomIntensity: number;
  camConfig: CamSimulationConfig;
  customDesign?: CustomDesignConfig;
  sbcBlockConfig?: SbcBlockLiveConfig;
  throttlePct?: number;
  isVisible: boolean;
  engineRunning: boolean;
  targetRpm: number;
  /** Cylinder count of the configured engine (6/8/10/12) — drives firing order + valve telemetry. */
  engineCylCount?: number;
  /** Render pixel-ratio cap: 1 standard, 1.5 high, 2 ultra (default 2). */
  renderQuality?: 1 | 1.5 | 2;
  onEngineTelemetry?: (t: EngineTelemetry) => void;
  onSelectPart: (part: InspectedPart | null) => void;
  onEnvelopeMeasured?: (envMm: CadEnvelopeMm) => void;
}

// Pre-allocated zero-GC scratch objects
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _pointer = new THREE.Vector2();

function isAutomotiveAssembly(assemblyId: AssemblyId): boolean {
  return (
    assemblyId === 'sbc350_v8' ||
    assemblyId === 'transmission_t56' ||
    assemblyId === 'ev_axial_drive' ||
    assemblyId === 'monoblock_brake' ||
    assemblyId === 'active_aero_chassis' ||
    assemblyId === 'custom_build'
  );
}

function getCameraPresetVectors(
  preset: CameraPresetId,
  assemblyId: AssemblyId
): { pos: [number, number, number]; target: [number, number, number] } {
  const isAuto = isAutomotiveAssembly(assemblyId);
  const cy =
    assemblyId === 'sbc350'
      ? 0.95
      : assemblyId === 'hx900'
      ? 1.85
      : assemblyId === 'custom_build'
      ? 1.1
      : assemblyId === 'sbc350_v8' ||
        assemblyId === 'transmission_t56' ||
        assemblyId === 'ev_axial_drive'
      ? 1.65
      : assemblyId === 'monoblock_brake'
      ? 1.95
      : assemblyId === 'active_aero_chassis'
      ? 1.75
      : 2.15;
  const s = assemblyId === 'custom_build' ? 0.85 : isAuto ? 0.56 : 1.0;

  switch (preset) {
    case 'hero_nose':
      return { pos: [-9.2 * s, cy + 0.8 * s, 4.4 * s], target: [-0.4 * s, cy, 0] };
    case 'wingtip':
      return { pos: [-2.4 * s, cy + 1.8 * s, 9.6 * s], target: [0.2 * s, cy, 0] };
    case 'intake':
      return {
        pos: assemblyId === 'sbc350' ? [0.5, cy + 0.8, 5.2] : [-6.2 * s, cy + 0.4 * s, 2.2 * s],
        target: assemblyId === 'sbc350' ? [2.2, cy + 0.2, 0.9] : [0, cy, 0],
      };
    case 'top':
      return { pos: [0.01, cy + 13.5 * s, 0.01], target: [0, cy, 0] };
    case 'side':
      return { pos: [0, cy + 0.2 * s, 12.2 * s], target: [0, cy, 0] };
    case 'cutaway':
      return { pos: [-5.6 * s, cy + 3.4 * s, 7.6 * s], target: [0, cy, 0] };
    case 'iso':
    default:
      return { pos: [-7.8 * s, cy + 3.8 * s, 7.8 * s], target: [0, cy - 0.1, 0] };
  }
}

export const Viewport3D = forwardRef<Viewport3DHandle, Viewport3DProps>(
  function Viewport3D(
    {
      assemblyId,
      params,
      materials,
      environment,
      cameraPreset,
      cameraPresetNonce,
      actionSequence,
      overlayMode,
      bloomIntensity,
      camConfig,
      customDesign,
      sbcBlockConfig,
      throttlePct,
      isVisible,
      engineRunning,
      targetRpm,
      engineCylCount,
      renderQuality,
      onEngineTelemetry,
      onSelectPart,
      onEnvelopeMeasured,
    }: Viewport3DProps,
    ref
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [contextLost, setContextLost] = useState(false);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const isSoftwareGlRef = useRef(false);

    // Keep latest props in refs so WebGL lifecycle never tears down
    const stateRef = useRef({
      assemblyId,
      params,
      materials,
      environment,
      actionSequence,
      overlayMode,
      bloomIntensity,
      camConfig,
      customDesign,
      sbcBlockConfig,
      throttlePct,
      isVisible,
      engineRunning,
      targetRpm,
      engineCylCount,
      renderQuality,
      onEngineTelemetry,
      onSelectPart,
      onEnvelopeMeasured,
    });
    stateRef.current = {
      assemblyId,
      params,
      materials,
      environment,
      actionSequence,
      overlayMode,
      bloomIntensity,
      camConfig,
      customDesign,
      sbcBlockConfig,
      throttlePct,
      isVisible,
      engineRunning,
      targetRpm,
      engineCylCount,
      renderQuality,
      onEngineTelemetry,
      onSelectPart,
      onEnvelopeMeasured,
    };

    const sceneApiRef = useRef<{
      requestRender: () => void;
      rebuildAssembly: () => void;
      updateMaterials: () => void;
      updateEnvironment: () => void;
      updateSectionCut: () => void;
      updateCamStrategy: () => void;
      updateThrottle: () => void;
      triggerCameraPreset: (preset: CameraPresetId) => void;
      captureShot: () => string | null;
      captureHiResShot: (w: number, h: number) => string | null;
      exportStl: (filename: string) => { triangleCount: number } | null;
      exportObj: (filename: string) => { triangleCount: number } | null;
    } | null>(null);

    useImperativeHandle(ref, () => ({
      captureActionShot: () => sceneApiRef.current?.captureShot() ?? null,
      captureHiResShot: (w: number, h: number) => sceneApiRef.current?.captureHiResShot(w, h) ?? null,
      exportStl: (filename: string) => sceneApiRef.current?.exportStl(filename) ?? null,
      exportObj: (filename: string) => sceneApiRef.current?.exportObj(filename) ?? null,
    }));

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      // 1. Software-WebGL probe from GPU renderer string
      const isSoftwareGl = (() => {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      })();

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.localClippingEnabled = true;

      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      isSoftwareGlRef.current = isSoftwareGl;
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        setContextLost(true);
      };
      const handleContextRestored = () => {
        setContextLost(false);
        sceneApiRef.current?.requestRender();
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

      // 2. Scene, Environment Map (RoomEnvironment), Fog
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#0c121b');
      scene.fog = new THREE.FogExp2('#0c121b', 0.016);

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
      pmremGenerator.dispose();

      // 3. Camera & OrbitControls
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 250);
      const initCam = getCameraPresetVectors(cameraPreset, stateRef.current.assemblyId);
      camera.position.set(...initCam.pos);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(...initCam.target);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.minDistance = 2.6;
      controls.maxDistance = 38;
      controls.maxPolarAngle = Math.PI * 0.52;
      controls.update();

      // 4. Studio 3-Point Lighting Rig + Hemisphere + Softboxes (GPU only)
      const hemiLight = new THREE.HemisphereLight(0xbcd7f7, 0x1b2330, 0.72);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.35);
      keyLight.position.set(-10, 14, 10);
      keyLight.castShadow = !isSoftwareGl;
      keyLight.shadow.mapSize.set(2048, 2048);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 42;
      keyLight.shadow.camera.left = -10;
      keyLight.shadow.camera.right = 10;
      keyLight.shadow.camera.top = 10;
      keyLight.shadow.camera.bottom = -10;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x8bb8f0, 0.95);
      fillLight.position.set(12, 6, -10);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xfbbf24, 1.25);
      rimLight.position.set(8, 5, 11);
      scene.add(rimLight);

      const rectLights: THREE.RectAreaLight[] = [];
      if (!isSoftwareGl) {
        RectAreaLightUniformsLib.init();
        const softboxTop = new THREE.RectAreaLight(0xffffff, 3.6, 12, 4);
        softboxTop.position.set(0, 9.5, 2);
        softboxTop.lookAt(0, 1, 0);
        scene.add(softboxTop);
        rectLights.push(softboxTop);

        const softboxSide = new THREE.RectAreaLight(0xdbeafe, 2.4, 10, 3);
        softboxSide.position.set(-8, 3.5, -6);
        softboxSide.lookAt(0, 1, 0);
        scene.add(softboxSide);
        rectLights.push(softboxSide);
      }

      // 5. Studio Floor Grid + Radial Contact Shadow (offset Y >= 0.02)
      const floorGroup = new THREE.Group();
      const gridGeo = new THREE.PlaneGeometry(90, 90);
      gridGeo.rotateX(-Math.PI / 2);
      const gridTex = getCalibratedFloorGridTexture(maxAnisotropy);
      const gridMat = new THREE.MeshStandardMaterial({
        map: gridTex,
        roughness: 0.72,
        metalness: 0.25,
      });
      const floorMesh = new THREE.Mesh(gridGeo, gridMat);
      floorMesh.position.y = 0;
      floorMesh.receiveShadow = true;
      floorGroup.add(floorMesh);

      const shadowGeo = new THREE.PlaneGeometry(14, 14);
      shadowGeo.rotateX(-Math.PI / 2);
      const shadowTex = getContactShadowTexture();
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      contactShadowMesh.position.y = 0.02;
      floorGroup.add(contactShadowMesh);
      scene.add(floorGroup);

      // 6. Section Cut Plane & Visual Frame Indicator
      const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 100);
      const clippingPlanes = [clipPlane];

      const cutIndicatorGeo = new THREE.RingGeometry(2.6, 2.66, 48);
      cutIndicatorGeo.rotateY(Math.PI / 2);
      const cutIndicatorMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const cutIndicator = new THREE.Mesh(cutIndicatorGeo, cutIndicatorMat);
      cutIndicator.visible = false;
      scene.add(cutIndicator);

      // 7. Aerodynamic Effects Rig (Streamlines, Contrails, Thermal Shader)
      const effectsRig = createAerodynamicEffectsRig();
      scene.add(effectsRig.group);

      // 8. Craft Root Container + 5-Axis CAM Toolpath Rig + Assembly Build
      const craftPivot = new THREE.Group();
      scene.add(craftPivot);
      const camRig = createCamToolpathRig();
      craftPivot.add(camRig.group);
      let currentAssembly: BuiltAssembly | null = null;

      // 9. Postprocessing EffectComposer (GPU only)
      const composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        stateRef.current.bloomIntensity,
        0.42,
        0.9
      );
      const outputPass = new OutputPass();
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      composer.addPass(outputPass);

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // Animation / On-Demand Rendering State
      let frameId = 0;
      let disposed = false;
      let renderBusy = false;
      let renderDirty = false;
      let continuousActive = false;

      let currentExploded = stateRef.current.params.exploded;
      let camTransitionActive = false;
      // Live engine clock (SBC-350 V8): RPM eases toward target, crank advances at RPM x 6 deg/s
      let crankAngleDeg = 0;
      let rpmNow = 0;
      let telemetryMs = 0;
      const camTargetPos = new THREE.Vector3(...initCam.pos);
      const camTargetLook = new THREE.Vector3(...initCam.target);

      const clock = new THREE.Clock();

      function renderSceneNow() {
        if (disposed) return;
        if (isSoftwareGl || stateRef.current.bloomIntensity <= 0.01) {
          renderer.render(scene, camera);
        } else {
          composer.render();
        }
      }

      function afterDraw(cb: () => void) {
        if (disposed) return;
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      function needsContinuousLoop(): boolean {
        const s = stateRef.current;
        if (!s.isVisible) return false;
        if (s.assemblyId === 'sbc350_v8' && (s.engineRunning || rpmNow > 1)) return true;
        if (s.camConfig.enabled) return true;
        if (s.actionSequence !== 'none') return true;
        if (s.environment === 'stratosphere' || s.environment === 'wind_tunnel') return true;
        if (camTransitionActive) return true;
        if (Math.abs(currentExploded - s.params.exploded) > 0.002) return true;
        return false;
      }

      function advanceSimulation(dt: number, elapsed: number) {
        const s = stateRef.current;

        // Smoothly damped exploded separation
        if (Math.abs(currentExploded - s.params.exploded) > 0.001) {
          currentExploded = THREE.MathUtils.damp(currentExploded, s.params.exploded, 8, dt);
          currentAssembly?.updateExploded(currentExploded);
        } else if (currentExploded !== s.params.exploded) {
          currentExploded = s.params.exploded;
          currentAssembly?.updateExploded(currentExploded);
        }

        // Action Sequence Overrides
        if (s.actionSequence === 'exploded_sweep' && currentAssembly) {
          const sweepVal = 0.5 - 0.5 * Math.cos(elapsed * 0.9);
          currentAssembly.updateExploded(sweepVal);
        }

        // Live engine clock — crank, pistons, rods, valves from real RPM (V8 only)
        if (s.assemblyId === 'sbc350_v8') {
          const target = s.engineRunning ? s.targetRpm : 0;
          const tau = target > rpmNow ? 1.1 : 0.6;
          rpmNow = THREE.MathUtils.damp(rpmNow, target, 1 / tau, dt);
          if (rpmNow < 1 && target === 0) rpmNow = 0;
          crankAngleDeg = (crankAngleDeg + rpmNow * 6 * dt) % 720;
          currentAssembly?.updateEngineKinematics?.(crankAngleDeg);
          telemetryMs += dt * 1000;
          if (telemetryMs >= 100) {
            telemetryMs = 0;
            const cylCount = s.engineCylCount ?? 8;
            let maxLift = 0;
            for (let cyl = 1; cyl <= cylCount; cyl++) {
              const il = valveLiftInFor(cylCount, crankAngleDeg, cyl, 'intake');
              const el = valveLiftInFor(cylCount, crankAngleDeg, cyl, 'exhaust');
              if (il > maxLift) maxLift = il;
              if (el > maxLift) maxLift = el;
            }
            s.onEngineTelemetry?.({
              rpm: Math.round(rpmNow),
              crankAngleDeg: Math.round(crankAngleDeg % 360),
              camAngleDeg: Math.round(camAngleDeg(crankAngleDeg)),
              firingCylinder: firingCylinderFor(cylCount, crankAngleDeg),
              pistonVelocityFtS: pistonVelocityFtS(crankAngleDeg, rpmNow),
              valveLiftIn: maxLift,
              depthBelowDeckIn: depthBelowDeckIn(crankAngleDeg),
              running: rpmNow > 1,
            });
          }
        }

        const isAuto = isAutomotiveAssembly(s.assemblyId);
        const sScale = s.assemblyId === 'custom_build' ? 0.85 : isAuto ? 0.58 : 1.0;
        const targetY = s.assemblyId === 'custom_build' ? 1.1 : isAuto ? 1.65 : 1.2;

        if (s.actionSequence === 'turntable') {
          const angle = elapsed * 0.42;
          const r = 10.5 * sScale;
          camera.position.set(Math.cos(angle) * r, targetY + 2.4 * sScale, Math.sin(angle) * r);
          controls.target.set(0, targetY, 0);
        } else if (s.actionSequence === 'climb') {
          const sway = Math.sin(elapsed * 0.8) * 0.6 * sScale;
          camera.position.set(
            -6.8 * sScale + sway,
            targetY + Math.cos(elapsed * 0.6) * 0.35,
            5.2 * sScale
          );
          controls.target.set(-0.4 * sScale, targetY, 0);
        } else if (s.actionSequence === 'flyby') {
          const t = ((elapsed * 0.28) % 1) * 2 - 1; // -1 to 1
          camera.position.set(
            -t * 14 * sScale,
            targetY + 0.9 + Math.sin(elapsed) * 0.35,
            (6.2 - Math.abs(t) * 1.4) * sScale
          );
          controls.target.set(0, targetY, 0);
        } else if (camTransitionActive) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, camTargetPos.x, 7, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, camTargetPos.y, 7, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, camTargetPos.z, 7, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, camTargetLook.x, 7, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, camTargetLook.y, 7, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, camTargetLook.z, 7, dt);

          if (
            camera.position.distanceTo(camTargetPos) < 0.03 &&
            controls.target.distanceTo(camTargetLook) < 0.02
          ) {
            camera.position.copy(camTargetPos);
            controls.target.copy(camTargetLook);
            camTransitionActive = false;
          }
        }

        // Spin turbofan / crank / gearset / rotor spinners + subtle flight dynamics
        if (currentAssembly) {
          const fanRpm =
            s.environment === 'stratosphere' || s.actionSequence === 'climb' || s.actionSequence === 'flyby'
              ? 18
              : s.environment === 'wind_tunnel'
              ? 12
              : 3.5;
          currentAssembly.animatedSpinners.forEach((sp) => {
            // The engine crank is owned by the live kinematics — never spun by the fan loop
            if (sp.userData?.engineCrank) return;
            if (sp.userData?.spinAxis === 'z') {
              sp.rotation.z += dt * fanRpm;
            } else {
              sp.rotation.x += dt * fanRpm;
            }
          });

          if (s.environment === 'stratosphere' || s.actionSequence === 'climb') {
            craftPivot.rotation.z = Math.sin(elapsed * 0.9) * 0.035 + 0.06;
            craftPivot.rotation.x = Math.sin(elapsed * 0.65) * 0.055;
            craftPivot.position.y = Math.sin(elapsed * 1.1) * 0.14 + 0.35;
          } else if (s.assemblyId === 'sbc350_v8' && s.engineRunning && rpmNow > 50) {
            // Engine shake on its stand — amplitude grows with RPM
            const vib = 0.0004 + 0.0016 * (rpmNow / REDLINE_RPM);
            craftPivot.position.y = Math.sin(elapsed * 47) * vib;
            craftPivot.rotation.z = Math.sin(elapsed * 39) * vib * 0.4;
            craftPivot.rotation.x = THREE.MathUtils.damp(craftPivot.rotation.x, 0, 8, dt);
          } else {
            craftPivot.rotation.z = THREE.MathUtils.damp(craftPivot.rotation.z, 0, 8, dt);
            craftPivot.rotation.x = THREE.MathUtils.damp(craftPivot.rotation.x, 0, 8, dt);
            craftPivot.position.y = THREE.MathUtils.damp(craftPivot.position.y, 0, 8, dt);
          }

          const showPlume =
            s.environment === 'stratosphere' ||
            s.environment === 'night_apron' ||
            s.actionSequence === 'climb' ||
            s.actionSequence === 'flyby';
          currentAssembly.exhaustPlumes.forEach((pl) => {
            pl.visible = showPlume;
            if (showPlume) {
              const pulse = 0.92 + Math.sin(elapsed * 28) * 0.08;
              pl.scale.set(pulse, 1, 1);
            }
          });
        }

        camRig.update(dt, elapsed, s.camConfig);
        effectsRig.streamlineUniforms.uTime.value = elapsed;
        controls.update();
      }

      function tickContinuous() {
        if (disposed || !needsContinuousLoop()) {
          continuousActive = false;
          return;
        }
        const dt = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.getElapsedTime();
        advanceSimulation(dt, elapsed);
        renderSceneNow();

        if (isSoftwareGl) {
          afterDraw(tickContinuous);
        } else {
          frameId = requestAnimationFrame(tickContinuous);
        }
      }

      function startContinuousIfNeeded() {
        if (disposed || continuousActive || !needsContinuousLoop()) return;
        continuousActive = true;
        clock.getDelta();
        if (isSoftwareGl) {
          afterDraw(tickContinuous);
        } else {
          frameId = requestAnimationFrame(tickContinuous);
        }
      }

      function requestRender() {
        if (disposed || !stateRef.current.isVisible) return;
        if (needsContinuousLoop()) {
          startContinuousIfNeeded();
          return;
        }
        if (renderBusy) {
          renderDirty = true;
          return;
        }
        renderBusy = true;
        frameId = requestAnimationFrame(() => {
          if (disposed) return;
          renderDirty = false;
          const dt = Math.min(clock.getDelta(), 0.05);
          advanceSimulation(dt, clock.getElapsedTime());
          renderSceneNow();
          const done = () => {
            renderBusy = false;
            if (renderDirty && !disposed) requestRender();
          };
          if (isSoftwareGl) afterDraw(done);
          else done();
        });
      }

      // Cancel scripted transitions when user grabs OrbitControls
      const onControlsStart = () => {
        camTransitionActive = false;
      };
      const onControlsChange = () => {
        requestRender();
      };
      controls.addEventListener('start', onControlsStart);
      controls.addEventListener('change', onControlsChange);

      const measureAndSyncCamBounds = () => {
        if (!currentAssembly) return;
        currentAssembly.root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(currentAssembly.root);
        const envMm = camRig.rebuildForBounds(box, stateRef.current.camConfig.strategy);
        stateRef.current.onEnvelopeMeasured?.(envMm);
      };

      // Build / Rebuild Assembly
      const rebuildAssembly = () => {
        if (currentAssembly) {
          craftPivot.remove(currentAssembly.root);
          currentAssembly.dispose();
        }
        const s = stateRef.current;
        currentAssembly = buildAerospaceAssembly(
          s.assemblyId,
          s.params,
          s.materials,
          maxAnisotropy,
          isSoftwareGl,
          clippingPlanes,
          s.customDesign,
          s.sbcBlockConfig
        );
        currentAssembly.applyMaterials(
          s.materials,
          s.overlayMode,
          effectsRig.thermalOverlayMaterial
        );
        currentAssembly.updateExploded(currentExploded);
        currentAssembly.updateEngineKinematics?.(crankAngleDeg);
        currentAssembly.updateThrottle?.(s.throttlePct ?? 0);
        craftPivot.add(currentAssembly.root);
        measureAndSyncCamBounds();
        requestRender();
      };

      const updateMaterials = () => {
        if (!currentAssembly) return;
        const s = stateRef.current;
        currentAssembly.applyMaterials(
          s.materials,
          s.overlayMode,
          effectsRig.thermalOverlayMaterial
        );
        requestRender();
      };

      const updateSectionCut = () => {
        const cutVal = stateRef.current.params.sectionCutX;
        const aid = stateRef.current.assemblyId;
        const isAuto = isAutomotiveAssembly(aid);
        const halfExtent = aid === 'custom_build' ? 4.2 : isAuto ? 2.4 : 5.8;
        if (cutVal <= -0.98) {
          clipPlane.constant = 100;
          cutIndicator.visible = false;
        } else {
          const planeX = cutVal * halfExtent;
          clipPlane.constant = planeX;
          cutIndicator.position.set(planeX, aid === 'custom_build' ? 1.1 : isAuto ? 1.65 : 1.2, 0);
          cutIndicator.visible = true;
        }
        requestRender();
      };

      const updateEnvironment = () => {
        const env = stateRef.current.environment;
        bloomPass.strength = stateRef.current.bloomIntensity;

        if (env === 'stratosphere') {
          scene.background = new THREE.Color('#132d52');
          (scene.fog as THREE.FogExp2).color.set('#132d52');
          (scene.fog as THREE.FogExp2).density = 0.014;
          floorGroup.visible = false;
          effectsRig.windStreamlines.visible = false;
          effectsRig.contrails.visible = stateRef.current.assemblyId === 'sbc350';
          keyLight.color.set('#fff7e6');
          keyLight.intensity = 2.6;
          hemiLight.color.set('#93c5fd');
          hemiLight.groundColor.set('#1e3a5f');
          rimLight.color.set('#fbbf24');
          rimLight.intensity = 1.4;
        } else if (env === 'wind_tunnel') {
          scene.background = new THREE.Color('#09101a');
          (scene.fog as THREE.FogExp2).color.set('#09101a');
          (scene.fog as THREE.FogExp2).density = 0.018;
          floorGroup.visible = true;
          effectsRig.windStreamlines.visible = true;
          effectsRig.contrails.visible = false;
          keyLight.color.set('#e0f2fe');
          keyLight.intensity = 1.85;
          hemiLight.color.set('#7dd3fc');
          hemiLight.groundColor.set('#0f172a');
          rimLight.color.set('#38bdf8');
          rimLight.intensity = 1.35;
        } else if (env === 'night_apron') {
          scene.background = new THREE.Color('#05070c');
          (scene.fog as THREE.FogExp2).color.set('#05070c');
          (scene.fog as THREE.FogExp2).density = 0.022;
          floorGroup.visible = true;
          effectsRig.windStreamlines.visible = false;
          effectsRig.contrails.visible = false;
          keyLight.color.set('#dbeafe');
          keyLight.intensity = 1.25;
          hemiLight.color.set('#475569');
          hemiLight.groundColor.set('#090d14');
          rimLight.color.set('#f59e0b');
          rimLight.intensity = 1.9;
        } else {
          // Hangar Studio
          scene.background = new THREE.Color('#0d131c');
          (scene.fog as THREE.FogExp2).color.set('#0d131c');
          (scene.fog as THREE.FogExp2).density = 0.016;
          floorGroup.visible = true;
          effectsRig.windStreamlines.visible = false;
          effectsRig.contrails.visible = false;
          keyLight.color.set('#fff1dc');
          keyLight.intensity = 2.35;
          hemiLight.color.set('#bcd7f7');
          hemiLight.groundColor.set('#1b2330');
          rimLight.color.set('#fbbf24');
          rimLight.intensity = 1.25;
        }
        requestRender();
      };

      const triggerCameraPreset = (preset: CameraPresetId) => {
        const vecs = getCameraPresetVectors(preset, stateRef.current.assemblyId);
        camTargetPos.set(...vecs.pos);
        camTargetLook.set(...vecs.target);
        camTransitionActive = true;
        startContinuousIfNeeded();
      };

      const captureShot = (): string | null => {
        if (disposed) return null;
        renderSceneNow();
        return renderer.domElement.toDataURL('image/png');
      };

      // 4K still capture: render one frame at the requested pixel size, then restore.
      const captureHiResShot = (w: number, h: number): string | null => {
        if (disposed) return null;
        const prevW = container.clientWidth || window.innerWidth;
        const prevH = container.clientHeight || window.innerHeight;
        const prevRatio = renderer.getPixelRatio();
        const prevAspect = camera.aspect;
        renderer.setPixelRatio(1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        composer.setSize(w, h);
        bloomPass.resolution.set(w, h);
        renderSceneNow();
        const url = renderer.domElement.toDataURL('image/png');
        camera.aspect = prevAspect;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(prevRatio);
        renderer.setSize(prevW, prevH, false);
        composer.setSize(prevW, prevH);
        bloomPass.resolution.set(prevW, prevH);
        renderSceneNow();
        return url;
      };

      const updateCamStrategy = () => {
        measureAndSyncCamBounds();
        requestRender();
      };

      const exportStl = (filename: string) => {
        if (!currentAssembly) return null;
        return exportAssemblyToBinaryStl(currentAssembly.root, filename);
      };

      const exportObj = (filename: string) => {
        if (!currentAssembly) return null;
        return exportAssemblyToObj(currentAssembly.root, filename);
      };

      const updateThrottle = () => {
        currentAssembly?.updateThrottle?.(stateRef.current.throttlePct ?? 0);
        requestRender();
      };

      sceneApiRef.current = {
        requestRender,
        rebuildAssembly,
        updateMaterials,
        updateEnvironment,
        updateSectionCut,
        updateCamStrategy,
        updateThrottle,
        triggerCameraPreset,
        captureShot,
        captureHiResShot,
        exportStl,
        exportObj,
      };

      // Initial build
      rebuildAssembly();
      updateEnvironment();
      updateSectionCut();

      // Raycasting on layer 1 (throttled hover + click inspect)
      const raycaster = new THREE.Raycaster();
      raycaster.layers.set(1);
      let lastMoveMs = 0;
      let pointerDownPos = { x: 0, y: 0 };

      const updatePointerNdc = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      };

      const onPointerMove = (e: PointerEvent) => {
        const now = performance.now();
        if (now - lastMoveMs < 60 || !currentAssembly) return;
        lastMoveMs = now;
        updatePointerNdc(e);
        raycaster.setFromCamera(_pointer, camera);
        const hits = raycaster.intersectObjects(currentAssembly.selectableMeshes, false);
        renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
      };

      const onPointerDown = (e: PointerEvent) => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
      };

      const onPointerUp = (e: PointerEvent) => {
        const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
        if (dist > 5 || !currentAssembly) return;
        updatePointerNdc(e);
        raycaster.setFromCamera(_pointer, camera);
        const hits = raycaster.intersectObjects(currentAssembly.selectableMeshes, false);
        if (hits.length > 0) {
          const hitObj = hits[0].object;
          const ud = hitObj.userData;
          if (ud && ud.partName) {
            const sub = ud.subsystem as SubsystemKey;
            stateRef.current.onSelectPart({
              partName: ud.partName,
              partCode: ud.partCode,
              subsystem: sub,
              materialId: (ud.customMaterialId as MaterialId) || stateRef.current.materials[sub],
              massSharePct: ud.massSharePct || 10,
            });
          }
        } else {
          stateRef.current.onSelectPart(null);
        }
      };

      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      // Resize observer
      const resizeObserver = new ResizeObserver(() => {
        if (disposed || !container) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
        bloomPass.resolution.set(w, h);
        requestRender();
      });
      resizeObserver.observe(container);

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        resizeObserver.disconnect();
        controls.removeEventListener('start', onControlsStart);
        controls.removeEventListener('change', onControlsChange);
        controls.dispose();
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

        currentAssembly?.dispose();
        camRig.dispose();
        effectsRig.dispose();
        gridGeo.dispose();
        gridMat.dispose();
        shadowGeo.dispose();
        shadowMat.dispose();
        cutIndicatorGeo.dispose();
        cutIndicatorMat.dispose();
        envTexture.dispose();
        composer.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
        sceneApiRef.current = null;
      };
    }, []);

    // Rebuild procedural geometry when assembly or geometric parameters change
    useEffect(() => {
      sceneApiRef.current?.rebuildAssembly();
    }, [
      assemblyId,
      params.wingspanM,
      params.sweepDeg,
      params.fuselageLengthM,
      params.nacelleScale,
      params.ribDensity,
      customDesign,
      sbcBlockConfig?.boreIn,
      sbcBlockConfig?.strokeIn,
      sbcBlockConfig?.deckClearanceIn,
      sbcBlockConfig?.gasketIn,
      sbcBlockConfig?.headVariant,
      sbcBlockConfig?.inductionStyle,
    ]);

    // Update throttle butterflies without rebuilding geometry
    useEffect(() => {
      sceneApiRef.current?.updateThrottle();
    }, [throttlePct]);

    // Update PBR materials or shader overlay mode without rebuilding geometry
    useEffect(() => {
      sceneApiRef.current?.updateMaterials();
    }, [materials, overlayMode]);

    // Smoothly damp exploded view
    useEffect(() => {
      sceneApiRef.current?.requestRender();
    }, [params.exploded]);

    // Update live section clipping plane
    useEffect(() => {
      sceneApiRef.current?.updateSectionCut();
    }, [params.sectionCutX]);

    // Update environment lighting & post-FX bloom
    useEffect(() => {
      sceneApiRef.current?.updateEnvironment();
    }, [environment, bloomIntensity]);

    // Render quality: cap the pixel ratio (software GL stays at 1)
    useEffect(() => {
      const r = rendererRef.current;
      if (!r) return;
      r.setPixelRatio(isSoftwareGlRef.current ? 1 : Math.min(window.devicePixelRatio, renderQuality ?? 2));
      sceneApiRef.current?.requestRender();
    }, [renderQuality]);

    // Trigger continuous loop when action sequences, CAM sim, engine, or visibility changes
    useEffect(() => {
      sceneApiRef.current?.updateCamStrategy();
      if (isVisible) {
        sceneApiRef.current?.requestRender();
      }
    }, [actionSequence, isVisible, camConfig, engineRunning, targetRpm]);

    // Trigger camera preset transition
    useEffect(() => {
      if (cameraPresetNonce > 0) {
        sceneApiRef.current?.triggerCameraPreset(cameraPreset);
      }
    }, [cameraPreset, cameraPresetNonce]);

    // Suppress unused _vec3A/_vec3B lint if needed (used in extensions)
    void _vec3A;
    void _vec3B;

    return (
      <div className="relative w-full h-full">
        <div ref={mountRef} className="w-full h-full" />
        {contextLost && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0f14] text-slate-200 p-6 text-center">
            <p className="text-base font-semibold">WebGL Rendering Context Suspended</p>
            <p className="text-sm text-slate-400 mt-1">
              Graphics context paused by browser. Attempting automatic recovery.
            </p>
          </div>
        )}
      </div>
    );
  }
);
