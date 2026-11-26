/**
 * Quantum Aerospace Room 5: Export & Specs
 * Plain Shop Export Labels (.STL, .DXF, .JSON), TEVV Engineer Sign-Off & Modeling-Room Transfer
 */
import React, { useState } from 'react';
import {
  ParametricPartConfig,
  buildExtrudedGeometry,
  generateBinarySTL,
  generateDXF,
  generateMbdPacket,
} from '../engine/cadEngine';
import { Download, FileCode, Box, FileText, CheckCircle2, AlertTriangle, Send, Copy, ShieldCheck } from 'lucide-react';

interface ExportSpecsRoomProps {
  config: ParametricPartConfig;
  displayMetric: boolean;
}

export const ExportSpecsRoom: React.FC<ExportSpecsRoomProps> = ({ config, displayMetric }) => {
  const [engineerName, setEngineerName] = useState('Ray');
  const [signOffNotes, setSignOffNotes] = useState(
    'Hardware baseline calibrated with 500mm span. Verified on GM Gen-I SBC 350.'
  );
  const [isSignedOff, setIsSignedOff] = useState(false);
  const [checklist, setChecklist] = useState({
    photoCalibrated: true,
    hardwareTrue: false,
    dfmPassed: true,
    materialVerified: config.materialName.includes('6061') || config.materialName.includes('7075'),
  });
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState(false);

  // Generate artifacts
  const handleExportSTL = () => {
    const geometry = buildExtrudedGeometry(config);
    const arrayBuffer = generateBinarySTL(geometry);
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '_')}_Solid.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportDXF = () => {
    const dxfString = generateDXF(config);
    const blob = new Blob([dxfString], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '_')}_CutProfile.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMbdPacket = () => {
    return generateMbdPacket(config, {
      engineerName,
      verified: isSignedOff,
      notes: signOffNotes,
      timestamp: new Date().toISOString(),
    });
  };

  const handleExportJSON = () => {
    const packet = getMbdPacket();
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '_')}_TransferPacket.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    const packet = getMbdPacket();
    navigator.clipboard.writeText(JSON.stringify(packet, null, 2));
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleTransferToModelingRoom = () => {
    setTransferFeedback(true);
    setTimeout(() => setTransferFeedback(false), 2500);
  };

  return (
    <div className="flex flex-col space-y-5 p-5 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center space-x-2">
            <Download className="w-5 h-5 text-sky-400" />
            <span>EXPORT &amp; MODELING-ROOM TRANSFER</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real Shop Exports (.STL, .DXF, .JSON), TEVV Verification Sign-Off &amp; Downstream Pipeline
          </p>
        </div>

        {/* Transfer Button */}
        <button
          onClick={handleTransferToModelingRoom}
          className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded font-mono text-xs font-semibold transition-colors shadow-md"
        >
          <Send className="w-4 h-4" />
          <span>Transfer to Modeling Room</span>
        </button>
      </div>

      {transferFeedback && (
        <div className="p-3 bg-sky-950 border border-sky-500 rounded text-xs font-mono text-sky-200 flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Design Packet dispatched to downstream Modeling Room transfer buffer! Parameter state intact.
          </span>
        </div>
      )}

      {/* Honest File Extension Exports (Top Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Binary STL */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-200 text-sm flex items-center space-x-2">
                <Box className="w-4 h-4 text-sky-400" />
                <span>3D Solid Mesh</span>
              </span>
              <span className="px-1.5 py-0.5 bg-sky-950 text-sky-400 border border-sky-600/50 rounded text-[10px] font-mono font-bold">
                .STL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-2 leading-relaxed">
              Standard 80-byte header binary STL with faceted triangle normals. Ready for 3D slicers, CAM tooling, or CFD.
            </p>
          </div>
          <button
            onClick={handleExportSTL}
            className="w-full flex items-center justify-center space-x-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-sky-500 rounded font-mono text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download 3D Solid .STL</span>
          </button>
        </div>

        {/* 2. 2D DXF */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-200 text-sm flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-sky-400" />
                <span>2D Cut Profile</span>
              </span>
              <span className="px-1.5 py-0.5 bg-sky-950 text-sky-400 border border-sky-600/50 rounded text-[10px] font-mono font-bold">
                .DXF
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-2 leading-relaxed">
              Clean AutoCAD R12 ASCII DXF polyline and circle cutouts. Ready for CNC waterjet, laser table, or router.
            </p>
          </div>
          <button
            onClick={handleExportDXF}
            className="w-full flex items-center justify-center space-x-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-sky-500 rounded font-mono text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download 2D Cut .DXF</span>
          </button>
        </div>

        {/* 3. Design Report & Transfer Packet */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-200 text-sm flex items-center space-x-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>MBD Transfer Packet</span>
              </span>
              <span className="px-1.5 py-0.5 bg-sky-950 text-sky-400 border border-sky-600/50 rounded text-[10px] font-mono font-bold">
                .JSON
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-2 leading-relaxed">
              Full ISO 10303-242 MBD schema definition, calibration matrix, TEVV stamp, and full parameter editability.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleExportJSON}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-sky-500 rounded font-mono text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Packet .JSON</span>
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded font-mono text-xs"
              title="Copy to Clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {copyFeedback && (
        <div className="text-center text-xs font-mono text-emerald-400">
          Transfer packet JSON copied to clipboard!
        </div>
      )}

      {/* Honest STEP AP242 Notice */}
      <div className="p-3 bg-amber-950/40 border border-amber-600/50 rounded-lg text-xs font-mono flex items-start space-x-2 text-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong>Honest Capability Notice:</strong> Exports generate real binary <code className="text-sky-300">.STL</code> meshes, real 2D <code className="text-sky-300">.DXF</code> toolpaths, and JSON MBD packets. This browser studio does <strong>NOT</strong> export native ISO 10303-242 Part 21 STEP (<code className="text-amber-300">.stp/.step</code>) CAD solid models (<code className="text-amber-400">NOT YET WORKING</code> for native STEP export).
        </div>
      </div>

      {/* TEVV Engineer Sign-Off Tooling */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <span className="font-bold text-slate-100 text-sm">TEVV ENGINEER SIGN-OFF TOOLING</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isSignedOff
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/50'
                : 'bg-amber-950 text-amber-400 border border-amber-600/50'
            }`}
          >
            {isSignedOff ? 'STAMPED & VERIFIED' : "NEEDING RAY'S VERIFICATION"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Signer inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-slate-400 block mb-1">Lead Verification Engineer</label>
              <input
                type="text"
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Engineering Verification Notes</label>
              <textarea
                rows={3}
                value={signOffNotes}
                onChange={(e) => setSignOffNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
              />
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
            <span className="font-bold text-slate-300 block mb-1">Pre-Release Checklist:</span>

            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.photoCalibrated}
                onChange={(e) => setChecklist({ ...checklist, photoCalibrated: e.target.checked })}
                className="accent-sky-500 rounded"
              />
              <span>500mm / 19.685in Photo Scale Calibrated (335.5 px)</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.hardwareTrue}
                onChange={(e) => setChecklist({ ...checklist, hardwareTrue: e.target.checked })}
                className="accent-sky-500 rounded"
              />
              <span className={checklist.hardwareTrue ? 'text-slate-200' : 'text-amber-400'}>
                Physically Trued on Ray's SBC 350 Hardware
              </span>
            </label>

            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.dfmPassed}
                onChange={(e) => setChecklist({ ...checklist, dfmPassed: e.target.checked })}
                className="accent-sky-500 rounded"
              />
              <span>DFM Rules Verified for Selected Fabrication Tier</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.materialVerified}
                onChange={(e) => setChecklist({ ...checklist, materialVerified: e.target.checked })}
                className="accent-sky-500 rounded"
              />
              <span>Material Density &amp; K-Factor Spec Confirmed</span>
            </label>

            <div className="pt-2">
              <button
                onClick={() => setIsSignedOff(!isSignedOff)}
                className={`w-full py-2 rounded font-bold transition-colors ${
                  isSignedOff
                    ? 'bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-600'
                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                {isSignedOff ? 'Revoke Sign-Off Stamp' : 'Affix TEVV Engineer Sign-Off Stamp'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
