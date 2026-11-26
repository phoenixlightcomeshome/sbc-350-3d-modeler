/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AEROSPACE_MATRIX_CATALOG, AerospaceAuditFlagItem } from '../../data/aerospaceMatrix';
import { ConfidenceBadge, FieldLabel, FlaggedText, LegendRow, SourceLine } from './aerospaceFormat';

const CONTRAST = AEROSPACE_MATRIX_CATALOG.toleranceContrast;
const FLAGS = AEROSPACE_MATRIX_CATALOG.auditFlags;

const FLAG_CATEGORY: Record<AerospaceAuditFlagItem['category'], { label: string; className: string }> = {
  ESTIMATE_OR_VENDOR_CLAIM: {
    label: 'VENDOR CLAIM / ESTIMATE',
    className: 'border-rose-500/60 bg-rose-500/10 text-rose-300'
  },
  UNAVAILABLE_NO_SINGLE_VALUE: {
    label: 'NO SINGLE PUBLISHED VALUE',
    className: 'border-amber-500/60 bg-amber-500/10 text-amber-300'
  },
  CONFLICT: {
    label: 'CONFLICT',
    className: 'border-orange-500/60 bg-orange-500/10 text-orange-300'
  },
  METHOD_LIMIT: {
    label: 'METHOD LIMIT',
    className: 'border-slate-500/60 bg-slate-500/10 text-slate-300'
  }
};

export const ToleranceContrastTab: React.FC = () => (
  <div className="space-y-5">
    <LegendRow />

    <section className="space-y-3">
      <h2 className="text-sm font-bold text-white">Aerospace vs automotive</h2>

      {CONTRAST.map((row) => (
        <article key={row.aspect} className="rounded-xl border border-slate-800 bg-[#12161c] p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-white">{row.aspect}</h3>
            <ConfidenceBadge flag={row.confidence} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-2">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                Aerospace
              </span>
              <FlaggedText text={row.aerospaceContext} className="text-[11px] text-slate-200" />
            </div>
            <div className="rounded-lg border border-slate-700 bg-[#0d1014] px-3 py-2">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Automotive
              </span>
              <FlaggedText text={row.automotiveContext} className="text-[11px] text-slate-300" />
            </div>
          </div>

          <p className="rounded-lg border border-slate-800 bg-[#0d1014] px-3 py-2 text-[11px] text-slate-300">
            <span className="font-semibold text-white">Takeaway: </span>
            <FlaggedText text={row.keyTakeaway} />
          </p>

          <SourceLine sourceRef={row.sourceRef} />
        </article>
      ))}
    </section>

    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">Flags &amp; conflicts</h2>
          <p className="text-[11px] text-slate-400">
            Every conflict, unpublished value and vendor claim carried by the catalog — with the action the data
            requires before design use.
          </p>
        </div>
        <span className="rounded border border-slate-700 bg-[#0d1014] px-2 py-0.5 font-mono text-[10px] text-slate-400">
          {FLAGS.length} OPEN ITEMS
        </span>
      </div>

      <div className="space-y-3">
        {FLAGS.map((flag) => {
          const category = FLAG_CATEGORY[flag.category];
          return (
            <article key={flag.id} className="rounded-xl border border-slate-800 bg-[#12161c] p-4 space-y-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-white">{flag.subject}</h3>
                <span
                  className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide whitespace-nowrap ${category.className}`}
                >
                  {category.label}
                </span>
              </div>

              <div>
                <FieldLabel>Detail</FieldLabel>
                <FlaggedText text={flag.detail} className="text-[11px] text-slate-300" />
              </div>

              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  Action required
                </span>
                <FlaggedText text={flag.actionRequired} className="text-[11px] text-amber-100" />
              </div>

              <SourceLine sourceRef={flag.sourceRef} />
            </article>
          );
        })}
      </div>
    </section>
  </div>
);
