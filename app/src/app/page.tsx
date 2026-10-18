// app/src/app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Footer from '@/components/Footer';
import SmartSearch from '@/components/SmartSearch';
import { useRole } from '@/utils/supabase/role';
import { useSuperuser } from '@/utils/supabase/useSuperuser';
import PlanTab from '@/components/dashboard/PlanTab';
import DiscoverTab from '@/components/dashboard/DiscoverTab';
import ToolsTab from '@/components/dashboard/ToolsTab';
import LandingHero from '@/components/dashboard/LandingHero';
import BusinessOnboarding from '@/components/business/BusinessOnboarding';
import {
  NEU, NEU_SM, INSET, GLASS, GLASS_SM, GRAD, PILL_ACTIVE, CANVAS, FLOAT_SHADOW,
  Star, MapIcon, SparkleIcon, CompassIcon, RouteIcon, BoltIcon,
  getTripStatus,
  type Rec, type ExploreCard, type ForecastDay, type TripData, type ReviewMap,
} from '@/components/dashboard/kit';

const REC_SELECT = 'recommendation_score, recommendation_reason, listing:listing_id(listing_id, name, listing_type, destination:destination_id(*))';
const FALLBACK_OUTLOOK: ForecastDay[] = [{ day: 'Mon', temp: 24 }, { day: 'Tue', temp: 24 }, { day: 'Wed', temp: 25 }, { day: 'Thu', temp: 23 }, { day: 'Fri', temp: 24 }];

type Tab = 'plan' | 'discover' | 'tools';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'plan', label: 'Plan', icon: <RouteIcon className="w-4 h-4" /> },
  { id: 'discover', label: 'Discover', icon: <CompassIcon className="w-4 h-4" /> },
  { id: 'tools', label: 'Tools', icon: <BoltIcon className="w-4 h-4" /> },
];

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const role = useRole();
  const { isSuperadmin, loading: suLoading } = useSuperuser();
  const [routing, setRouting] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  const [firstName, setFirstName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [hasPersonal, setHasPersonal] = useState(false);
  const [explore, setExplore] = useState<ExploreCard[]>([]);
  const [trending, setTrending] = useState<{ name: string; country: string; rating: number }[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [forecast, setForecast] = useState<ForecastDay[]>(FALLBACK_OUTLOOK);
  const [forecastLocation, setForecastLocation] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [tripReviewMap, setTripReviewMap] = useState<ReviewMap>({});
  const [reviewVersion, setReviewVersion] = useState(0);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [allDests, setAllDests] = useState<{ destination_name: string; region_country: string }[]>([]);
  const [schedMap, setSchedMap] = useState<Record<string, { open: string; close: string }>>({});
  const [descMap, setDescMap] = useState<Record<string, string>>({});
  const [subtypeMap, setSubtypeMap] = useState<Record<string, { label: string; value: string }>>({});
  const [destExtra, setDestExtra] = useState<Record<string, { count: number; top: string[] }>>({});

  // routing gate
  useEffect(() => {
    async function route() {
      if (role.loading || suLoading) return;
      if (!role.authId) { setRouting(false); return; }
      if (isSuperadmin) { router.replace('/admin'); return; }
      if (role.isOwner || role.isAdmin) { router.replace('/business'); return; }
      if (role.userId) {
        const { data, error } = await supabase.from('business_applications').select('status, application_kind').eq('user_id', role.userId);
        const rows = !error ? ((data ?? []) as { status: string | null; application_kind?: string | null }[]) : [];
        const approvedOwner = rows.some((r) => (r.application_kind ?? 'business') === 'business' && /^(approv|accept|live|publish|verified|granted|active)/i.test((r.status ?? '').trim()));
        if (approvedOwner || rows.some((r) => (r.status ?? '') === 'pending')) { router.replace('/business'); return; }
      }
      setRouting(false);
    }
    route();
  }, [role.loading, suLoading, role.authId, role.isOwner, role.isAdmin, role.userId, isSuperadmin, router, supabase]);

  async function loadForecast(loc: string | null) {
    if (!loc) { setForecast(FALLBACK_OUTLOOK); setForecastLocation(null); return; }
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) { setForecast(FALLBACK_OUTLOOK); setForecastLocation(null); return; }
      const { latitude, longitude } = geoData.results[0];
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max&timezone=auto`);
      const weatherData = await weatherRes.json();
      if (!weatherData.daily || !weatherData.daily.time || !weatherData.daily.temperature_2m_max) { setForecast(FALLBACK_OUTLOOK); setForecastLocation(null); return; }
      const days: ForecastDay[] = weatherData.daily.time.slice(0, 5).map((dateStr: string, i: number) => ({ day: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }), temp: Math.round(weatherData.daily.temperature_2m_max[i]) }));
      setForecast(days); setForecastLocation(geoData.results[0].name);
    } catch { setForecast(FALLBACK_OUTLOOK); setForecastLocation(null); }
  }

  async function fetchTrips(uid: string): Promise<TripData[]> {
    const { data: t } = await supabase.from('trips').select('*').eq('user_id', uid).order('start_date', { ascending: false });
    const rows = (t ?? []) as any[]; if (!rows.length) return [];
    const ids = rows.map((r) => r.trip_id);
    const { data: items } = await supabase.from('trip_items').select('*').in('trip_id', ids);
    const listingIds = [...new Set((items ?? []).map((i: any) => i.listing_id).filter((id: any) => id && id !== 'NOTE'))];
    const lMap: Record<string, { name: string; destination_id: string | null; destination_name: string | null; region_country: string | null; listing_type: string | null; average_rating: number | null; destBlob?: any }> = {};
    if (listingIds.length) {
      const { data: ls } = await supabase.from('listings').select('listing_id, name, listing_type, average_rating, destination:destination_id(*)').in('listing_id', listingIds);
      (ls ?? []).forEach((l: any) => { lMap[l.listing_id] = { name: l.name, destination_id: l.destination?.destination_id ?? null, destination_name: l.destination?.destination_name ?? null, region_country: l.destination?.region_country ?? null, destBlob: l.destination ?? null, listing_type: l.listing_type ?? null, average_rating: l.average_rating != null ? Number(l.average_rating) : null }; });
    }
    const map: Record<string, any[]> = {};
    (items ?? []).forEach((i: any) => {
      const isNote = i.listing_id == null || i.listing_id === 'NOTE';
      (map[i.trip_id] ??= []).push({ key: i.trip_item_id ?? i.item_id ?? i.id ?? `${i.trip_id}|${i.listing_id}`, listing_id: i.listing_id, destination_id: isNote ? null : lMap[i.listing_id]?.destination_id ?? null, name: isNote ? (i.notes ?? 'Note') : lMap[i.listing_id]?.name ?? i.listing_id, destination_name: isNote ? null : lMap[i.listing_id]?.destination_name ?? null, region_country: isNote ? null : lMap[i.listing_id]?.region_country ?? null, destBlob: isNote ? null : lMap[i.listing_id]?.destBlob ?? null, listing_type: isNote ? 'Note' : lMap[i.listing_id]?.listing_type ?? null, rating: isNote ? null : lMap[i.listing_id]?.average_rating ?? null, planned_date: i.planned_date ?? null, start_time: i.start_time ?? null, sequence_no: i.sequence_no ?? null, notes: i.notes ?? null, raw: i });
    });
    return rows.map((r) => ({ trip_id: r.trip_id, trip_name: r.trip_name ?? r.name ?? null, start_date: r.start_date ?? null, end_date: r.end_date ?? null, status: r.status ?? null, stops: Array.isArray(r.stops) ? r.stops : [], items: map[r.trip_id] ?? [] }));
  }
  async function refreshTrips() { if (userId) setTrips(await fetchTrips(userId)); }

  // master load
  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      const authId = session.session?.user?.id ?? null;
      let uid: string | null = null;
      if (authId) {
        const { data: profile } = await supabase.from('app_users').select('user_id, name, current_location').eq('auth_user_id', authId).maybeSingle();
        if (profile) { uid = profile.user_id; setUserId(profile.user_id); setFirstName(String(profile.name ?? '').split(' ')[0] || null); loadForecast(profile.current_location ?? null); }
        try { const { data: ageRow } = await supabase.from('app_users').select('created_at').eq('auth_user_id', authId).maybeSingle(); setCreatedAt((ageRow as any)?.created_at ?? null); } catch { setCreatedAt(null); }
      }
      let rq = supabase.from('recommendations').select(REC_SELECT); if (uid) rq = rq.eq('user_id', uid);
      const { data: recData } = await rq.order('recommendation_score', { ascending: false }).limit(4);
      let rows = (recData as unknown as Rec[]) ?? []; if (uid) setHasPersonal(rows.length > 0);
      if (rows.length === 0) { const { data: globalRecs } = await supabase.from('recommendations').select(REC_SELECT).order('recommendation_score', { ascending: false }).limit(4); rows = (globalRecs as unknown as Rec[]) ?? []; }
      setRecs(rows);
      if (uid) {
        const { data: logs } = await supabase.from('search_logs').select('keywords').eq('user_id', uid).order('log_id', { ascending: false }).limit(10);
        const seen: string[] = []; (logs ?? []).forEach((l: any) => { const q = String(l.keywords ?? '').trim(); if (q && !seen.includes(q)) seen.push(q); });
        setRecent(seen.slice(0, 5)); setTrips(await fetchTrips(uid));
      }
      const [{ data: dests }, { data: listings }, { data: exploreRows }, { data: attrs }, { data: hotelRows }, { data: restRows }, { data: schedRows }] = await Promise.all([
        supabase.from('destinations').select('*'),
        supabase.from('listings').select('destination_id, average_rating'),
        supabase.from('listings').select('listing_id, name, listing_type, image_url, average_rating, description, destination:destination_id(*)'),
        supabase.from('attractions').select('attraction_id, activity_name, schedule_id'),
        supabase.from('hotels').select('hotel_id, star_rating'),
        supabase.from('restaurants').select('restaurant_id, cuisine_type'),
        supabase.from('schedules').select('schedule_id, open_time, close_time'),
      ]);
      setExplore((exploreRows as unknown as ExploreCard[]) ?? []);
      setAllDests((dests ?? []) as { destination_name: string; region_country: string }[]);
      const dDesc: Record<string, string> = {}; const dExtra: Record<string, { count: number; top: string[] }> = {};
      (exploreRows ?? []).forEach((r: any) => { dDesc[r.listing_id] = r.description ?? ''; const dn = r.destination?.destination_name; if (dn) { const e = (dExtra[dn] ??= { count: 0, top: [] }); e.count += 1; if (e.top.length < 3) e.top.push(r.name); } });
      setDescMap(dDesc); setDestExtra(dExtra);
      const sMap: Record<string, { label: string; value: string }> = {};
      (attrs ?? []).forEach((a: any) => { if (a.activity_name) sMap[a.attraction_id] = { label: 'Activity', value: a.activity_name }; });
      (hotelRows ?? []).forEach((h: any) => { if (h.star_rating) sMap[h.hotel_id] = { label: 'Star rating', value: String(h.star_rating) }; });
      (restRows ?? []).forEach((r: any) => { if (r.cuisine_type) sMap[r.restaurant_id] = { label: 'Cuisine', value: r.cuisine_type }; });
      setSubtypeMap(sMap);
      const schRows: Record<string, { open: string; close: string }> = {}; const schList = (schedRows ?? []) as any[]; const schById = new Map(schList.map((s: any) => [s.schedule_id, s]));
      (attrs ?? []).forEach((a: any) => { const s = a.schedule_id ? schById.get(a.schedule_id) : null; if (s) schRows[a.attraction_id] = { open: String(s.open_time ?? '00:00:00').slice(0, 5), close: String(s.close_time ?? '23:59:00').slice(0, 5) }; });
      setSchedMap(schRows);
      const dMap = new Map<string, { destination_name: string; region_country: string }>(); (dests ?? []).forEach((d: any) => dMap.set(d.destination_id, d));
      const agg = new Map<string, { sum: number; count: number }>(); (listings ?? []).forEach((l: any) => { if (l.average_rating == null) return; const a = agg.get(l.destination_id) ?? { sum: 0, count: 0 }; a.sum += Number(l.average_rating); a.count += 1; agg.set(l.destination_id, a); });
      const trend = [...agg.entries()].map(([id, a]) => { const d = dMap.get(id); if (!d) return null; const m = String(d.region_country ?? '').match(/\(([^)]+)\)/); return { name: d.destination_name, country: m ? m[1] : d.region_country, rating: Math.round((a.sum / a.count) * 10) / 10 }; }).filter(Boolean).sort((x: any, y: any) => y.rating - x.rating).slice(0, 4) as { name: string; country: string; rating: number }[];
      setTrending(trend);
      setReady(true);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // review progress
  useEffect(() => {
    async function loadReviewProgress() {
      if (!userId || !trips.length) { setTripReviewMap({}); return; }
      const ids = [...new Set(trips.flatMap((t) => t.items.map((i) => i.listing_id)).filter((id): id is string => !!id && id !== 'NOTE'))];
      if (!ids.length) { setTripReviewMap({}); return; }
      const { data } = await supabase.from('reviews').select('listing_id').eq('user_id', userId).in('listing_id', ids);
      const reviewedSet = new Set((data ?? []).map((r: any) => r.listing_id as string));
      const map: ReviewMap = {};
      for (const t of trips) { const placeIds = [...new Set(t.items.map((i) => i.listing_id).filter((id): id is string => !!id && id !== 'NOTE'))]; map[t.trip_id] = { total: placeIds.length, reviewed: placeIds.filter((id) => reviewedSet.has(id)).length }; }
      setTripReviewMap(map);
    }
    loadReviewProgress();
  }, [userId, trips, reviewVersion, supabase]);

  function goSearch(q?: string) { const params = new URLSearchParams(); const fq = (q ?? '').trim(); if (fq) params.set('q', fq); router.push(`/search?${params.toString()}`); }

  function openTab(t: Tab) { setTab(t); setFabOpen(false); }
  function toggleTab(t: Tab) { if (tab === t) setTab(null); else openTab(t); }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).has('trip')) setTab('plan');
  }, []);

  useEffect(() => {
    if (!tab) return;
    const el = document.getElementById('tab-content');
    if (!el) return;
    const OFFSET = parseFloat(getComputedStyle(el).scrollMarginTop) || 160;
    const topOf = () => el.getBoundingClientRect().top + window.scrollY - OFFSET;
    const glide = requestAnimationFrame(() => window.scrollTo({ top: topOf(), behavior: 'smooth' }));
    const settle = window.setTimeout(() => {
      if (Math.abs(window.scrollY - topOf()) > 4) window.scrollTo({ top: topOf(), behavior: 'auto' });
    }, 520);
    return () => { cancelAnimationFrame(glide); clearTimeout(settle); };
  }, [tab]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const activeTrip = trips.find((t) => getTripStatus(t) === 'ongoing') ?? null;
  const activeDayIndex = activeTrip?.start_date ? Math.max(1, Math.floor((Date.now() - new Date(activeTrip.start_date + 'T00:00:00').getTime()) / 86400000) + 1) : 1;
  const activeTotal = activeTrip?.start_date && activeTrip?.end_date ? Math.max(1, Math.round((new Date(activeTrip.end_date + 'T00:00:00').getTime() - new Date(activeTrip.start_date + 'T00:00:00').getTime()) / 86400000) + 1) : null;
  const needsReviewCount = trips.filter((t) => { const i = tripReviewMap[t.trip_id]; const st = getTripStatus(t); return st === 'finished' && (i?.total ?? 0) > 0 && (i?.reviewed ?? 0) < (i?.total ?? 0); }).length;

  const tier = useMemo<'guest' | 'new' | 'returning' | 'veteran'>(() => {
    if (!userId) return 'guest';
    const ageDays = createdAt ? (Date.now() - new Date(createdAt).getTime()) / 86400000 : null;
    const veteranTime = ageDays != null && ageDays > 180;
    const nt = trips.length;
    if (nt >= 3 || (veteranTime && nt >= 1)) return 'veteran';
    if (nt > 0 || recent.length > 0 || hasPersonal) return 'returning';
    return 'new';
  }, [userId, createdAt, trips.length, recent.length, hasPersonal]);
  const topPicks = useMemo(() => (explore ?? []).filter((l) => l.image_url).sort((a, b) => (b.average_rating ?? -1) - (a.average_rating ?? -1)).slice(0, 4), [explore]);
  const trendingChips = useMemo(() => (trending ?? []).slice(0, 6), [trending]);

  if (role.authId && routing === null) {
    return (
      <main className={`${CANVAS} pb-16`}>
        <div className="pointer-events-none fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/30 blur-3xl z-0" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className={`${NEU} rounded-[2rem] mb-8 animate-fade-in`}><div className="pt-16 pb-12 px-6"><div className="h-12 shimmer rounded-2xl w-96 max-w-full mx-auto" /><div className="h-6 shimmer rounded-xl w-[600px] max-w-full mx-auto mt-4" /><div className="h-16 shimmer rounded-2xl w-full max-w-3xl mx-auto mt-8" /></div></div>
          <div className={`${NEU_SM} rounded-3xl h-14 mb-5 animate-pulse`} /><div className="h-96 rounded-3xl shimmer" />
        </div>
      </main>
    );
  }

  return (
    <main className={`${CANVAS} flex flex-col page-enter`}>
      <div className="pointer-events-none fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/30 blur-3xl z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sky-300/25 blur-3xl z-0" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full bg-fuchsia-300/20 blur-3xl z-0" />

      <BusinessOnboarding />

      {/* 1. HERO BANNER */}
      <LandingHero
        tier={tier}
        greeting={greeting}
        firstName={firstName}
        activeTripName={activeTrip?.trip_name ?? null}
        activeDayIndex={activeDayIndex}
        activeTotal={activeTotal}
        topPicks={topPicks}
        trendingChips={trendingChips}
        onOpenTab={(t) => openTab(t)}
        catalogStats={{ places: explore.length, destinations: allDests.length, regions: trending.length }}
        searchSlot={<SmartSearch placeholder='Where to? Try "Japan", "Kyoto", or "Palawan"' />}
      />

      {/* 2. TAB SWITCHER */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 z-20">
        <div className={`${GLASS} rounded-3xl p-1.5 flex gap-1 sticky top-24 shadow-lg shadow-slate-200/50`}>
          {TABS.map((t) => {
            const active = tab === t.id;
            const badge = t.id === 'plan' ? needsReviewCount : t.id === 'discover' ? explore.length : 0;
            return (
              <button key={t.id} type="button" onClick={() => toggleTab(t.id)} className={`flex-1 relative flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold tracking-wide whitespace-nowrap transition-all duration-300 active:scale-95 ${active ? PILL_ACTIVE : 'text-slate-500 hover:text-violet-600 hover:bg-white/50'}`}>
                <span className="relative flex items-center gap-2">{t.icon}{t.label}</span>
                {badge > 0 && <span className={`relative min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${active ? 'bg-white/25 text-white' : t.id === 'plan' ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'}`}>{badge > 99 ? '99+' : badge}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. TAB CONTENT */}
      <section id="tab-content" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 w-full flex-1 scroll-mt-40">
        {tab === null ? null : !ready && userId ? (
          <div className="space-y-4 animate-in fade-in duration-500">{[0, 1, 2].map((i) => <div key={i} className={`h-40 rounded-3xl ${INSET} animate-pulse`} />)}</div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {tab === 'plan' && <PlanTab userId={userId} trips={trips} refreshTrips={refreshTrips} explore={explore} schedMap={schedMap} allDests={allDests} tripReviewMap={tripReviewMap} onReviewed={() => setReviewVersion((v) => v + 1)} />}
            {tab === 'discover' && <DiscoverTab explore={explore} recs={recs} hasPersonal={hasPersonal} trending={trending} recent={recent} descMap={descMap} subtypeMap={subtypeMap} destExtra={destExtra} goSearch={goSearch} />}
            {tab === 'tools' && <ToolsTab forecast={forecast} forecastLocation={forecastLocation} trips={trips} tripReviewMap={tripReviewMap} userId={userId} onGoPlan={() => openTab('plan')} />}
          </div>
        )}
      </section>

      {/* 4. FEATURES SECTION (Moved here, below tabs) */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200/60 mt-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">plan perfectly</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">No spreadsheets. No stress. Just pure travel excitement.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { i: <RouteIcon className="h-6 w-6" />, g: 'from-indigo-500 to-violet-500', t: 'Smart Itinerary', d: 'Auto-plan assigns mornings, afternoons, and evenings across your dates, keeping same-area places together.' },
            { i: <CompassIcon className="h-6 w-6" />, g: 'from-violet-500 to-fuchsia-500', t: 'Discover Places', d: 'Browse top-rated attractions, stays, and eats — scoped to the stops you actually picked.' },
            { i: <BoltIcon className="h-6 w-6" />, g: 'from-amber-500 to-orange-500', t: 'Travel Tools', d: 'Weather outlook, pacing, and review nudges for the trips you have booked.' }
          ].map((f) => (
            <div key={f.t} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/5">
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-gradient-to-br from-violet-50 to-fuchsia-50 blur-3xl transition-all duration-500 group-hover:scale-150" />
              <div className="relative z-10">
                <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.g} text-white shadow-lg`}>
                  {f.i}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{f.t}</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. MOBILE FAB & FOOTER */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        {fabOpen && (
          <div className="absolute bottom-16 right-0 w-48 space-y-2 animate-slide-up">
            {[{ l: 'Plan', i: <RouteIcon className="w-4 h-4" />, a: () => openTab('plan') }, { l: 'Discover', i: <CompassIcon className="w-4 h-4" />, a: () => openTab('discover') }, { l: 'Search', i: <SparkleIcon className="w-4 h-4" />, a: () => router.push('/search') }].map((m) => (
              <button key={m.l} type="button" onClick={() => { m.a(); setFabOpen(false); }} className={`w-full ${NEU} rounded-2xl px-4 py-3 flex items-center gap-3 text-sm font-bold text-slate-700 ${FLOAT_SHADOW} active:scale-95 transition`}>{m.i}{m.l}</button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setFabOpen((v) => !v)} aria-label="Quick menu" className={`w-14 h-14 rounded-full bg-gradient-to-br ${GRAD} text-white flex items-center justify-center ${FLOAT_SHADOW} active:scale-90 transition ${fabOpen ? 'rotate-45' : ''}`}>
          {fabOpen ? <CloseIconInline /> : <PlusIconInline />}
        </button>
      </div>

      <div className="relative z-10"><Footer /></div>
    </main>
  );
}

function PlusIconInline() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>); }
function CloseIconInline() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>); }