/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AEROSPACE_MATRIX_CATALOG } from '../../data/aerospaceMatrix';
import {
  ConfidenceBadge,
  FieldLabel,
  FlaggedText,
  LegendRow,
  SourceLine,
  stripCitations
} from './aerospaceFormat';

const STANDARDS = AEROSPACE_MATRIX_CATALOG.standardsStack;
const ISO_TABLE = AEROSPACE_MATRIX_CATALOG.iso2768LinearTable;

export const StandardsTab: React.FC = () => (
  <div className="space-y-4">
    <LegendRow />

    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-[#12161c] px-3 py-2">
      <span className="font-mono text-[11px] font-semibold text-orange-400">{STANDARDS.length}-standard stack</span>
      <span className="text-[11px] text-slate-400">
        QMS, first-article, special-process accreditation, material specs, GD&amp;T, limits &amp; fits, surface
        texture, AM and damage tolerance.
      </span>
    </div>

    <div className="space-y-3">
      {STANDARDS.map((row, index) => (
        <article key={row.id} className="rounded-xl border border-slate-800 bg-[#12161c] p-4 space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 font-mono text-[10px] text-slate-500">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-sm font-bold text-white">{row.standard}</h3>
            </div>
            <ConfidenceBadge flag={row.confidence} />
          </div>

          <div>
            <FieldLabel>Title &amp; scope</FieldLabel>
            <FlaggedText text={row.fullTitleAndScope} className="text-[11px] text-slate-300" />
          </div>

          <div>
            <FieldLabel>Application notes</FieldLabel>
            <FlaggedText text={row.appNotes} className="text-[11px] text-slate-400" />
          </div>

          <SourceLine sourceRef={row.sourceRef} />
        </article>
      ))}
    </div>

    <section className="rounded-xl border border-slate-800 bg-[#12161c] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">ISO 2768-1 general linear tolerances</h2>
          <p className="text-[11px] text-slate-400">
            Classes f (fine), m (medium) and c (coarse) as carried by the catalog. Class v is not in the data, so it
            is not shown. General tolerances apply only where no individual tolerance is called out.
          </p>
        </div>
        <span className="rounded border border-slate-700 bg-[#0d1014] px-2 py-0.5 font-mono text-[10px] text-slate-400">
          ISO 2768-1:1989
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-slate-700 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pr-3 font-semibold">Nominal size range</th>
              <th className="py-2 pr-3 font-semibold">Class f</th>
              <th className="py-2 pr-3 font-semibold">Class m</th>
              <th className="py-2 font-semibold">Class c</th>
            </tr>
          </thead>
          <tbody>
            {ISO_TABLE.map((row) => (
              <tr key={row.nominalSizeRangeMm} className="border-b border-slate-800/70 last:border-0">
                <td className="py-1.5 pr-3 font-mono text-slate-200">{row.nominalSizeRangeMm}</td>
                <td className="py-1.5 pr-3 font-mono text-cyan-300">{row.classF}</td>
                <td className="py-1.5 pr-3 font-mono text-cyan-300">{row.classM}</td>
                <td className="py-1.5 font-mono text-cyan-300">{row.classC}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] text-slate-500">
        Source: {ISO_TABLE[0] ? stripCitations(ISO_TABLE[0].sourceRef) : 'catalog ISO 2768 table'}
      </p>
    </section>

    <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200">
      <span className="font-semibold">ASME Y14.5:</span> no characteristic count is stated on this page — the
      sources conflict on that figure, so the catalog deliberately omits it.
    </p>
  </div>
);
