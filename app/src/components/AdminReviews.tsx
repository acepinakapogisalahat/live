'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { flagReview, deleteReview, type AdminReview } from '@/utils/supabase/admin';
import { buildContext, analyzeReview, type ReviewSignal, type SignalLevel } from '@/lib/reviewSignals';

const NEU = 'bg-[#edf0fa] shadow-[10px_10px_24px_rgba(163,170,205,0.42),-10px_-10px_24px_rgba(255,255,255,0.95)]';
const NEU_SM = 'bg-[#edf0fa] shadow-[6px_6px_14px_rgba(163,170,205,0.38),-6px_-6px_14px_rgba(255,255,255,0.9)]';
const INSET = 'bg-[#e4e8f4] shadow-[inset_5px_5px_11px_rgba(163,170,205,0.38),inset_-5px_-5px_11px_rgba(255,255,255,0.85)]';
const GLASS = 'bg-white/60 backdrop-blur-xl border border-white/70 shadow-[0_10px_34px_rgba(110,120,190,0.15)]';
const GLASS_SM = 'bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(110,120,190,0.12)]';
const SHEEN = 'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:via-white/5 before:to-transparent';
const GRAD = 'from-indigo-500 via-violet-500 to-fuchsia-500';
const GLOSS = 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(70,80,150,0.2)]';
const PILL_ACTIVE = `relative overflow-hidden bg-gradient-to-r ${GRAD} text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.6),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition-all duration-200 ${SHEEN}`;
const FIELD = 'w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none';

const STAR_GRAD: Record<number, string> = { 5: 'from-emerald-400 to-teal-500', 4: 'from-sky-400 to-indigo-500', 3: 'from-amber-400 to-orange-500', 2: 'from-orange-500 to-red-500', 1: 'from-rose-500 to-red-600' };
const LEVEL_RING: Record<SignalLevel, string> = { clean: '', warn: 'ring-1 ring-amber-300', danger: 'ring-1 ring-rose-300' };

function Star({ className, filled }: { className?: string; filled?: boolean }) { return (<svg viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={className ?? 'w-4 h-4'}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" /></svg>); }
function Flag({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round" /><line x1="4" y1="22" x2="4" y2="15" /></svg>); }
function AlertTriangle({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>); }
function Trash({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Message({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Store({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M4 10v10h16V10" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 6l1.5-3h15L21 6c0 1.7-1.3 3-3 3s-3-1.3-3-3c0 1.7-1.3 3-3 3S9 7.7 9 6c0 1.7-1.3 3-3 3S3 7.7 3 6z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 20v-6h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Search({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>); }
function ChevronLeft({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function External({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function X({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-5 h-5'}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>); }
function Check({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className ?? 'w-4 h-4'}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>); }

function Well({ gradient, children, size = 'md' }: { gradient: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  return (<div className={`relative overflow-hidden ${size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-11 h-11 rounded-xl'} bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_-8px_rgba(80,90,180,0.5),inset_0_1px_0_rgba(255,255,255,0.55)]`}><span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent" /><span className="relative flex items-center justify-center">{children}</span></div>);
}
function fmtRel(ts: string | null) {
  if (!ts) return '—'; const d = new Date(ts).getTime(); if (isNaN(d)) return '—';
  const s = Math.floor((Date.now() - d) / 1000); if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24); if (dd < 30) return `${dd}d ago`; return new Date(ts).toLocaleDateString();
}
function Stars({ n, size = 'w-3.5 h-3.5' }: { n: number; size?: string }) {
  return (<div className="flex gap-0.5 shrink-0">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`${size} ${i <= n ? 'text-amber-400' : 'text-slate-200'}`} filled={i <= n} />)}</div>);
}

type Row = AdminReview & { user_id: string | null; visit_date: string | null; owner_user_id: string | null; listing_type: string | null; listing_image: string | null; listing_average: number | null; helpful_votes_count?: number | null; photo_url?: string | null; signal: ReviewSignal };
type Group = { listing_id: string; name: string; type: string | null; image: string | null; average: number | null; total: number; danger: number; warn: number; flagged: number };
type Notify = (t: { k: 'ok' | 'err'; m: string }) => void;

export default function AdminReviews({ notify, onChanged }: { notify: Notify; onChanged: () => void }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [view, setView] = useState<'all' | 'listing'>('all');
  const [listingId, setListingId] = useState<string | null>(null);
  const [listingSearch, setListingSearch] = useState('');
  const [star, setStar] = useState<number | null>(null);
  const [integrity, setIntegrity] = useState<'all' | 'clean' | 'suspicious' | 'flagged'>('all');
  const [search, setSearch] = useState('');

  const [busy, setBusy] = useState<string | null>(null);
  const [flagTarget, setFlagTarget] = useState<Row | null>(null);
  const [flagReason, setFlagReason] = useState('');

  useEffect(() => {
    let alive = true; setLoading(true); setError(null);
    (async () => {
      try {
        const [{ data: revs }, { data: lists }, { data: users }] = await Promise.all([
          supabase.from('reviews').select('review_id,rating,title,review_text,visit_date,submission_date,helpful_votes_count,photo_url,flagged,flagged_reason,user_id,listing_id').order('submission_date', { ascending: false }),
          supabase.from('listings').select('listing_id,name,listing_type,average_rating,image_url,uploaded_by'),
          supabase.from('app_users').select('user_id,name'),
        ]);
        const uMap: Record<string, string> = {}; (users ?? []).forEach((u: any) => { uMap[u.user_id] = u.name; });
        const lMap: Record<string, any> = {}; (lists ?? []).forEach((l: any) => { lMap[l.listing_id] = l; });
        const base = (revs ?? []).map((r: any) => {
          const l = lMap[r.listing_id];
          return { ...r, user_name: uMap[r.user_id] ?? 'Unknown', listing_name: l?.name ?? r.listing_id, listing_type: l?.listing_type ?? null, listing_image: l?.image_url ?? null, listing_average: l?.average_rating != null ? Number(l.average_rating) : null, owner_user_id: l?.uploaded_by ?? null };
        });
        const ctx = buildContext(base);
        const scored: Row[] = base.map((r: any) => ({ ...r, signal: analyzeReview(r, ctx) }));
        if (alive) setRows(scored);
      } catch (e: any) { if (alive) setError(e?.message ?? 'Could not load reviews.'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [reloadKey]);

  const groups = useMemo<Group[]>(() => {
    const m: Record<string, Group> = {};
    for (const r of rows) {
      const g = (m[r.listing_id] ??= { listing_id: r.listing_id, name: r.listing_name ?? r.listing_id, type: r.listing_type, image: r.listing_image, average: r.listing_average, total: 0, danger: 0, warn: 0, flagged: 0 });
      g.total++;
      if (r.flagged) g.flagged++; else if (r.signal.level === 'danger') g.danger++; else if (r.signal.level === 'warn') g.warn++;
    }
    return Object.values(m).sort((a, b) => (b.danger + b.warn + b.flagged) - (a.danger + a.warn + a.flagged) || b.total - a.total || a.name.localeCompare(b.name));
  }, [rows]);

  const scope = useMemo(() => (view === 'listing' && listingId ? rows.filter((r) => r.listing_id === listingId) : rows), [rows, view, listingId]);
  const starCounts = useMemo(() => { const c = [0, 0, 0, 0, 0, 0]; for (const r of scope) c[r.rating] = (c[r.rating] ?? 0) + 1; return c; }, [scope]);
  const tally = useMemo(() => { let clean = 0, danger = 0, warn = 0, flagged = 0; for (const r of scope) { if (r.flagged) flagged++; else if (r.signal.level === 'danger') danger++; else if (r.signal.level === 'warn') warn++; else clean++; } return { clean, danger, warn, flagged }; }, [scope]);

  const feed = useMemo(() => {
    let arr = scope;
    if (star) arr = arr.filter((r) => r.rating === star);
    if (integrity === 'clean') arr = arr.filter((r) => !r.flagged && r.signal.level === 'clean');
    else if (integrity === 'suspicious') arr = arr.filter((r) => !r.flagged && (r.signal.level === 'danger' || r.signal.level === 'warn'));
    else if (integrity === 'flagged') arr = arr.filter((r) => r.flagged);
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((r) => `${r.user_name ?? ''} ${r.listing_name ?? ''} ${r.title ?? ''} ${r.review_text ?? ''}`.toLowerCase().includes(q));
    const sev = (r: Row) => (r.flagged ? 0 : r.signal.level === 'danger' ? 1 : r.signal.level === 'warn' ? 2 : 3);
    return [...arr].sort((a, b) => sev(a) - sev(b) || String(b.submission_date).localeCompare(String(a.submission_date)));
  }, [scope, star, integrity, search]);

  const selGroup = listingId ? groups.find((g) => g.listing_id === listingId) ?? null : null;
  const shownGroups = useMemo(() => { const q = listingSearch.trim().toLowerCase(); return q ? groups.filter((g) => `${g.name} ${g.listing_id}`.toLowerCase().includes(q)) : groups; }, [groups, listingSearch]);

  async function run(key: string, fn: () => Promise<void>, ok: string) {
    setBusy(key);
    try { await fn(); notify({ k: 'ok', m: ok }); setReloadKey((k) => k + 1); onChanged(); }
    catch (e: any) { notify({ k: 'err', m: e?.message ?? 'Action failed.' }); }
    finally { setBusy(null); }
  }
  function confirmFlag() {
    const t = flagTarget; if (!t) return;
    run(`f:${t.review_id}`, () => flagReview(t.review_id, true, flagReason.trim() || 'flagged by superuser'), 'Review flagged').then(() => setFlagTarget(null));
  }

  return (
    <div className={`${GLASS} rounded-3xl p-6 md:p-7`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Well gradient="from-amber-500 to-orange-500"><Message className="w-5 h-5" /></Well>
          <div><h2 className="text-lg font-black text-slate-800 leading-tight">Content moderation</h2><p className="text-xs text-slate-400 font-semibold">{scope.length} review{scope.length === 1 ? '' : 's'} in view · {rows.length} total</p></div>
        </div>
        <div className="flex items-center gap-3 flex-1 lg:max-w-md">
          <div className={`${INSET} flex items-center gap-1 p-1 rounded-xl`}>
            {(['all', 'listing'] as const).map((v) => (
              <button key={v} type="button" onClick={() => { setView(v); setListingId(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all active:scale-95 ${view === v ? 'bg-white/85 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-violet-600'}`}>
                {v === 'all' ? 'All reviews' : 'By listing'}
              </button>
            ))}
          </div>
          <div className={`${INSET} flex items-center gap-2 rounded-xl px-4 py-2.5 flex-1`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={view === 'listing' && !listingId ? listingSearch : search} onChange={(e) => (view === 'listing' && !listingId ? setListingSearch(e.target.value) : setSearch(e.target.value))} placeholder={view === 'listing' && !listingId ? 'Find a listing…' : 'Search reviews…'} className={FIELD} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-2xl bg-rose-50/90 backdrop-blur-md border border-rose-200 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" /><p className="text-sm font-semibold text-rose-700 flex-1">{error}</p><button type="button" onClick={() => setReloadKey((k) => k + 1)} className="px-4 py-2 rounded-xl bg-white/80 text-xs font-bold text-rose-600 hover:bg-white transition">Retry</button></div>
      ) : loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className={`h-24 rounded-2xl ${INSET} animate-pulse`} />)}</div>
      ) : (
        <>
          <div className={`${NEU_SM} rounded-2xl p-5 mb-5 border border-white/60`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Star categories</p>
              {star && <button type="button" onClick={() => setStar(null)} className="text-[11px] font-bold text-violet-600 hover:text-violet-700 transition">clear ★ filter</button>}
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((n) => {
                const c = starCounts[n] ?? 0; const pct = scope.length ? Math.round((c / scope.length) * 100) : 0; const active = star === n;
                return (
                  <button key={n} type="button" onClick={() => setStar(active ? null : n)} className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2 transition ${active ? 'bg-white/70 ring-1 ring-violet-300' : 'hover:bg-white/50'}`}>
                    <span className="flex items-center gap-1 w-12 shrink-0 text-xs font-black text-slate-600"><Star className="w-3.5 h-3.5 text-amber-400" filled />{n}★</span>
                    <span className={`${INSET} h-2.5 flex-1 rounded-full overflow-hidden`}>
                      <span className={`block h-full rounded-full transition-all duration-700 ${GLOSS} bg-gradient-to-r ${STAR_GRAD[n]}`} style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs font-black text-slate-700">{c}<span className="text-slate-300 font-bold"> · {pct}%</span></span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${NEU_SM} rounded-2xl p-5 mb-6 border border-white/60`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Content integrity</p>
              <div className="flex flex-wrap gap-1.5">
                {([['all', 'All'], ['clean', 'Clean'], ['suspicious', '⚠ Suspicious'], ['flagged', '🚩 Flagged']] as const).map(([k, lbl]) => (
                  <button key={k} type="button" onClick={() => setIntegrity(k)} className={`px-3 py-2 rounded-xl text-[11px] font-bold tracking-wide transition active:scale-95 ${integrity === k ? (k === 'suspicious' ? 'relative overflow-hidden bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_8px_18px_-6px_rgba(245,158,11,0.7)]' : k === 'flagged' ? 'relative overflow-hidden bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_8px_18px_-6px_rgba(244,63,94,0.7)]' : PILL_ACTIVE) : `${INSET} text-slate-500 hover:text-violet-600 hover:bg-white/60`}`}>
                    <span className="relative">{lbl}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {([['Clean', tally.clean, 'from-emerald-400 to-teal-500'], ['Suspicious', tally.danger + tally.warn, 'from-amber-400 to-orange-500'], ['Critical', tally.danger, 'from-rose-500 to-red-500'], ['Flagged', tally.flagged, 'from-fuchsia-500 to-purple-500']] as const).map(([lbl, val, grad]) => (
                <div key={lbl} className={`${INSET} rounded-xl p-3 text-center`}>
                  <p className="text-xl font-black"><span className={`bg-gradient-to-r ${grad} bg-clip-text text-transparent`}>{val}</span></p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{lbl}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" />danger: link · profanity · contact · self‑review · pre‑visit</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />warn: caps · spam · low‑effort · duplicate · burst · future date</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-fuchsia-500" />flagged: manual admin action</span>
            </div>
          </div>

          {view === 'listing' && !listingId ? (
            shownGroups.length === 0 ? (
              <div className="text-center py-14"><div className={`w-16 h-16 mx-auto rounded-2xl ${INSET} text-violet-300 flex items-center justify-center mb-4`}><Store className="w-7 h-7" /></div><p className="text-sm font-bold text-slate-500">No listings have reviews yet.</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {shownGroups.map((g) => {
                  const issues = g.danger + g.warn + g.flagged;
                  return (
                    <button key={g.listing_id} type="button" onClick={() => setListingId(g.listing_id)} className={`${NEU_SM} group rounded-2xl p-4 text-left flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[10px_10px_24px_rgba(163,170,205,0.5)] active:scale-[0.99] border border-transparent hover:border-white/60`}>
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-indigo-100 to-violet-100 border border-white/60">
                        {g.image ? <img src={g.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-violet-300 font-black text-lg">{(g.type ?? 'P').charAt(0)}</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-800 text-sm truncate">{g.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{g.type ?? '—'} · {g.total} review{g.total === 1 ? '' : 's'}{g.average != null ? ` · ★ ${g.average.toFixed(1)}` : ''}</p>
                      </div>
                      {issues > 0 ? (
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black ${g.danger + g.flagged > 0 ? 'bg-rose-50/90 border border-rose-200/80 text-rose-600' : 'bg-amber-50/90 border border-amber-200/80 text-amber-600'}`}>{issues} issue{issues === 1 ? '' : 's'}</span>
                      ) : (
                        <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-emerald-400" title="clean" />
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <>
              {listingId && selGroup && (
                <div className="flex items-center gap-3 mb-5">
                  <button type="button" onClick={() => setListingId(null)} className={`${GLASS_SM} px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-violet-600 hover:bg-white/80 transition active:scale-95 flex items-center gap-1`}><ChevronLeft className="w-4 h-4" />All listings</button>
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 truncate">{selGroup.name}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">{selGroup.total} review{selGroup.total === 1 ? '' : 's'}{selGroup.average != null ? ` · ★ ${selGroup.average.toFixed(1)} avg` : ''}{selGroup.danger + selGroup.warn > 0 ? ` · ${selGroup.danger + selGroup.warn} flagged by system` : ''}</p>
                  </div>
                </div>
              )}
              {feed.length === 0 ? (
                <div className="text-center py-14"><div className={`w-16 h-16 mx-auto rounded-2xl ${INSET} text-violet-300 flex items-center justify-center mb-4`}><Message className="w-7 h-7" /></div><p className="text-sm font-bold text-slate-500">{star || integrity !== 'all' || search ? 'No reviews match these filters.' : 'No reviews yet.'}</p></div>
              ) : (
                <div className="space-y-3 max-h-[64vh] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                  {feed.map((r) => {
                    const key = r.review_id; const isBusy = busy === `f:${key}` || busy === `d:${key}`;
                    const av = STAR_GRAD[r.rating] ?? 'from-indigo-400 to-violet-500';
                    const showReasons = !r.flagged && r.signal.level !== 'clean';
                    return (
                      <div key={key} className={`${NEU_SM} rounded-2xl p-5 ${r.flagged ? 'ring-1 ring-fuchsia-300' : LEVEL_RING[r.signal.level]} border border-transparent hover:border-white/60 transition`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Well gradient={av}><span className="w-11 h-11 flex items-center justify-center font-black text-sm">{String(r.user_name ?? 'T').trim().charAt(0).toUpperCase()}</span></Well>
                            <div className="min-w-0">
                              <p className="font-black text-slate-800 text-sm truncate">{r.user_name ?? 'Unknown'}</p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {!listingId && <>on <span className="font-semibold text-slate-500">{r.listing_name}</span> · </>}
                                {fmtRel(r.submission_date)}
                                {r.helpful_votes_count ? ` · ${r.helpful_votes_count} helpful` : ''}
                              </p>
                            </div>
                          </div>
                          <Stars n={r.rating} />
                        </div>
                        {r.title && <p className="font-bold text-slate-700 text-sm mb-1.5">{r.title}</p>}
                        <p className="text-sm text-slate-600 leading-relaxed">{r.review_text || '(no written text)'}</p>
                        {r.photo_url && <img src={r.photo_url} alt="review" className="mt-3 rounded-xl max-h-40 object-cover shadow-md border border-white/60" />}

                        {r.flagged ? (
                          <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-fuchsia-50/80 border border-fuchsia-200/80">
                            <Flag className="w-4 h-4 text-fuchsia-600 mt-0.5 shrink-0" />
                            <p className="text-xs font-bold text-fuchsia-700">Manually flagged{r.flagged_reason ? ` — ${r.flagged_reason}` : ''}</p>
                          </div>
                        ) : showReasons ? (
                          <div className={`mt-4 flex flex-wrap items-center gap-1.5 px-3 py-2.5 rounded-xl ${r.signal.level === 'danger' ? 'bg-rose-50/80 border border-rose-200/80' : 'bg-amber-50/80 border border-amber-200/80'}`}>
                            <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${r.signal.level === 'danger' ? 'text-rose-500' : 'text-amber-500'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider mr-1 ${r.signal.level === 'danger' ? 'text-rose-600' : 'text-amber-600'}`}>{r.signal.level === 'danger' ? 'Violation' : 'Suspicious'}</span>
                            {r.signal.reasons.map((rs, i) => (
                              <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rs.kind === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{rs.label}</span>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/60">
                          {r.flagged
                            ? <button type="button" disabled={isBusy} onClick={() => run(`f:${key}`, () => flagReview(key, false), 'Review unflagged')} className={`${GLASS_SM} px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-white/80 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5`}><Check className="w-3.5 h-3.5" />Unflag</button>
                            : <button type="button" disabled={isBusy} onClick={() => { setFlagTarget(r); setFlagReason(''); }} className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/80 backdrop-blur-md border border-rose-200/80 hover:bg-rose-100/80 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" />Flag</button>}
                          <a href={`/listing/${r.listing_id}`} target="_blank" rel="noreferrer" className={`${GLASS_SM} px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-violet-600 hover:bg-white/80 transition active:scale-95 flex items-center gap-1.5`}><External className="w-3.5 h-3.5" />Listing</a>
                          <button type="button" disabled={isBusy} onClick={() => { if (confirm(`Delete this ${r.rating}★ review by ${r.user_name ?? 'user'} on ${r.listing_name}? The listing average will recalculate.`)) run(`d:${key}`, () => deleteReview(key, r.listing_id), 'Review deleted & rating recalculated'); }} className="ml-auto px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/80 backdrop-blur-md border border-rose-200/80 hover:bg-rose-100/80 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"><Trash className="w-3.5 h-3.5" />Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {flagTarget && (
        <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFlagTarget(null)}>
          <div className={`${NEU} rounded-3xl p-6 max-w-md w-full border border-white/60`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Flag className="w-5 h-5 text-rose-500" />Flag review</h3><button type="button" onClick={() => setFlagTarget(null)} className="text-slate-400 hover:text-slate-600 transition"><X /></button></div>
            <p className="text-sm text-slate-500 mb-1">Flagging <span className="font-bold text-slate-800">{flagTarget.user_name ?? 'a review'}</span>’s {flagTarget.rating}★ comment on <span className="font-bold text-slate-800">{flagTarget.listing_name}</span>.</p>
            {flagTarget.signal.reasons.length > 0 && (<p className="text-[11px] text-amber-600 font-semibold mb-4">System already detected: {flagTarget.signal.reasons.map((x) => x.label).join(' · ')}</p>)}
            <textarea value={flagReason} onChange={(e) => setFlagReason(e.target.value)} rows={3} maxLength={200} placeholder="Reason (written to the audit log)…" className={`${INSET} w-full px-4 py-3 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-rose-400/60 resize-none`} />
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setFlagTarget(null)} className={`${GLASS_SM} flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-white/80 transition active:scale-95`}>Cancel</button>
              <button type="button" disabled={busy === `f:${flagTarget.review_id}`} onClick={confirmFlag} className={`relative overflow-hidden flex-1 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-500 shadow-[0_12px_28px_-8px_rgba(244,63,94,0.7),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition disabled:opacity-60`}><span className="relative">Confirm flag</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}