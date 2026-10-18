// app/src/app/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useRole } from '@/utils/supabase/role';
import ReviewHistoryPanel from '@/components/dashboard/ReviewHistoryPanel';
import {
  CANVAS, NEU_SM, GLASS, GLASS_SM, GRAD_TEXT, PILL_ACTIVE, INPUT,
  BTN_PRIMARY, BTN_GHOST, FLOAT_SHADOW,
  Chevron, MapIcon, SparkleIcon, RouteIcon, Star, CompassIcon, GlassWellIcon,
  EmptyBox, statusPill,
} from '@/components/dashboard/kit';

if (typeof window !== 'undefined') console.log('[Profile] build=p-8-refined');

type TripRow = Record<string, any>;

const SEX_OPTIONS = ['Male', 'Female', 'Other'];
const TRAVEL_PREFS = ['Culture & Food', 'Adventure', 'Relaxation', 'Nightlife'];
const BUDGETS = ['Budget', 'Mid-range', 'Luxury'];

const fieldLabel = 'block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2';
const counter = 'text-[11px] text-slate-400 font-semibold';

function pillCls(active: boolean) {
  return `px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-95 border ${
    active 
      ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20' 
      : 'bg-white/60 text-slate-600 border-white/80 hover:bg-white hover:text-violet-600 hover:border-violet-200'
  }`;
}

function fmt(d: any) {
  return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'emerald' | 'slate' | 'violet' }) {
  const num = tone === 'amber' ? 'text-amber-600' : tone === 'emerald' ? 'text-emerald-600' : tone === 'violet' ? 'text-violet-600' : `${GRAD_TEXT}`;
  return (
    <div className={`rounded-2xl ${NEU_SM} px-4 py-5 text-center border border-white/60 transition hover:-translate-y-0.5 hover:shadow-md`}>
      <p className={`text-2xl font-black tabular-nums leading-none ${num}`}>{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function Section({ title, eyebrow, action, children }: { title: string; eyebrow?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${GLASS} rounded-[2rem] p-6 md:p-8 border border-white/60`}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-1">{eyebrow}</p>}
          <h2 className="text-xl font-black tracking-tight text-slate-800">{title}</h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const supabase = createClient();
  const role = useRole();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [location, setLocation] = useState('');
  const [prefs, setPrefs] = useState<any>(null);
  const [travelPref, setTravelPref] = useState('');
  const [budget, setBudget] = useState('');
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [tripItems, setTripItems] = useState<Record<string, string[]>>({});
  const [reviewCount, setReviewCount] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!role.loading && role.userId) load(role.userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.loading, role.userId]);

  async function load(uid: string) {
    const { data: p } = await supabase.from('app_users').select('*').eq('user_id', uid).maybeSingle();
    setProfile(p);
    if (p) { setName(p.name ?? ''); setSex(p.sex ?? ''); setLocation(p.current_location ?? ''); }
    const { data: pref } = await supabase.from('user_preferences').select('*').eq('user_id', uid).maybeSingle();
    setPrefs(pref);
    if (pref) { setTravelPref(pref.travel_preference ?? ''); setBudget(pref.budget_range ?? ''); }
    const { data: t } = await supabase.from('trips').select('*').eq('user_id', uid).order('start_date', { ascending: false });
    const rows = (t ?? []) as TripRow[];
    setTrips(rows);
    if (rows.length) {
      const ids = rows.map((r) => r.trip_id);
      const { data: items } = await supabase.from('trip_items').select('*').in('trip_id', ids);
      const listingIds = [...new Set((items ?? []).map((i: any) => i.listing_id).filter(Boolean))];
      const nameMap: Record<string, string> = {};
      if (listingIds.length) {
        const { data: ls } = await supabase.from('listings').select('listing_id, name').in('listing_id', listingIds);
        (ls ?? []).forEach((l: any) => { nameMap[l.listing_id] = l.name; });
      }
      const map: Record<string, string[]> = {};
      (items ?? []).forEach((i: any) => { (map[i.trip_id] ??= []).push(nameMap[i.listing_id] ?? i.listing_id); });
      setTripItems(map);
    }
    try {
      const { data: revs } = await supabase.from('reviews').select('review_id', { count: 'exact', head: true }).eq('user_id', uid);
      setReviewCount(revs?.length ?? 0);
    } catch { setReviewCount(0); }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    const { error } = await supabase.from('app_users').update({ name: name.trim(), sex: sex || null, current_location: location.trim() || null }).eq('user_id', role.userId);
    if (error) setErr(error.message); else setMsg('Profile updated successfully.');
    setBusy(false);
  }

  async function savePrefs() {
    setErr(null); setMsg(null); setBusy(true);
    try {
      if (!travelPref || !budget) throw new Error('Please select both a travel style and a budget range.');
      if (prefs) {
        const { error } = await supabase.from('user_preferences').update({ travel_preference: travelPref, budget_range: budget }).eq('preference_id', prefs.preference_id);
        if (error) throw error;
      } else {
        const { data: existing } = await supabase.from('user_preferences').select('preference_id');
        const nums = (existing ?? []).map((r: any) => parseInt(String(r.preference_id).replace(/\D/g, ''), 10)).filter((n: number) => !isNaN(n));
        const nextId = `PRF-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
        const { error } = await supabase.from('user_preferences').insert({ preference_id: nextId, user_id: role.userId, travel_preference: travelPref, budget_range: budget });
        if (error) throw error;
      }
      setMsg('Travel preferences saved successfully.');
      await load(role.userId!);
    } catch (e2: any) { setErr(e2?.message ?? 'Could not save preferences.'); }
    setBusy(false);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trips.filter((t) => (t.end_date ? t.end_date >= today : true));
  const completed = trips.filter((t) => (t.end_date ? t.end_date < today : false));
  const railTrips = [...upcoming, ...completed];
  const placesOf = (tid: string) => (tripItems[tid] ?? []).filter(Boolean) as string[];
  const totalPlaces = trips.reduce((n, t) => n + placesOf(t.trip_id).length, 0);
  const totalDays = trips.reduce((sum, t) => {
    if (!t.start_date || !t.end_date) return sum;
    const d = Math.round((new Date(t.end_date + 'T00:00:00').getTime() - new Date(t.start_date + 'T00:00:00').getTime()) / 86400000) + 1;
    return sum + Math.max(0, d);
  }, 0);
  const initials = ((name || profile?.name || '?').trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()) || 'T';
  const joinedAgo = profile?.created_at ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)) : null;

  if (role.loading) {
    return <main className={`${CANVAS} flex items-center justify-center min-h-[60vh]`}><div className={`${NEU_SM} rounded-2xl px-10 py-8 text-sm font-bold text-slate-500 animate-pulse border border-white/60`}>Loading your profile…</div></main>;
  }
  if (!role.authId) {
    return (
      <main className={`${CANVAS} flex items-center justify-center min-h-[60vh] p-8 page-enter`}>
        <div className={`${GLASS} rounded-[2rem] p-10 max-w-md w-full text-center border border-white/60`}>
          <GlassWellIcon gradient="from-indigo-500 to-violet-500" size="lg"><MapIcon className="w-8 h-8" /></GlassWellIcon>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 mt-6 mb-3">Your profile</h1>
          <p className="text-base text-slate-500 mb-8 leading-relaxed">Sign in to view and edit your profile, trips, and review history.</p>
          <Link href="/login" className={`${BTN_PRIMARY} inline-block px-8 py-3.5 text-sm font-bold`}><span className="relative">Sign in</span></Link>
        </div>
      </main>
    );
  }

  function TripChip({ t }: { t: TripRow }) {
    const isUp = t.end_date ? t.end_date >= today : true;
    const items = placesOf(t.trip_id);
    return (
      <div className={`shrink-0 w-64 rounded-2xl ${NEU_SM} px-5 py-4 border border-white/60 transition hover:-translate-y-0.5 hover:shadow-md`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-black text-slate-800 text-sm truncate flex-1">{t.trip_name ?? t.name ?? `Trip ${t.trip_id}`}</p>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${statusPill(isUp ? 'upcoming' : 'finished')}`}>{isUp ? 'Upcoming' : 'Done'}</span>
        </div>
        <p className="text-xs text-slate-500 font-semibold tabular-nums">{fmt(t.start_date)} → {fmt(t.end_date)}</p>
        {items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{items.join(' · ')}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className={`${CANVAS} min-h-screen pb-16 page-enter relative`}>
      {/* Contained background blobs to prevent overlap */}
      <div className="pointer-events-none fixed top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sky-300/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-32 pb-10 space-y-6">

        {/* Hero Section */}
        <div className={`${GLASS} rounded-[2rem] p-6 md:p-8 border border-white/60 overflow-hidden relative`}>
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-violet-400/30 to-fuchsia-400/20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-xl shadow-violet-500/30 ring-4 ring-white/50">
                  {initials}
                </div>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 ring-4 ring-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-1">Your profile</p>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 truncate">{name || 'Hi there'}<span className={GRAD_TEXT}>.</span></h1>
                <p className="mt-1.5 text-sm font-semibold text-slate-500 truncate">{profile?.email ?? '—'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${GLASS_SM} text-violet-700 border border-violet-200/50`}>Traveler</span>
                  {role.isOwner && <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${GLASS_SM} text-emerald-700 border border-emerald-200/50`}>Owner</span>}
                  {role.isAdmin && <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">Admin</span>}
                  {joinedAgo && <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-slate-500 border border-slate-200">{joinedAgo}d on TravelMate</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 md:flex-col md:items-end shrink-0">
              <Link href="/search" className={`${BTN_GHOST} px-5 py-3 text-sm font-bold`}><span className="relative flex items-center gap-2"><SparkleIcon className="w-4 h-4" />Start a new search</span></Link>
              {role.isOwner && <Link href="/owner" className={`${BTN_GHOST} px-5 py-3 text-sm font-bold`}><span className="relative">Open owner dashboard →</span></Link>}
              {role.isAdmin && <Link href="/admin" className={`${BTN_GHOST} px-5 py-3 text-sm font-bold`}><span className="relative">Open admin panel →</span></Link>}
            </div>
          </div>
        </div>

        {/* Messages */}
        {msg && <p className={`${GLASS} border-emerald-200/70 text-emerald-700 rounded-2xl px-5 py-3 text-sm font-semibold flex items-center gap-2`}><span className="w-2 h-2 rounded-full bg-emerald-500" />{msg}</p>}
        {err && <p className={`${GLASS} border-rose-200/70 text-rose-700 rounded-2xl px-5 py-3 text-sm font-semibold flex items-center gap-2`}><span className="w-2 h-2 rounded-full bg-rose-500" />{err}</p>}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Trips" value={String(trips.length)} tone="violet" />
          <StatTile label="Places saved" value={String(totalPlaces)} tone="emerald" />
          <StatTile label="Reviews" value={String(reviewCount)} tone="amber" />
          <StatTile label="Days traveled" value={String(totalDays)} />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/?tab=plan" className={`group relative overflow-hidden rounded-2xl ${NEU_SM} p-5 border border-white/60 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10`}>
            <div className="flex items-start gap-4">
              <GlassWellIcon gradient="from-indigo-500 to-violet-500"><RouteIcon className="w-6 h-6" /></GlassWellIcon>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-800 text-base">Plan a trip</p>
                <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">Add dates and stops — we fill the rest.</p>
              </div>
              <Chevron className="w-5 h-5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <Link href="/?tab=discover" className={`group relative overflow-hidden rounded-2xl ${NEU_SM} p-5 border border-white/60 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10`}>
            <div className="flex items-start gap-4">
              <GlassWellIcon gradient="from-violet-500 to-fuchsia-500"><CompassIcon className="w-6 h-6" /></GlassWellIcon>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-800 text-base">Discover places</p>
                <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">Browse top-rated spots anywhere.</p>
              </div>
              <Chevron className="w-5 h-5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <a href="#review-history" className={`group relative overflow-hidden rounded-2xl ${NEU_SM} p-5 border border-white/60 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10`}>
            <div className="flex items-start gap-4">
              <GlassWellIcon gradient="from-amber-500 to-orange-500"><Star className="w-6 h-6" /></GlassWellIcon>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-800 text-base">Review history</p>
                <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">{reviewCount > 0 ? `${reviewCount} review${reviewCount === 1 ? '' : 's'} posted` : 'No reviews yet'}</p>
              </div>
              <Chevron className="w-5 h-5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        </div>

        {/* Personal information */}
        <Section title="Personal information" eyebrow="Identity">
          <form onSubmit={saveProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <div className="flex items-baseline justify-between mb-2"><label className={fieldLabel}>Full name</label><span className={counter}>{name.length}/50</span></div>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} className={`${INPUT} text-sm`} required />
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-2"><label className={fieldLabel}>Location</label><span className={counter}>{location.length}/100</span></div>
                <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} placeholder="City, Country" className={`${INPUT} text-sm`} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <span className={fieldLabel}>Sex</span>
                <div className="flex flex-wrap gap-2">{SEX_OPTIONS.map((s) => (<button key={s} type="button" onClick={() => setSex(s)} className={pillCls(sex === s)}>{s}</button>))}</div>
              </div>
              <div>
                <label className={fieldLabel}>Email</label>
                <input value={profile?.email ?? ''} disabled className={`${INPUT} text-sm opacity-60 cursor-not-allowed bg-slate-50`} />
                <p className="mt-2 text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Sign-in identity — managed by your provider.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={busy} className={`${BTN_PRIMARY} px-8 py-3 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed`}><span className="relative">{busy ? 'Saving…' : 'Save changes'}</span></button>
            </div>
          </form>
        </Section>

        {/* Your trips */}
        <Section title="Your trips" eyebrow="Itineraries" action={<span className="text-xs font-black uppercase tracking-wider text-slate-400 bg-slate-100/80 px-3 py-1.5 rounded-full">{trips.length} total · {upcoming.length} upcoming</span>}>
          {trips.length === 0 ? (
            <div className="space-y-5 text-center py-4">
              <EmptyBox icon={<MapIcon className="w-8 h-8" />} title="No trips yet" sub="Your adventures will appear here once you plan one." />
              <Link href="/?tab=plan" className={`${BTN_PRIMARY} inline-block px-6 py-3 text-sm font-bold`}><span className="relative">Start planning</span></Link>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {railTrips.map((t) => <TripChip key={t.trip_id} t={t} />)}
            </div>
          )}
        </Section>

        {/* Settings: Preferences & Account */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Section title="Travel preferences" eyebrow="Process 2">
            <p className="text-sm text-slate-500 font-semibold mb-5 leading-relaxed">Powers your personalized recommendations and AI trip planning.</p>
            <div className="space-y-5">
              <div>
                <span className={fieldLabel}>Travel style</span>
                <div className="flex flex-wrap gap-2">{TRAVEL_PREFS.map((p) => (<button key={p} type="button" onClick={() => setTravelPref(p)} className={pillCls(travelPref === p)}>{p}</button>))}</div>
              </div>
              <div>
                <span className={fieldLabel}>Budget range</span>
                <div className="flex flex-wrap gap-2">{BUDGETS.map((b) => (<button key={b} type="button" onClick={() => setBudget(b)} className={pillCls(budget === b)}>{b}</button>))}</div>
              </div>
              <button type="button" onClick={savePrefs} disabled={busy} className={`${BTN_PRIMARY} w-full py-3 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed mt-2`}><span className="relative">{busy ? 'Saving…' : 'Save preferences'}</span></button>
            </div>
          </Section>

          <Section title="Account" eyebrow="Details">
            <dl className="space-y-5 text-sm">
              <div>
                <dt className={fieldLabel}>User ID</dt>
                <dd className="font-mono text-[11px] text-slate-700 break-all select-all bg-slate-50 rounded-xl px-4 py-3 border border-slate-200/60">{role.userId ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1">
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Role</dt>
                <dd className="text-slate-800 font-black">{role.isAdmin ? 'Administrator' : role.isOwner ? 'Business owner' : 'Traveler'}</dd>
              </div>
              {joinedAgo != null && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Member for</dt>
                  <dd className="text-slate-800 font-black">{joinedAgo} day{joinedAgo === 1 ? '' : 's'}</dd>
                </div>
              )}
              {role.isOwner && (
                <div>
                  <dt className={fieldLabel}>Owner ID</dt>
                  <dd className="font-mono text-[11px] text-slate-700 break-all select-all bg-slate-50 rounded-xl px-4 py-3 border border-slate-200/60">{role.ownerId ?? '—'}</dd>
                </div>
              )}
            </dl>
            {(role.isOwner || role.isAdmin) && (
              <div className="mt-6 space-y-3">
                {role.isOwner && (<Link href="/owner" className={`flex items-center justify-between rounded-xl ${NEU_SM} px-4 py-3 text-sm font-bold text-slate-700 hover:text-violet-600 hover:bg-violet-50 transition border border-transparent hover:border-violet-200`}>Manage my listings <Chevron className="w-4 h-4" /></Link>)}
                {role.isAdmin && (<Link href="/admin" className={`flex items-center justify-between rounded-xl ${NEU_SM} px-4 py-3 text-sm font-bold text-slate-700 hover:text-violet-600 hover:bg-violet-50 transition border border-transparent hover:border-violet-200`}>Admin manager <Chevron className="w-4 h-4" /></Link>)}
              </div>
            )}
          </Section>
        </div>

        {/* Review history */}
        <div id="review-history" className="scroll-mt-32">
          <Section title="Review history" eyebrow="Your ratings" action={<span className="text-xs font-black uppercase tracking-wider text-slate-400 bg-slate-100/80 px-3 py-1.5 rounded-full">{reviewCount} total</span>}>
            <ReviewHistoryPanel userId={role.userId} />
          </Section>
        </div>
      </div>
    </main>
  );
}