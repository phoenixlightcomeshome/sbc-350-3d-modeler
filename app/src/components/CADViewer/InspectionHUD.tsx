/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { InspectionData } from '../../types/engine';
import { X, Wrench, ShieldCheck, Tag, ExternalLink, Layers, FileSpreadsheet } from 'lucide-react';

interface InspectionHUDProps {
  part: InspectionData | null;
  onClose: () => void;
  onOpenInDrawingMatrix?: () => void;
}

export const InspectionHUD: React.FC<InspectionHUDProps> = ({
  part,
  onClose,
  onOpenInDrawingMatrix
}) => {
  if (!part) return null;

  return (
    <div className="absolute top-3 right-3 left-3 sm:left-auto sm:w-96 z-30 bg-[#141920] border border-orange-500/60 rounded-xl p-4 shadow-2xl font-mono text-xs text-gray-200 max-h-[82%] overflow-y-auto">
      <div className="flex items-start justify-between border-b border-slate-800 pb-2 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-orange-400 tracking-wide">
            {part.category || 'CAD Inspection'}
          </span>
          {part.drawingIndex && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1">
              <FileSpreadsheet className="w-2.5 h-2.5" />
              {part.drawingIndex}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition shrink-0"
          title="Close Inspection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2.5 space-y-2">
        <h3 className="font-bold text-sm text-white font-sans">{part.name}</h3>
        <p className="text-[11px] text-gray-300 leading-relaxed font-sans">{part.desc}</p>

        {part.spec && (
          <div className="p-2 rounded bg-black/60 border border-emerald-500/30 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-emerald-400 font-bold block uppercase">
                CLEARANCE / TOLERANCE SPEC:
              </span>
              <span className="text-white text-[11px] font-semibold">{part.spec}</span>
            </div>
          </div>
        )}

        {part.torque && (
          <div className="p-2 rounded bg-black/50 border border-amber-500/30 flex items-start gap-2">
            <Wrench className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-amber-400 font-bold block uppercase">TORQUE SPEC:</span>
              <span className="text-white text-[11px] font-bold">{part.torque}</span>
            </div>
          </div>
        )}

        {part.material && (
          <div className="p-2 rounded bg-black/40 border border-slate-800 flex items-start gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">MATERIAL:</span>
              <span className="text-slate-200 text-[11px]">{part.material}</span>
            </div>
          </div>
        )}

        {part.partNumber && (
          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-800">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-cyan-400" /> SKU / PART #:
            </span>
            <span className="font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              {part.partNumber}
            </span>
          </div>
        )}

        {onOpenInDrawingMatrix && (
          <button
            type="button"
            onClick={onOpenInDrawingMatrix}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/50 text-cyan-200 text-[11px] font-sans font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-300" />
            <span>Open Individual 3D Drawing &amp; GD&amp;T Matrix</span>
          </button>
        )}

        {part.sourceUrls && part.sourceUrls.length > 0 && (
          <div className="pt-2 border-t border-slate-800 space-y-1">
            <span className="text-[10px] text-sky-400 font-bold uppercase block">
              Online Technical References:
            </span>
            <div className="flex flex-col gap-1">
              {part.sourceUrls.slice(0, 3).map((src) => (
                <a
                  key={src.uri}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-sky-300 hover:text-sky-200 underline flex items-center gap-1 truncate"
                >
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{src.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
