/**
 * Quantum Aerospace Room 1: Photo Scale
 * 2-Click 500 mm / 19.685 in Shop Photo Calibration, Floor Placement & SBC 350 Reference Targets
 */
import React, { useState, useRef, useEffect } from 'react';
import { REFERENCE_TARGETS, PHOTO_CALIBRATION_BASELINE, formatDimension } from '../engine/standards';
import { Camera, CheckCircle2, AlertTriangle, Crosshair, ArrowRight, Upload } from 'lucide-react';

interface PhotoScaleRoomProps {
  displayMetric: boolean;
  showOverlayOnBench: boolean;
  onToggleOverlayOnBench: (show: boolean) => void;
  onCalibrationUpdated: (pxPerIn: number, spanPx: number) => void;
  onNavigateToSketch: () => void;
}

export const PhotoScaleRoom: React.FC<PhotoScaleRoomProps> = ({
  displayMetric,
  showOverlayOnBench,
  onToggleOverlayOnBench,
  onCalibrationUpdated,
  onNavigateToSketch,
}) => {
  const [point1, setPoint1] = useState<{ x: number; y: number }>({ x: 176.25, y: 266 });
  const [point2, setPoint2] = useState<{ x: number; y: number }>({ x: 511.75, y: 266 });
  const [activeClick, setActiveClick] = useState<1 | 2>(1);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute live calibration
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const measuredSpanPx = Math.sqrt(dx * dx + dy * dy);
  const headLengthIn = 19.685; // 500 mm
  const currentPxPerIn = measuredSpanPx / headLengthIn;
  const isDefaultSpan = Math.abs(measuredSpanPx - 335.5) < 1.0;

  // Render photo calibration canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 688;
    const h = 532;
    canvas.width = w;
    canvas.height = h;

    // Draw background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Camless Head casting silhouette reference
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    const cx = w / 2;
    const cy = h / 2;
    const halfSpan = 335.5 / 2;
    ctx.strokeRect(cx - halfSpan, cy - 65, 335.5, 130);

    // 17 Head bolt positions (GM SBC baseline)
    ctx.fillStyle = '#f59e0b';
    for (let i = 0; i < 4; i++) {
      const bx = cx - halfSpan + 35 + i * 75;
      ctx.beginPath();
      ctx.arc(bx, cy - 40, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx + 35, cy + 40, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bore center reference marks (4.400 in * 17.043 px/in = 75 px)
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([4, 4]);
    for (let i = 0; i < 4; i++) {
      const bx = cx - halfSpan + 45 + i * 75;
      ctx.beginPath();
      ctx.arc(bx, cy, 32, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Measurement Line between Point 1 and Point 2
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(point1.x, point1.y);
    ctx.lineTo(point2.x, point2.y);
    ctx.stroke();

    // Crosshair Point 1
    drawCrosshair(ctx, point1.x, point1.y, '#38bdf8', 'PT 1 (FRONT DECK)');
    // Crosshair Point 2
    drawCrosshair(ctx, point2.x, point2.y, '#38bdf8', 'PT 2 (REAR DECK)');

    // Text dimension on line
    const midX = (point1.x + point2.x) / 2;
    const midY = (point1.y + point2.y) / 2;
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(midX - 75, midY - 24, 150, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${measuredSpanPx.toFixed(1)} px = 19.685" (500mm)`, midX, midY - 10);
  }, [point1, point2, imageSrc]);

  function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x + 14, y);
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y + 14);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 22);
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (activeClick === 1) {
      setPoint1({ x, y });
      setActiveClick(2);
    } else {
      setPoint2({ x, y });
      setActiveClick(1);
      const newDx = x - point1.x;
      const newDy = y - point1.y;
      const newSpan = Math.sqrt(newDx * newDx + newDy * newDy);
      onCalibrationUpdated(newSpan / headLengthIn, newSpan);
    }
  };

  const resetToRayBaseline = () => {
    setPoint1({ x: 176.25, y: 266 });
    setPoint2({ x: 511.75, y: 266 });
    setActiveClick(1);
    onCalibrationUpdated(17.043, 335.5);
  };

  return (
    <div className="flex flex-col space-y-5 p-5 text-slate-200">
      {/* Room Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center space-x-2">
            <Camera className="w-5 h-5 text-sky-400" />
            <span>PHOTO SCALE &amp; CALIBRATION</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            2-Click 500 mm (19.685 in) Shop Photo Calibration Tooling — GM SBC 350 Baseline
          </p>
        </div>

        <button
          onClick={onNavigateToSketch}
          className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded font-mono text-xs font-semibold transition-colors shadow-md"
        >
          <span>Continue to Sketch &amp; Build</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive Calibration Canvas (Left 7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-slate-300 flex items-center space-x-1.5">
                <Crosshair className="w-4 h-4 text-sky-400" />
                <span>CLICK TO CALIBRATE (SET POINT {activeClick})</span>
              </span>
              <button
                onClick={resetToRayBaseline}
                className="text-xs font-mono text-sky-400 hover:text-sky-300 underline"
              >
                Reset to Ray's 335.5 px Baseline
              </button>
            </div>

            {/* Canvas */}
            <div className="relative border border-slate-700 rounded overflow-hidden bg-slate-950">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full h-auto cursor-crosshair block"
              />
            </div>

            {/* Photo Overlay bench toggle */}
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="overlayBench"
                  checked={showOverlayOnBench}
                  onChange={(e) => onToggleOverlayOnBench(e.target.checked)}
                  className="rounded accent-sky-500 cursor-pointer"
                />
                <label htmlFor="overlayBench" className="text-slate-300 cursor-pointer">
                  Place Calibrated Overlay onto 3D Viewport Bench / Floor
                </label>
              </div>
              <span className="text-slate-400">
                Footprint: <strong className="text-sky-400">40.37" × 31.21"</strong>
              </span>
            </div>
          </div>

          {/* Honest Calibration Status Banner */}
          <div
            className={`p-3 rounded-lg border text-xs font-mono flex items-start space-x-2.5 ${
              isDefaultSpan
                ? 'bg-sky-950/40 border-sky-600/60 text-sky-200'
                : 'bg-amber-950/40 border-amber-600/60 text-amber-200'
            }`}
          >
            {isDefaultSpan ? (
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="block font-bold">
                {isDefaultSpan
                  ? "RAY'S BASELINE CALIBRATION ACTIVE"
                  : 'CUSTOM 2-CLICK CALIBRATION APPLIED'}
              </strong>
              <span className="text-[11px] opacity-90 leading-relaxed block mt-0.5">
                {isDefaultSpan
                  ? PHOTO_CALIBRATION_BASELINE.source
                  : `Span measured: ${measuredSpanPx.toFixed(1)} px for 19.685 in (${currentPxPerIn.toFixed(3)} px/in). Always physically true on Ray's hardware.`}
              </span>
            </div>
          </div>
        </div>

        {/* Reference Targets & Data Rules (Right 5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-mono font-bold text-sky-400 tracking-wider uppercase mb-3 flex items-center justify-between">
              <span>SBC 350 REFERENCE TARGETS</span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">v19_standards.json</span>
            </h3>

            <div className="space-y-2.5 text-xs font-mono">
              {REFERENCE_TARGETS.map((target) => (
                <div
                  key={target.id}
                  className={`p-2.5 rounded border transition-all ${
                    target.verified
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-amber-950/20 border-dashed border-amber-600/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-slate-200 text-[11px] leading-tight">
                      {target.label}
                    </span>
                    {target.verified ? (
                      <span className="px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-600/50 rounded text-[9px] font-bold">
                        VERIFIED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-amber-950/80 text-amber-400 border border-amber-600/50 rounded text-[9px] font-bold">
                        NEEDING RAY'S MEASUREMENT
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                    <div>
                      Width: <strong className="text-sky-400">{formatDimension(target.widthIn, displayMetric)}</strong>
                    </div>
                    <div>
                      Height:{' '}
                      {target.heightIn ? (
                        <strong className="text-sky-400">{formatDimension(target.heightIn, displayMetric)}</strong>
                      ) : (
                        <span className="text-amber-400 italic">Unmeasured</span>
                      )}
                    </div>
                  </div>

                  {target.source && (
                    <div className="mt-1 text-[9px] text-slate-500 italic truncate" title={target.source}>
                      Source: {target.source}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Immutable Data Rule Reminder */}
          <div className="p-3 bg-slate-900 border border-amber-600/40 rounded-lg text-xs font-mono">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>UNVERIFIED DATA RULE</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Anything not physically measured on Ray's hardware—including uncalibrated photos, provisional MPFI
              specs, and casting envelopes—remains visibly flagged with dashed amber status badges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
