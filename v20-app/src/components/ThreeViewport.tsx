/**
 * Quantum Aerospace Pinned 3D Viewport
 * Three.js WebGLRenderer with live ExtrudeGeometry, Slice Plane, Orbit Controls, and Calibrated Photo Overlay
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ParametricPartConfig, buildExtrudedGeometry } from '../engine/cadEngine';
import { Eye, Layers, Compass, ZoomIn, ZoomOut, RotateCcw, AlertTriangle } from 'lucide-react';

interface ThreeViewportProps {
  config: ParametricPartConfig;
  slicePercent: number; // 0 to 100
  showCalibratedPhoto: boolean;
  photoUrl?: string;
  wireframe: boolean;
  onSliceChange: (percent: number) => void;
  onWireframeToggle: () => void;
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  config,
  slicePercent,
  showCalibratedPhoto,
  photoUrl,
  wireframe,
  onSliceChange,
  onWireframeToggle,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const wireMeshRef = useRef<THREE.LineSegments | null>(null);
  const photoPlaneRef = useRef<THREE.Mesh | null>(null);
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, -1), 10));

  // Camera Orbit state
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 24, theta: Math.PI / 4, phi: Math.PI / 3 });
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  const [cameraMode, setCameraMode] = useState<'ISO' | 'TOP' | 'FRONT'>('ISO');

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0f1d');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.4);
    dirLight1.position.set(20, 30, 25);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-20, -20, 20);
    scene.add(dirLight2);

    // Grid & Axes
    const grid = new THREE.GridHelper(30, 30, 0x0284c7, 0x1e293b);
    grid.rotation.x = Math.PI / 2; // XY plane bench
    grid.position.z = -config.thicknessIn / 2 - 0.05;
    scene.add(grid);

    const axes = new THREE.AxesHelper(5);
    scene.add(axes);

    // Bench reference ring / datum
    const datumGeom = new THREE.RingGeometry(9.5, 9.6, 64);
    const datumMat = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide });
    const datumMesh = new THREE.Mesh(datumGeom, datumMat);
    datumMesh.position.z = -config.thicknessIn / 2 - 0.04;
    scene.add(datumMesh);

    // Animation frame
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Update camera position from spherical coords
      if (camera && targetRef.current) {
        const { radius, theta, phi } = sphericalRef.current;
        const x = targetRef.current.x + radius * Math.sin(phi) * Math.sin(theta);
        const y = targetRef.current.y + radius * Math.cos(phi);
        const z = targetRef.current.z + radius * Math.sin(phi) * Math.cos(theta);
        camera.position.set(x, y, z);
        camera.lookAt(targetRef.current);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Mesh when config changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      meshRef.current = null;
    }
    if (wireMeshRef.current) {
      scene.remove(wireMeshRef.current);
      wireMeshRef.current.geometry.dispose();
      wireMeshRef.current = null;
    }

    const geometry = buildExtrudedGeometry(config);

    // Material with clipping plane support for slicing
    const material = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // cool blue/cyan aerospace primary
      roughness: 0.25,
      metalness: 0.8,
      clippingPlanes: [clipPlaneRef.current],
      clipShadows: true,
      side: THREE.DoubleSide,
      wireframe: wireframe,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshRef.current = mesh;

    // Subtle edge lines for CAD clarity
    const edges = new THREE.EdgesGeometry(geometry, 25);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x7dd3fc,
      linewidth: 1,
      clippingPlanes: [clipPlaneRef.current],
    });
    const wireMesh = new THREE.LineSegments(edges, lineMat);
    scene.add(wireMesh);
    wireMeshRef.current = wireMesh;
  }, [config, wireframe]);

  // Update Slice Plane
  useEffect(() => {
    const halfThick = config.thicknessIn / 2;
    // slicePercent: 0% = full part visible (clip plane at +halfThick + 0.1)
    // 100% = fully sliced away (clip plane at -halfThick - 0.1)
    const normalized = (slicePercent / 100) * (config.thicknessIn + 0.2);
    const zPos = halfThick + 0.1 - normalized;

    clipPlaneRef.current.constant = zPos;
  }, [slicePercent, config.thicknessIn]);

  // Calibrated Photo Overlay plane
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (photoPlaneRef.current) {
      scene.remove(photoPlaneRef.current);
      photoPlaneRef.current.geometry.dispose();
      photoPlaneRef.current = null;
    }

    if (showCalibratedPhoto) {
      // Ray's SBC 350 calibrated footprint: 40.37 in x 31.21 in
      const planeW = 40.37;
      const planeH = 31.21;
      const planeGeom = new THREE.PlaneGeometry(planeW, planeH);

      // Create procedural calibrated shop texture if no custom photoUrl
      const canvas = document.createElement('canvas');
      canvas.width = 688;
      canvas.height = 532;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Dark shop floor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 688, 532);

        // Grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x <= 688; x += 34) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 532);
          ctx.stroke();
        }
        for (let y = 0; y <= 532; y += 34) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(688, y);
          ctx.stroke();
        }

        // SBC 350 Head casting silhouette (500 mm / 335.5 px span)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        const cx = 344;
        const cy = 266;
        const halfSpan = 335.5 / 2;
        ctx.strokeRect(cx - halfSpan, cy - 65, 335.5, 130);

        // 17 Bolt holes reference
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#f59e0b';
        for (let i = 0; i < 4; i++) {
          const bx = cx - halfSpan + 35 + i * 75;
          ctx.beginPath();
          ctx.arc(bx, cy - 45, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(bx + 35, cy + 45, 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Calibration baseline annotation
        ctx.fillStyle = '#38bdf8';
        ctx.font = '14px monospace';
        ctx.fillText("RAY'S SBC 350 CAMLESS HEAD REF (500mm / 19.685in = 335.5px)", cx - 220, cy - 80);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText("17-BOLT ENVELOPE [NEEDING RAY'S MEASUREMENT]", cx - 180, cy + 95);
      }

      const texture = new THREE.CanvasTexture(canvas);
      const planeMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });

      const plane = new THREE.Mesh(planeGeom, planeMat);
      plane.position.z = -config.thicknessIn / 2 - 0.03;
      scene.add(plane);
      photoPlaneRef.current = plane;
    }
  }, [showCalibratedPhoto, config.thicknessIn]);

  // Camera presets
  const setIsoView = () => {
    setCameraMode('ISO');
    sphericalRef.current = { radius: 24, theta: Math.PI / 4, phi: Math.PI / 3 };
    targetRef.current.set(0, 0, 0);
  };

  const setTopView = () => {
    setCameraMode('TOP');
    sphericalRef.current = { radius: 22, theta: 0, phi: 0.001 };
    targetRef.current.set(0, 0, 0);
  };

  const setFrontView = () => {
    setCameraMode('FRONT');
    sphericalRef.current = { radius: 22, theta: 0, phi: Math.PI / 2 };
    targetRef.current.set(0, 0, 0);
  };

  // Mouse drag handlers for Orbit
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) isDraggingRef.current = true;
    if (e.button === 2) isPanningRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current && !isPanningRef.current) return;
    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current) {
      sphericalRef.current.theta -= dx * 0.008;
      sphericalRef.current.phi = Math.max(0.01, Math.min(Math.PI - 0.01, sphericalRef.current.phi - dy * 0.008));
    } else if (isPanningRef.current) {
      targetRef.current.x -= dx * 0.03;
      targetRef.current.y += dy * 0.03;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    sphericalRef.current.radius = Math.max(4, Math.min(60, sphericalRef.current.radius + e.deltaY * 0.02));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-xl select-none">
      {/* 3D Viewport Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
          <span className="font-mono font-semibold text-slate-200">PINNED 3D VIEWPORT</span>
          <span className="text-slate-500 font-mono">| THREE.ExtrudeGeometry</span>
        </div>

        {/* Camera Views */}
        <div className="flex items-center space-x-1">
          <button
            onClick={setIsoView}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
              cameraMode === 'ISO' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ISO
          </button>
          <button
            onClick={setTopView}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
              cameraMode === 'TOP' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            TOP
          </button>
          <button
            onClick={setFrontView}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
              cameraMode === 'FRONT' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            FRONT
          </button>
          <button
            onClick={onWireframeToggle}
            title="Toggle Wireframe"
            className={`p-1 rounded text-xs transition-colors ${
              wireframe ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className="relative flex-1 min-h-[340px] cursor-grab active:cursor-grabbing overflow-hidden"
      >
        {/* On-screen Status Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col space-y-1 text-[11px] font-mono pointer-events-none">
          <div className="flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur px-2 py-1 rounded border border-slate-700 text-slate-300">
            <span className="text-sky-400 font-bold">{config.name}</span>
            <span>({config.widthIn.toFixed(2)}" × {config.heightIn.toFixed(2)}" × {config.thicknessIn.toFixed(3)}")</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur px-2 py-1 rounded border border-slate-700 text-slate-400">
            <span>Material: {config.materialName}</span>
          </div>

          {/* Honest Capability Notice Badge */}
          <div className="flex items-center space-x-1.5 bg-amber-950/60 backdrop-blur px-2 py-0.5 rounded border border-amber-600/50 text-amber-400 text-[10px]">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Extrude Approximation — NOT Real B-Rep Kernel</span>
          </div>
        </div>

        {/* Viewport controls overlay bottom right */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col space-y-1 bg-slate-900/80 backdrop-blur p-1 rounded border border-slate-800 text-slate-400">
          <button
            onClick={() => {
              sphericalRef.current.radius = Math.max(4, sphericalRef.current.radius - 3);
            }}
            className="p-1 hover:text-sky-400 hover:bg-slate-800 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              sphericalRef.current.radius = Math.min(60, sphericalRef.current.radius + 3);
            }}
            className="p-1 hover:text-sky-400 hover:bg-slate-800 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={setIsoView} className="p-1 hover:text-sky-400 hover:bg-slate-800 rounded" title="Reset View">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slice Part Tooling Resource Bar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-200">SLICE PART:</span>
          <span className="text-sky-400 font-bold">{slicePercent}%</span>
        </div>
        <div className="flex-1 mx-4 max-w-xs">
          <input
            type="range"
            min="0"
            max="100"
            value={slicePercent}
            onChange={(e) => onSliceChange(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
          />
        </div>
        <button
          onClick={() => onSliceChange(slicePercent > 0 ? 0 : 50)}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
        >
          {slicePercent > 0 ? 'Clear Slice' : '50% Cut'}
        </button>
      </div>
    </div>
  );
};
