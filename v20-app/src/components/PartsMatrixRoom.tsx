/**
 * Quantum Aerospace Room 4: Parts Matrix (Full Matrix Graphics)
 * Visual Subsystem-by-Stage Grid with 3-Line Cards, Thumbnails, Status Badges & Pick-and-Drop
 */
import React, { useState } from 'react';
import { ParametricPartConfig } from '../engine/cadEngine';
import { formatDimension } from '../engine/standards';
import { Grid, Move, Trash2, Crosshair, Eye, Box, ArrowRight, AlertTriangle, Plus } from 'lucide-react';

export interface MatrixItem {
  id: string;
  name: string;
  subsystem: 'Cylinder Head' | 'Intake Plenum' | 'Valvetrain Mount' | 'Cooling Crossover';
  stage: '2D Sketch' | 'Calibrated Photo' | '3D Extrude Mesh' | 'CNC Ready';
  dimensions: string;
  status: 'VERIFIED' | 'NEEDING_MEASUREMENT' | 'PROVISIONAL';
  material: string;
  config: ParametricPartConfig;
}

const INITIAL_MATRIX_ITEMS: MatrixItem[] = [
  {
    id: 'pm-1',
    name: 'SBC 350 Camless Flange Plate',
    subsystem: 'Cylinder Head',
    stage: '3D Extrude Mesh',
    dimensions: '19.685" × 4.400" × 0.625"',
    status: 'NEEDING_MEASUREMENT',
    material: '6061-T6 Aluminum',
    config: {
      name: 'SBC 350 Camless Flange Plate',
      subsystem: 'Cylinder Head',
      widthIn: 19.685,
      heightIn: 4.4,
      thicknessIn: 0.625,
      cornerRadiusIn: 0.375,
      hasCornerHoles: true,
      cornerHoleDiaIn: 0.4375,
      cornerHoleMarginIn: 0.75,
      hasBoltCircle: false,
      boltCircleCount: 17,
      boltCirclePcdIn: 4.4,
      boltCircleHoleDiaIn: 0.4375,
      hasCenterSlot: true,
      slotLengthIn: 2.5,
      slotWidthIn: 1.25,
      materialName: '6061-T6 Aluminum',
      tierId: 'tier2_jobshop',
    },
  },
  {
    id: 'pm-2',
    name: "Ray's 500mm Head Shop Photo",
    subsystem: 'Cylinder Head',
    stage: 'Calibrated Photo',
    dimensions: '40.37" × 31.21" (335.5px)',
    status: 'VERIFIED',
    material: 'Shop Reference Plane',
    config: {
      name: 'Camless Head Calibration Plane',
      subsystem: 'Cylinder Head',
      widthIn: 19.685,
      heightIn: 4.4,
      thicknessIn: 0.25,
      cornerRadiusIn: 0.2,
      hasCornerHoles: false,
      cornerHoleDiaIn: 0.25,
      cornerHoleMarginIn: 0.5,
      hasBoltCircle: false,
      boltCircleCount: 0,
      boltCirclePcdIn: 0,
      boltCircleHoleDiaIn: 0,
      hasCenterSlot: false,
      slotLengthIn: 0,
      slotWidthIn: 0,
      materialName: '6061-T6 Aluminum',
      tierId: 'tier2_jobshop',
    },
  },
  {
    id: 'pm-3',
    name: 'MPFI Intake Runner Flange',
    subsystem: 'Intake Plenum',
    stage: '2D Sketch',
    dimensions: '18.500" × 3.750" × 0.500"',
    status: 'PROVISIONAL',
    material: '7075-T6 Aluminum',
    config: {
      name: 'MPFI Intake Runner Flange',
      subsystem: 'Intake Plenum',
      widthIn: 18.5,
      heightIn: 3.75,
      thicknessIn: 0.5,
      cornerRadiusIn: 0.25,
      hasCornerHoles: true,
      cornerHoleDiaIn: 0.375,
      cornerHoleMarginIn: 0.5,
      hasBoltCircle: false,
      boltCircleCount: 0,
      boltCirclePcdIn: 0,
      boltCircleHoleDiaIn: 0,
      hasCenterSlot: true,
      slotLengthIn: 2.0,
      slotWidthIn: 1.5,
      materialName: '7075-T6 Aluminum',
      tierId: 'tier3_precision',
    },
  },
  {
    id: 'pm-4',
    name: 'Thermostat Water Neck Mount',
    subsystem: 'Cooling Crossover',
    stage: 'CNC Ready',
    dimensions: '4.250" × 3.500" × 0.500"',
    status: 'VERIFIED',
    material: '6061-T6 Aluminum',
    config: {
      name: 'Thermostat Water Neck Mount',
      subsystem: 'Cooling Crossover',
      widthIn: 4.25,
      heightIn: 3.5,
      thicknessIn: 0.5,
      cornerRadiusIn: 0.5,
      hasCornerHoles: true,
      cornerHoleDiaIn: 0.375,
      cornerHoleMarginIn: 0.5,
      hasBoltCircle: true,
      boltCircleCount: 2,
      boltCirclePcdIn: 3.25,
      boltCircleHoleDiaIn: 0.375,
      hasCenterSlot: false,
      slotLengthIn: 0,
      slotWidthIn: 0,
      materialName: '6061-T6 Aluminum',
      tierId: 'tier2_jobshop',
    },
  },
  {
    id: 'pm-5',
    name: 'Actuator Radial Bracket',
    subsystem: 'Valvetrain Mount',
    stage: '3D Extrude Mesh',
    dimensions: '4.500" × 1.850" × 0.375"',
    status: 'NEEDING_MEASUREMENT',
    material: 'Ti-6Al-4V Titanium',
    config: {
      name: 'Actuator Radial Bracket',
      subsystem: 'Valvetrain Mount',
      widthIn: 4.5,
      heightIn: 1.85,
      thicknessIn: 0.375,
      cornerRadiusIn: 0.2,
      hasCornerHoles: true,
      cornerHoleDiaIn: 0.25,
      cornerHoleMarginIn: 0.35,
      hasBoltCircle: false,
      boltCircleCount: 0,
      boltCirclePcdIn: 0,
      boltCircleHoleDiaIn: 0,
      hasCenterSlot: true,
      slotLengthIn: 1.25,
      slotWidthIn: 0.6,
      materialName: 'Ti-6Al-4V Titanium',
      tierId: 'tier4_aerospace',
    },
  },
];

const SUBSYSTEMS = [
  'Cylinder Head',
  'Intake Plenum',
  'Valvetrain Mount',
  'Cooling Crossover',
] as const;

const STAGES = ['2D Sketch', 'Calibrated Photo', '3D Extrude Mesh', 'CNC Ready'] as const;

interface PartsMatrixRoomProps {
  displayMetric: boolean;
  onLoadPartToBench: (config: ParametricPartConfig) => void;
  onNavigateToCalibration: () => void;
  onNavigateToInspect: () => void;
}

export const PartsMatrixRoom: React.FC<PartsMatrixRoomProps> = ({
  displayMetric,
  onLoadPartToBench,
  onNavigateToCalibration,
  onNavigateToInspect,
}) => {
  const [items, setItems] = useState<MatrixItem[]>(INITIAL_MATRIX_ITEMS);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (subsystem: MatrixItem['subsystem'], stage: MatrixItem['stage']) => {
    if (!draggedItemId) return;
    setItems((prev) =>
      prev.map((item) => (item.id === draggedItemId ? { ...item, subsystem, stage } : item))
    );
    setDraggedItemId(null);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="flex flex-col space-y-5 p-5 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center space-x-2">
            <Grid className="w-5 h-5 text-sky-400" />
            <span>PARTS MATRIX &amp; SUBSYSTEM GRAPHICS</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Full Matrix Graphics — Pick-and-Drop Parts Across Stages or Onto Active Build Bench
          </p>
        </div>

        <button
          onClick={() => {
            const newItem: MatrixItem = {
              id: `pm-${Date.now()}`,
              name: `Custom Plate #${items.length + 1}`,
              subsystem: 'Cylinder Head',
              stage: '2D Sketch',
              dimensions: '8.000" × 4.000" × 0.500"',
              status: 'NEEDING_MEASUREMENT',
              material: '6061-T6 Aluminum',
              config: {
                name: `Custom Plate #${items.length + 1}`,
                subsystem: 'Cylinder Head',
                widthIn: 8,
                heightIn: 4,
                thicknessIn: 0.5,
                cornerRadiusIn: 0.25,
                hasCornerHoles: true,
                cornerHoleDiaIn: 0.375,
                cornerHoleMarginIn: 0.5,
                hasBoltCircle: false,
                boltCircleCount: 0,
                boltCirclePcdIn: 0,
                boltCircleHoleDiaIn: 0,
                hasCenterSlot: false,
                slotLengthIn: 0,
                slotWidthIn: 0,
                materialName: '6061-T6 Aluminum',
                tierId: 'tier2_jobshop',
              },
            };
            setItems([...items, newItem]);
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded text-xs font-mono transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Part</span>
        </button>
      </div>

      {/* 4x4 Grid Matrix */}
      <div className="overflow-x-auto">
        <div className="min-w-[780px] bg-slate-900 border border-slate-800 rounded-lg p-3">
          {/* Grid Stage Columns Header */}
          <div className="grid grid-cols-5 gap-2 text-xs font-mono font-bold text-center border-b border-slate-800 pb-2 mb-2">
            <div className="text-left text-slate-400 pl-2">SUBSYSTEM</div>
            {STAGES.map((stg) => (
              <div key={stg} className="text-sky-400">
                {stg.toUpperCase()}
              </div>
            ))}
          </div>

          {/* Subsystem Rows */}
          <div className="space-y-2">
            {SUBSYSTEMS.map((subsys) => (
              <div key={subsys} className="grid grid-cols-5 gap-2 items-stretch">
                {/* Row Subsystem Title */}
                <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded text-xs font-mono flex flex-col justify-center">
                  <span className="font-bold text-slate-200">{subsys}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">SBC 350 Assembly</span>
                </div>

                {/* 4 Stage Droppable Cells */}
                {STAGES.map((stg) => {
                  const cellItems = items.filter((i) => i.subsystem === subsys && i.stage === stg);

                  return (
                    <div
                      key={stg}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(subsys, stg)}
                      className="min-h-[110px] p-2 bg-slate-950/40 border border-slate-800/80 rounded flex flex-col space-y-1.5 transition-colors hover:border-sky-500/50"
                    >
                      {cellItems.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(item.id)}
                          className="group relative p-2 bg-slate-900 border border-slate-700 rounded cursor-grab active:cursor-grabbing hover:border-sky-400 transition-all text-xs font-mono shadow-sm"
                        >
                          {/* Visual thumbnail / SVG preview */}
                          <div className="h-10 bg-slate-950 rounded mb-1.5 border border-slate-800 flex items-center justify-center overflow-hidden">
                            <div className="w-12 h-6 border border-sky-400/80 rounded-sm bg-sky-950/40 flex items-center justify-center text-[9px] text-sky-300">
                              3D
                            </div>
                          </div>

                          {/* 3-Line Card (Name, Dimensions, Status) */}
                          <div className="font-bold text-slate-200 text-[11px] truncate" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{item.dimensions}</div>
                          <div className="mt-1 flex items-center justify-between">
                            {item.status === 'VERIFIED' ? (
                              <span className="text-[9px] px-1 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-600/50 rounded font-bold">
                                PASS
                              </span>
                            ) : item.status === 'NEEDING_MEASUREMENT' ? (
                              <span className="text-[9px] px-1 py-0.2 bg-amber-950 text-amber-400 border border-dashed border-amber-600/60 rounded font-bold">
                                NEEDING RAY'S
                              </span>
                            ) : (
                              <span className="text-[9px] px-1 py-0.2 bg-amber-950/60 text-amber-300 border border-amber-600/40 rounded font-bold">
                                PROVISIONAL
                              </span>
                            )}

                            {/* Drag handle */}
                            <Move className="w-3 h-3 text-slate-500 group-hover:text-sky-400" />
                          </div>

                          {/* Quick Actions overlay on hover */}
                          <div className="mt-2 pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
                            <button
                              onClick={() => onLoadPartToBench(item.config)}
                              className="text-sky-400 hover:text-sky-300 font-bold"
                              title="Load onto Active 3D Bench"
                            >
                              Load Bench
                            </button>
                            <button
                              onClick={() => handleRemove(item.id)}
                              className="text-slate-500 hover:text-red-400"
                              title="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
