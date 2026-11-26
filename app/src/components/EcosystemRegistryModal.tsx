/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Search,
  Archive,
  Clock,
  Check,
  Copy
} from 'lucide-react';

export interface AppletHistoryEntry {
  lastAccessTime: string;
  firstAccessTime: string;
  source?: {
    sourceType?: string;
    spanner?: {
      id?: string;
    };
  };
  name: string;
  description: string;
  runtimeType?: number;
}

interface EcosystemRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadedCount?: (count: number) => void;
}

export const APPLET_HISTORY_PATH = '/assets/aistudio/applet_access_history_9a35c213.json';
export const CURRENT_APPLET_ID = '8629f36c-907b-42ca-a68a-28f22675f11e';
export const SIBLING_ENGINE_ID = '159edc09-c4b8-4b30-b667-dff9d50f6e2d';

type EcosystemCategory =
  | 'ALL'
  | 'Engine & Drivetrain'
  | 'CAD, Pumps & Engineering'
  | 'Ironworks & Structural'
  | 'TABs, PODs & Polymer'
  | 'Studio, Voice & Media';

function getNormalizedCategory(entry: AppletHistoryEntry): Exclude<EcosystemCategory, 'ALL'> {
  const text = `${entry.name} ${entry.description}`.toLowerCase();
  if (text.includes('sbc 350') || text.includes('engine') || text.includes('transmission')) {
    return 'Engine & Drivetrain';
  }
  if (text.includes('ironworks') || text.includes('ironconflux') || text.includes('metalwork')) {
    return 'Ironworks & Structural';
  }
  if (
    text.includes('hydro') ||
    text.includes('pump') ||
    text.includes('buoy') ||
    text.includes('core atlas') ||
    text.includes('projectschem') ||
    text.includes('conflux')
  ) {
    return 'CAD, Pumps & Engineering';
  }
  if (text.includes('polymer') || text.includes('tabs') || text.includes('pods') || text.includes('manifestation')) {
    return 'TABs, PODs & Polymer';
  }
  return 'Studio, Voice & Media';
}

export const EcosystemRegistryModal: React.FC<EcosystemRegistryModalProps> = ({
  isOpen,
  onClose,
  onLoadedCount
}) => {
  const [applets, setApplets] = useState<AppletHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<EcosystemCategory>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name'>('recent');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(APPLET_HISTORY_PATH)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list: AppletHistoryEntry[] = Array.isArray(data?.applets) ? data.applets : [];
        setApplets(list);
        setLoading(false);
        if (onLoadedCount) onLoadedCount(list.length);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load registry JSON');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onLoadedCount]);

  const categories: EcosystemCategory[] = [
    'ALL',
    'Engine & Drivetrain',
    'CAD, Pumps & Engineering',
    'Ironworks & Structural',
    'TABs, PODs & Polymer',
    'Studio, Voice & Media'
  ];

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: applets.length };
    applets.forEach((a) => {
      const cat = getNormalizedCategory(a);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [applets]);

  const filteredApplets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = applets.filter((item) => {
      const cat = getNormalizedCategory(item);
      if (category !== 'ALL' && cat !== category) return false;
      if (!q) return true;
      const id = item.source?.spanner?.id || '';
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'oldest') {
        return new Date(a.firstAccessTime).getTime() - new Date(b.firstAccessTime).getTime();
      }
      return new Date(b.lastAccessTime).getTime() - new Date(a.lastAccessTime).getTime();
    });
  }, [applets, search, category, sortBy]);

  const handleCopyId = (id: string) => {
    if (!id) return;
    navigator.clipboard?.writeText(id).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 font-mono text-xs text-gray-200">
      <div className="w-full max-w-5xl max-h-[90vh] bg-[#14191e] border border-orange-500/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#1a2026] border-b border-gray-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600/20 border border-orange-500/60 flex items-center justify-center text-orange-400">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white font-sans tracking-wide flex items-center gap-2">
                RAY &amp; PHOENIX STUDIO APPLET REGISTRY
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  {applets.length} INDEXED
                </span>
              </h2>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                Loaded directly from <span className="text-cyan-400">{APPLET_HISTORY_PATH}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            title="Close Registry"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search, Filter & Sort Toolbar */}
        <div className="p-4 bg-[#101418] border-b border-gray-800 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search applets by name, capability, or Spanner ID..."
                className="w-full bg-[#1a2026] border border-gray-700 focus:border-orange-500 outline-none rounded-lg pl-9 pr-3 py-1.5 text-white text-xs font-sans"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase">SORT:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest' | 'name')}
                className="bg-[#1a2026] border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
              >
                <option value="recent">Last Accessed</option>
                <option value="oldest">First Created</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Category Filter Bar */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition flex items-center gap-1.5 ${
                  category === cat
                    ? 'bg-orange-600 text-white font-bold shadow'
                    : 'bg-[#1a2026] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                <span>{cat}</span>
                <span className="text-[9px] px-1 rounded bg-black/40 text-gray-300">
                  {categoryCounts[cat] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Applet List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading && (
            <div className="text-center py-12 text-gray-400">
              Loading studio applet history from {APPLET_HISTORY_PATH}...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300">
              Failed to load {APPLET_HISTORY_PATH}: {error}
            </div>
          )}

          {!loading && !error && filteredApplets.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No applets match your search or category filter.
            </div>
          )}

          {!loading &&
            !error &&
            filteredApplets.map((item, idx) => {
              const spannerId = item.source?.spanner?.id || 'N/A';
              const isCurrent = spannerId === CURRENT_APPLET_ID;
              const isSibling = spannerId === SIBLING_ENGINE_ID;
              const itemCategory = getNormalizedCategory(item);
              const lastDate = new Date(item.lastAccessTime).toLocaleString();
              const firstDate = new Date(item.firstAccessTime).toLocaleDateString();

              return (
                <div
                  key={`${spannerId}-${idx}`}
                  className={`p-3.5 rounded-xl border transition ${
                    isCurrent
                      ? 'bg-orange-950/30 border-orange-500 shadow-lg'
                      : isSibling
                      ? 'bg-cyan-950/25 border-cyan-500/60'
                      : 'bg-[#181e24] border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm text-white font-sans">{item.name}</h3>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-600 text-white text-[9px] font-black uppercase">
                            ACTIVE BUILD
                          </span>
                        )}
                        {isSibling && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 text-[9px] font-bold uppercase">
                            SIBLING ENGINE SUITE
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-black/50 text-gray-400 border border-gray-800 text-[9px]">
                          {itemCategory}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 text-[10px]">
                      <button
                        onClick={() => handleCopyId(spannerId)}
                        className="px-2 py-1 rounded bg-black/60 hover:bg-gray-800 border border-gray-700 text-cyan-300 flex items-center gap-1 transition"
                        title="Copy Spanner Applet ID"
                      >
                        {copiedId === spannerId ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{spannerId.slice(0, 8)}...</span>
                          </>
                        )}
                      </button>

                      <div className="text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Last: {lastDate}</span>
                      </div>
                      <div className="text-gray-600">Created: {firstDate}</div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#101418] border-t border-gray-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400">
          <span>
            Source: <strong className="text-gray-300">{APPLET_HISTORY_PATH}</strong> ({filteredApplets.length} of {applets.length} shown)
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold transition"
          >
            Return to SBC 350 Builder
          </button>
        </div>
      </div>
    </div>
  );
};
