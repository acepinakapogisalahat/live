'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useSuperuser } from '@/utils/supabase/useSuperuser';
import {
  getAuditLogs, listUsers, setUserStatus, type AdminUser,
  listListings, setListingModeration, softRemoveListing, hardDeleteListing, type AdminListing,
} from '@/utils/supabase/admin';
import AdminReviews from '@/components/AdminReviews';
import AdminApplications from '@/components/AdminApplications';
import AdminDestinations from '@/components/AdminDestinations';

/* ─────────  Clean Modern Glass Tokens  ───────── */
const CANVAS = 'min-h-screen bg-[#f8f9fc] relative overflow-x-hidden';
const CARD = 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-200';
const CARD_INSET = 'bg-[#f1f3f8] shadow-[inset_2px_2px_4px_rgba(163,170,205,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]';
const GRAD = 'from-violet-600 to-indigo-600';
const GRAD_TEXT = 'bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent';
const BTN_PRIMARY = 'relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:brightness-110 active:scale-[0.98] transition-all duration-200';
const BTN_DANGER = 'relative overflow-hidden bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/20 hover:brightness-110 active:scale-[0.98] transition-all duration-200';
const BTN_SUCCESS = 'relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition-all duration-200';
const FIELD = 'w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none';

type Tab = 'overview' | 'users' | 'listings' | 'reviews' | 'applications' | 'destinations' | 'audit';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  { id: 'users', label: 'Users', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
  { id: 'listings', label: 'Listings', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { id: 'reviews', label: 'Reviews', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> },
  { id: 'applications', label: 'Applications', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
  { id: 'destinations', label: 'Destinations', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg> },
  { id: 'audit', label: 'Audit Log', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> },
];

function GlassWellIcon({ gradient, children, size = 'md' }: { gradient: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  return (
    <div className={`relative overflow-hidden ${size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-12 h-12 rounded-xl'} bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-lg`}>
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent" />
      <span className="relative flex items-center justify-center">{children}</span>
    </div>
  );
}

function StatTile({ label, value, gradient, icon, badge, onClick }: { label: string; value: number | string; gradient: string; icon: React.ReactNode; badge?: string; onClick?: () => void }) {
  const body = (
    <>
      <div className="flex items-start justify-between mb-4">
        <GlassWellIcon gradient={gradient}>{icon}</GlassWellIcon>
        {badge && <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">{badge}</span>}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-4xl font-black text-slate-800 tracking-tight">{value}</p>
        {onClick && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-violet-600 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
            View
            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
          </span>
        )}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`group text-left ${CARD} rounded-2xl p-6 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 hover:-translate-y-0.5`}>
        {body}
      </button>
    );
  }
  return <div className={`${CARD} rounded-2xl p-6`}>{body}</div>;
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className={`${CARD_INSET} flex items-center gap-3 rounded-xl px-4 py-3 flex-1 min-w-[14rem]`}>
      <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={FIELD} />
    </div>
  );
}

type Overview = { usersTotal: number; usersInactive: number; listingsTotal: number; listingsHidden: number; reviewsTotal: number; reviewsFlagged: number; reviewsCritical: number; appsTotal: number; appsPending: number; appsApproved: number; photosTotal: number; };
const OV0: Overview = { usersTotal: 0, usersInactive: 0, listingsTotal: 0, listingsHidden: 0, reviewsTotal: 0, reviewsFlagged: 0, reviewsCritical: 0, appsTotal: 0, appsPending: 0, appsApproved: 0, photosTotal: 0 };
type AuditRowT = { log_id: number; action: string; target_table: string | null; target_id: string | null; detail: any; created_at: string; admin_name: string };

export default function AdminPage() {
  const su = useSuperuser();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [pulse, setPulse] = useState(0);

  const [ov, setOv] = useState<Overview>(OV0);
  const [ovLoading, setOvLoading] = useState(true);
  const [audit, setAudit] = useState<AuditRowT[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const [listings, setListings] = useState<AdminListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingSearch, setListingSearch] = useState('');
  const [listingType, setListingType] = useState('All');

  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ k: 'ok' | 'err'; m: string } | null>(null);

  useEffect(() => {
    if (su.loading || !su.isSuperadmin) return;
    let alive = true; setOvLoading(true);
    const c = (tbl: string, filt?: (q: any) => any) => { let q = supabase.from(tbl).select('*', { count: 'exact', head: true }); if (filt) q = filt(q); return q; };
    Promise.all([
      c('app_users'), c('app_users', (q) => q.neq('status', 'active')),
      c('listings'), c('listings', (q) => q.eq('is_visible', false)),
      c('reviews'), c('reviews', (q) => q.eq('flagged', true)), c('reviews', (q) => q.lte('rating', 2)),
      c('business_applications'), c('business_applications', (q) => q.eq('status', 'pending')), c('business_applications', (q) => q.eq('status', 'approved')),
      c('photos'),
    ]).then(([uT, uI, lT, lH, rT, rF, rC, aT, aP, aA, ph]) => {
      if (!alive) return; const n = (r: any) => r?.count ?? 0;
      setOv({ usersTotal: n(uT), usersInactive: n(uI), listingsTotal: n(lT), listingsHidden: n(lH), reviewsTotal: n(rT), reviewsFlagged: n(rF), reviewsCritical: n(rC), appsTotal: n(aT), appsPending: n(aP), appsApproved: n(aA), photosTotal: n(ph) });
      setOvLoading(false);
    }).catch(() => { if (alive) setOvLoading(false); });
    return () => { alive = false; };
  }, [su.loading, su.isSuperadmin, pulse]);

  useEffect(() => {
    if (su.loading || !su.isSuperadmin) return;
    let alive = true; setAuditLoading(true);
    getAuditLogs(20).then((rows) => { if (alive) setAudit(rows as AuditRowT[]); }).finally(() => { if (alive) setAuditLoading(false); });
    return () => { alive = false; };
  }, [su.loading, su.isSuperadmin, pulse, tab]);

  useEffect(() => {
    if (su.loading || !su.isSuperadmin || tab !== 'users') return;
    let alive = true; setUsersLoading(true);
    import('@/utils/supabase/admin').then(({ listUsers }) => {
      listUsers().then((r) => { if (alive) setUsers(r); }).finally(() => { if (alive) setUsersLoading(false); });
    });
    return () => { alive = false; };
  }, [su.loading, su.isSuperadmin, tab, pulse]);

  useEffect(() => {
    if (su.loading || !su.isSuperadmin || tab !== 'listings') return;
    let alive = true; setListingsLoading(true);
    import('@/utils/supabase/admin').then(({ listListings }) => {
      listListings('', 'All').then((r) => { if (alive) setListings(r); }).finally(() => { if (alive) setListingsLoading(false); });
    });
    return () => { alive = false; };
  }, [su.loading, su.isSuperadmin, tab, pulse]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  // Deep-link support: /admin?tab=users etc. opens the matching section directly.
  // NOTE: must stay above the early returns below — hooks cannot be conditional.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, []);

  if (su.loading) return <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center"><div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" /></div>;
  
  if (!su.isSuperadmin) {
    return (
      <main className={`${CANVAS} flex items-center justify-center p-8`}>
        <div className={`${CARD} rounded-3xl p-10 max-w-md text-center`}>
          <GlassWellIcon gradient="from-rose-500 to-red-500" size="lg"><svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" /><path d="M9 12l2 2 4-4" /></svg></GlassWellIcon>
          <h1 className="text-2xl font-black text-slate-800 mt-6 mb-3">Restricted Zone</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">This console is for platform superusers only.</p>
          <Link href="/" className={`inline-flex px-6 py-3 rounded-xl ${BTN_PRIMARY} text-sm font-bold`}><span className="relative">Return to TravelMate</span></Link>
        </div>
      </main>
    );
  }

  async function act(key: string, fn: () => Promise<void>, ok: string) {
    setBusy(key);
    try { await fn(); setToast({ k: 'ok', m: ok }); setPulse((p) => p + 1); }
    catch (e: any) { setToast({ k: 'err', m: e?.message ?? 'Action failed.' }); }
    finally { setBusy(null); }
  }

  const activeUsers = ov.usersTotal - ov.usersInactive;
  const visibleListings = ov.listingsTotal - ov.listingsHidden;
  const adminName = su.profile?.full_name || su.profile?.email || 'Superuser';

  const shownUsers = users.filter(u => !userSearch.trim() || `${u.name ?? ''} ${u.email ?? ''} ${u.user_id}`.toLowerCase().includes(userSearch.trim().toLowerCase()));
  const shownListings = listings.filter(l => (listingType === 'All' || l.listing_type === listingType) && (!listingSearch.trim() || `${l.name} ${l.listing_id}`.toLowerCase().includes(listingSearch.trim().toLowerCase())));

  return (
    <main className={CANVAS}>
      <div className="pointer-events-none fixed -top-32 -left-32 w-[40rem] h-[40rem] rounded-full bg-violet-200/40 blur-3xl z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[35rem] h-[35rem] rounded-full bg-indigo-200/30 blur-3xl z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.2em] ${GRAD_TEXT} mb-2`}>Root Access · Superuser</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Admin Console</h1>
            <p className="mt-2 text-sm text-slate-500 max-w-xl">
              Signed in as <span className="font-bold text-slate-700">{adminName}</span>. Unrestricted control over every record.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm">
          {TABS.map((t) => {
            const active = tab === t.id;
            const dot = t.id === 'applications' && ov.appsPending > 0 ? ov.appsPending
              : t.id === 'reviews' && ov.reviewsFlagged > 0 ? ov.reviewsFlagged
              : t.id === 'users' && ov.usersInactive > 0 ? ov.usersInactive
              : t.id === 'listings' && ov.listingsHidden > 0 ? ov.listingsHidden : 0;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${active ? `${BTN_PRIMARY} text-white shadow-md` : 'text-slate-500 hover:text-slate-800 hover:bg-white/80'}`}>
                {t.icon}
                <span>{t.label}</span>
                {dot > 0 && <span className={`min-w-[1.2rem] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${active ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-600'}`}>{dot}</span>}
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatTile onClick={() => setTab('users')} label="Total Users" value={ov.usersTotal} gradient="from-violet-500 to-indigo-500" icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>} badge={ov.usersInactive > 0 ? `${ov.usersInactive} restricted` : 'All active'} />
              <StatTile onClick={() => setTab('listings')} label="Active Listings" value={visibleListings} gradient="from-sky-500 to-blue-500" icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>} badge={ov.listingsHidden > 0 ? `${ov.listingsHidden} hidden` : 'All live'} />
              <StatTile onClick={() => setTab('reviews')} label="Total Reviews" value={ov.reviewsTotal} gradient="from-emerald-500 to-teal-500" icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>} badge={`${ov.photosTotal} photos`} />
              <StatTile onClick={() => setTab('applications')} label="Pending Apps" value={ov.appsPending} gradient="from-amber-500 to-orange-500" icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>} badge={ov.appsPending > 0 ? 'Needs review' : 'Queue empty'} />
            </div>

            <div className={`${CARD} rounded-3xl p-8`}>
              <h2 className="text-lg font-black text-slate-800 mb-6">Recent Audit Activity</h2>
              {auditLoading ? (<div className="space-y-3 animate-pulse">{[0,1,2,3].map(i => <div key={i} className={`h-16 rounded-xl ${CARD_INSET}`} />)}</div>)
                : audit.length === 0 ? (<p className="text-slate-500 text-center py-8">No actions logged yet.</p>)
                : (
                  <div className="space-y-2 max-h-[24rem] overflow-y-auto pr-2">
                    {audit.slice(0, 8).map((r) => (
                      <div key={r.log_id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50/80 transition border border-transparent hover:border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 capitalize">{r.action.replace(/[._]/g, ' ')}</p>
                          <p className="text-xs text-slate-400 font-mono truncate">{r.target_table} · {r.target_id}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>
                          <p className="text-[10px] font-semibold text-violet-600">{r.admin_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className={`${CARD} rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div><h2 className="text-xl font-black text-slate-800">User Management</h2><p className="text-sm text-slate-500 mt-1">{shownUsers.length} accounts found</p></div>
              <SearchField value={userSearch} onChange={setUserSearch} placeholder="Search name, email or ID…" />
            </div>
            {usersLoading ? (<div className="space-y-3 animate-pulse">{[0,1,2,3].map(i => <div key={i} className={`h-20 rounded-xl ${CARD_INSET}`} />)}</div>)
              : shownUsers.length === 0 ? (<p className="text-slate-500 text-center py-12">No users match your search.</p>)
              : (
                <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
                  {shownUsers.map((u) => {
                    const isBanned = u.status === 'banned';
                    const isSuspended = u.status === 'suspended';
                    const key = `user:${u.user_id}`;
                    return (
                      <div key={u.user_id} className={`${CARD_INSET} rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4`}>
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shrink-0 ${isBanned ? 'bg-rose-500' : isSuspended ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                            {String(u.name ?? 'U').trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{u.name ?? 'Unnamed'}</p>
                            <p className="text-xs text-slate-500 truncate">{u.email ?? '—'}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{u.user_id}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <span className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${isBanned ? 'bg-rose-100 text-rose-700' : isSuspended ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isBanned ? 'Banned' : isSuspended ? 'Suspended' : 'Active'}
                          </span>
                          {!isBanned && !isSuspended && (
                            <>
                              <button disabled={busy === key} onClick={() => act(key, () => setUserStatus(u.user_id, 'suspended', 'suspended'), 'User suspended')} className="px-4 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition">Suspend</button>
                              <button disabled={busy === key} onClick={() => { if(confirm('Ban this user?')) act(key, () => setUserStatus(u.user_id, 'banned', 'banned'), 'User banned'); }} className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition">Ban</button>
                            </>
                          )}
                          {(isBanned || isSuspended) && (
                            <button disabled={busy === key} onClick={() => act(key, () => setUserStatus(u.user_id, 'active', 'reactivated'), 'User reactivated')} className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition">Reactivate</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        {/* Listings Tab */}
        {tab === 'listings' && (
          <div className={`${CARD} rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div><h2 className="text-xl font-black text-slate-800">Listing Management</h2><p className="text-sm text-slate-500 mt-1">{shownListings.length} listings found</p></div>
              <SearchField value={listingSearch} onChange={setListingSearch} placeholder="Search name or ID…" />
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {['All', 'Attraction', 'Hotel', 'Restaurant'].map((t) => (
                <button key={t} onClick={() => setListingType(t)} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${listingType === t ? `${BTN_PRIMARY} text-white` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
              ))}
            </div>
            {listingsLoading ? (<div className="space-y-3 animate-pulse">{[0,1,2].map(i => <div key={i} className={`h-24 rounded-xl ${CARD_INSET}`} />)}</div>)
              : shownListings.length === 0 ? (<p className="text-slate-500 text-center py-12">No listings match.</p>)
              : (
                <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
                  {shownListings.map((l) => {
                    const key = `listing:${l.listing_id}`;
                    return (
                      <div key={l.listing_id} className={`${CARD_INSET} rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4`}>
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-200">
                          {l.image_url ? <img src={l.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-xl">{l.listing_type.charAt(0)}</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-sm truncate">{l.name}</p>
                          <p className="text-xs text-slate-500 truncate">{l.listing_type} · {l.destination ?? '—'}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{l.listing_id}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-3 py-1 rounded-lg text-[11px] font-bold ${l.is_visible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{l.is_visible ? 'Live' : 'Hidden'}</span>
                          <button disabled={busy === key} onClick={() => act(key, () => setListingModeration(l.listing_id, { is_visible: !l.is_visible }), l.is_visible ? 'Unpublished' : 'Published')} className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition" title="Toggle Visibility">
                            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          </button>
                          <button disabled={busy === key} onClick={() => { if(confirm('Soft-remove this listing?')) act(key, () => softRemoveListing(l.listing_id, 'soft-removed'), 'Listing removed'); }} className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition" title="Soft Remove">
                            <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                          </button>
                          <button disabled={busy === key} onClick={() => { if(confirm('PERMANENTLY delete?')) act(key, () => hardDeleteListing(l.listing_id), 'Deleted'); }} className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition" title="Hard Delete">
                            <svg className="w-4 h-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        {/* Delegated Tabs */}
        {tab === 'reviews' && <AdminReviews notify={setToast} onChanged={() => setPulse((p) => p + 1)} />}
        {tab === 'applications' && <AdminApplications notify={setToast} onChanged={() => setPulse((p) => p + 1)} />}
        {tab === 'destinations' && <AdminDestinations notify={setToast} onChanged={() => setPulse((p) => p + 1)} />}
        {tab === 'audit' && (
          <div className={`${CARD} rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <h2 className="text-xl font-black text-slate-800 mb-6">Full Audit Trail</h2>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
              {auditLoading ? (<div className="space-y-3 animate-pulse">{[0,1,2,3,4].map(i => <div key={i} className={`h-16 rounded-xl ${CARD_INSET}`} />)}</div>)
                : audit.map((r) => (
                  <div key={r.log_id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50/80 transition border border-transparent hover:border-slate-100">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 capitalize">{r.action.replace(/[._]/g, ' ')}</p>
                      <p className="text-xs text-slate-400 font-mono truncate">{r.target_table} · {r.target_id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] font-semibold text-violet-600">{r.admin_name}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[70] max-w-sm px-5 py-4 rounded-2xl backdrop-blur-xl border shadow-2xl flex items-center gap-3 animate-in slide-in-from-right fade-in duration-300 ${toast.k === 'ok' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : 'bg-rose-50/95 border-rose-200 text-rose-800'}`}>
          <span className={`w-3 h-3 rounded-full shrink-0 ${toast.k === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <p className="text-sm font-bold">{toast.m}</p>
        </div>
      )}
    </main>
  );
}