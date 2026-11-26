/**
 * Quantum Aerospace Room 6: About & Standards
 * 13-File Bundle Manifest, Honest Capability Status, and Framework Disclaimers
 */
import React from 'react';
import { V19_STANDARDS } from '../engine/standards';
import { Info, ShieldAlert, CheckCircle2, AlertTriangle, FileCode2, BookOpen } from 'lucide-react';

export const AboutStandardsDrawer: React.FC = () => {
  const manifest = [
    {
      slot: 1,
      name: 'README.md',
      desc: 'Studio documentation, honesty matrix, SBC baseline, and transfer spec',
      status: 'VERIFIED_ACTIVE',
    },
    {
      slot: 2,
      name: 'index.html',
      desc: 'Studio entry point, room layout, pinned 3D viewport, and interactive UI',
      status: 'VERIFIED_ACTIVE',
    },
    {
      slot: 3,
      name: 'webgpuComputeEngineV19.js',
      desc: 'WebGPU/WebGL2 graphics capability probe + WGSL @workgroup_size(64) compute template',
      status: 'INTAKE_READY',
    },
    {
      slot: 4,
      name: 'manifoldBrepEngineV19.js',
      desc: 'THREE.ExtrudeGeometry solid builder, cutout loops, binary .STL, .DXF, and .JSON export',
      status: 'INTAKE_READY',
    },
    {
      slot: 5,
      name: 'parametricFeatureEngineV19.js',
      desc: 'Bolt circle, corner hole, oblong slot generators, and DFM checks',
      status: 'INTAKE_READY',
    },
    {
      slot: 6,
      name: 'drawingSheetRendererV19.js',
      desc: 'Live SVG orthographic plan/section view, datum reference frame, and title block renderer',
      status: 'INTAKE_READY',
    },
    {
      slot: 7,
      name: 'futureTechEngineV19.js',
      desc: 'RDP contour simplification and MBD JSON transfer/report packet builder',
      status: 'INTAKE_READY',
    },
    {
      slot: 8,
      name: '[SLOT 8 RESERVED]',
      desc: 'Awaiting archive intake verification',
      status: 'PENDING_VERIFICATION',
    },
    {
      slot: 9,
      name: '[SLOT 9 RESERVED]',
      desc: 'Awaiting archive intake verification',
      status: 'PENDING_VERIFICATION',
    },
    {
      slot: 10,
      name: '[SLOT 10 RESERVED]',
      desc: 'Awaiting archive intake verification',
      status: 'PENDING_VERIFICATION',
    },
    {
      slot: 11,
      name: '[SLOT 11 RESERVED]',
      desc: 'Awaiting archive intake verification',
      status: 'PENDING_VERIFICATION',
    },
    {
      slot: 12,
      name: '[SLOT 12 RESERVED]',
      desc: 'Awaiting archive intake verification',
      status: 'PENDING_VERIFICATION',
    },
    {
      slot: 13,
      name: '[SLOT 13 RESERVED]',
      desc: 'Awaiting archive intake verification',
      status: 'PENDING_VERIFICATION',
    },
  ];

  return (
    <div className="flex flex-col space-y-6 p-5 text-slate-200 font-mono text-xs">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          <span>ABOUT &amp; STANDARDS SPECIFICATION</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Bundle ID: <strong className="text-sky-400">BM-04-FUTURE-TECH-V19</strong> | 13-File Flat-Root Archive Manifest
        </p>
      </div>

      {/* Honest Capability Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-sky-400" />
          <span>HONEST CAPABILITY MATRIX (IMPLEMENTED VS. NOT YET WORKING)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2 px-3">Capability / Module</th>
                <th className="py-2 px-3">Honest Implementation Status</th>
                <th className="py-2 px-3">Technical Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">2D Sketch, Trace &amp; Extrude</td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600/50 rounded text-[9px] font-bold">
                    IMPLEMENTED (Extrude-Only)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  2-click photo calibration, calibrated floor placement, tracing, and THREE.ExtrudeGeometry.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">Manifold / B-Rep Engine</td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-600/50 rounded text-[9px] font-bold">
                    Extrude Approx — NOT Real B-Rep
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  Extruded polygonal faces with cutout loops. NO watertight manifold guarantee (<code className="text-amber-400">NOT YET WORKING</code> as true B-Rep).
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">WebGPU Compute Engine</td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-600/50 rounded text-[9px] font-bold">
                    Detection + Template ONLY
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  Inspects WebGPU / WebGL2 adapter and holds WGSL compute template. NOT a running dispatch pipeline.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">Parametric Features</td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600/50 rounded text-[9px] font-bold">
                    Browser-Functional
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  Bolt circles, corner holes, oblong slots, and multi-technique DFM checks evaluated on profile.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">Drawing Sheet Renderer</td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600/50 rounded text-[9px] font-bold">
                    Browser-Functional (Live SVG)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  Live SVG orthographic plan/section views, datum reference frame [A, B, C], and title block.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">Export &amp; MBD Packet</td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600/50 rounded text-[9px] font-bold">
                    Binary .STL, 2D .DXF, .JSON Packet
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  Exports real .STL, .DXF, and JSON MBD packets. NOT a real STEP AP242 Part 21 file (<code className="text-amber-400">NOT YET WORKING</code> for native STEP).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Standards & Framework Disclaimers */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-2">
          <Info className="w-4 h-4 text-sky-400" />
          <span>STANDARDS &amp; FRAMEWORK DISCLAIMERS</span>
        </h3>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          References inside metadata, exports, or this drawer to the following specifications are{' '}
          <strong className="text-slate-200">framework and schema references ONLY</strong>:
        </p>

        <ul className="space-y-2 text-[11px] text-slate-300">
          <li className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-start space-x-2">
            <span className="text-sky-400 font-bold">•</span>
            <div>
              <strong>NIST SP 800-207 (Zero Trust Architecture):</strong> Reference metadata only;{' '}
              <span className="text-amber-400 font-bold">NOT certified / NOT audited</span>.
            </div>
          </li>
          <li className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-start space-x-2">
            <span className="text-sky-400 font-bold">•</span>
            <div>
              <strong>NIST AI RMF (AI Risk Management Framework):</strong> Reference metadata only;{' '}
              <span className="text-amber-400 font-bold">NOT certified / NOT audited</span>.
            </div>
          </li>
          <li className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-start space-x-2">
            <span className="text-sky-400 font-bold">•</span>
            <div>
              <strong>NIST IR 8547 (Post-Quantum Cryptography Readiness):</strong> Readiness metadata placeholder only;{' '}
              <span className="text-amber-400 font-bold">NOT certified / NOT PQC-compliant</span>.
            </div>
          </li>
          <li className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-start space-x-2">
            <span className="text-sky-400 font-bold">•</span>
            <div>
              <strong>ISO 10303-242 (STEP AP242):</strong> Naming and schema reference for JSON MBD fields only;{' '}
              <span className="text-amber-400 font-bold">NOT a compliant ISO 10303-242 Part 21 STEP file</span>.
            </div>
          </li>
        </ul>
      </div>

      {/* 13-File Manifest */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-2">
          <FileCode2 className="w-4 h-4 text-sky-400" />
          <span>FLAT-ROOT 13-FILE ARCHIVE MANIFEST (BM-04-FUTURE-TECH-V19)</span>
        </h3>

        <div className="space-y-1.5">
          {manifest.map((item) => (
            <div
              key={item.slot}
              className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center justify-between text-[11px]"
            >
              <div className="flex items-center space-x-2">
                <span className="w-5 text-slate-500 font-bold text-right">{item.slot}.</span>
                <code className="text-sky-300 font-bold">{item.name}</code>
                <span className="text-slate-500">— {item.desc}</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                  item.status === 'VERIFIED_ACTIVE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/50'
                    : item.status === 'INTAKE_READY'
                    ? 'bg-sky-950 text-sky-300 border border-sky-600/50'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
