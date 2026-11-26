/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AEROSPACE_MATRIX_CATALOG } from '../data/aerospaceMatrix';
import { MaterialsTab } from './aerospace/MaterialsTab';
import { ProcessesTab } from './aerospace/ProcessesTab';
import { StandardsTab } from './aerospace/StandardsTab';
import { DesignMethodsTab } from './aerospace/DesignMethodsTab';
import { ToleranceContrastTab } from './aerospace/ToleranceContrastTab';
import { FlaggedText } from './aerospace/aerospaceFormat';
import { Compass, Layers, Lock, Ruler, ShieldCheck, Wrench } from 'lucide-react';

type AerospaceTabId = 'materials' | 'processes' | 'standards' | 'methods' | 'tolerance';

const CATALOG = AEROSPACE_MATRIX_CATALOG;

const TABS: Array<{
  id: AerospaceTabId;
  label: string;
  count: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'materials',
    label: 'Materials',
    count: `${CATALOG.materials.length} alloys & composites`,
    icon: <Layers className="w-3.5 h-3.5" />
  },
  {
    id: 'processes',
    label: 'Processes',
    count: `${CATALOG.processes.length} processes`,
    icon: <Wrench className="w-3.5 h-3.5" />
  },
  {
    id: 'standards',
    label: 'Standards',
    count: `${CATALOG.standardsStack.length} standards`,
    icon: <ShieldCheck className="w-3.5 h-3.5" />
  },
  {
    id: 'methods',
    label: 'Design Methods',
    count: `${CATALOG.designMethods.length} methods · ${CATALOG.caseStudies.length} cases`,
    icon: <Compass className="w-3.5 h-3.5" />
  },
  {
    id: 'tolerance',
    label: 'Tolerance contrast',
    count: `${CATALOG.auditFlags.length} flags`,
    icon: <Ruler className="w-3.5 h-3.5" />
  }
];

export const TabAerospaceMatrix: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AerospaceTabId>('materials');

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-5 space-y-4 text-xs text-slate-200">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-[#12161c] p-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-400">
              <span className="text-orange-400 font-semibold">SBC 350 · AEROSPACE REFERENCE</span>
              <span>·</span>
              <span>REPORT {CATALOG.reportDate}</span>
              <span>·</span>
              <span>READ-ONLY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Aerospace Matrix</h1>
            <p className="max-w-3xl text-[11px] text-slate-400">
              Alloys, processes, the standards stack, design methods and the aerospace-vs-automotive tolerance
              contrast — presented straight from the research catalog.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-[#0d1014] px-2 py-1 font-mono text-[10px] text-slate-300">
              <Lock className="w-3 h-3 text-slate-400" />
              NC EXPORT LOCKED
            </span>
            <span className="rounded border border-cyan-500/40 bg-cyan-500/5 px-2 py-1 font-mono text-[10px] text-cyan-300">
              READ-ONLY · ENGINE MODEL UNCHANGED
            </span>
          </div>
        </div>

        <p className="rounded-lg border border-slate-800 bg-[#0d1014] px-3 py-2 text-[11px] leading-relaxed text-slate-400">
          <FlaggedText text={CATALOG.reportScopeNote} />
        </p>

        <p className="font-mono text-[10px] text-slate-500">
          Data source: app/src/data/aerospaceMatrix.ts — the only data used on this page. NC export stays locked
          until Ray supplies tool / feed / speed / depth / units.
        </p>
      </div>

      {/* Area tabs */}
      <div
        role="tablist"
        aria-label="Aerospace matrix areas"
        className="flex flex-wrap items-stretch gap-1 rounded-xl border border-slate-800 bg-[#12161c] p-1"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[150px] rounded-lg px-3 py-2 text-left transition border ${
                active
                  ? 'bg-orange-600 text-white border-orange-500'
                  : 'bg-[#0d1014] text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                {tab.icon}
                <span>{tab.label}</span>
              </span>
              <span
                className={`mt-0.5 block font-mono text-[10px] ${
                  active ? 'text-orange-100' : 'text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active area */}
      <div role="tabpanel">
        {activeTab === 'materials' && <MaterialsTab />}
        {activeTab === 'processes' && <ProcessesTab />}
        {activeTab === 'standards' && <StandardsTab />}
        {activeTab === 'methods' && <DesignMethodsTab />}
        {activeTab === 'tolerance' && <ToleranceContrastTab />}
      </div>

      <p className="border-t border-slate-800 pt-3 font-mono text-[10px] leading-relaxed text-slate-500">
        Read-only data presentation + compare tool. Values flagged [ESTIMATE], [VENDOR_CLAIM] or NEEDS RAY&apos;S
        MEASUREMENT are not design allowables; verify against AMS / ASTM / MMPDS and mill certificates before
        design use.
      </p>
    </div>
  );
};
