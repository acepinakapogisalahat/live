// app/src/components/dashboard/LandingHero.tsx
'use client';
import { useState, useEffect } from 'react';
import {
  NEU_SM, GLASS, GLASS_SM, GRAD, GRAD_TEXT, FLOAT_SHADOW, SHEEN,
  Star, SparkleIcon, CompassIcon, RouteIcon, MapIcon, BoltIcon, Link,
  type ExploreCard,
} from '@/components/dashboard/kit';

if (typeof window !== 'undefined') console.log('[LandingHero] build=clean-v2');

type Tab = 'plan' | 'discover' | 'tools';
type Props = {
  tier: 'guest' | 'new' | 'returning' | 'veteran';
  greeting: string;
  firstName: string | null;
  activeTripName: string | null;
  activeDayIndex: number;
  activeTotal: number | null;
  topPicks: ExploreCard[];
  trendingChips: { name: string; country: string; rating: number }[];
  catalogStats: { places: number; destinations: number; regions: number };
  onOpenTab: (t: Tab) => void;
  searchSlot: React.ReactNode;
};

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => { 
    const t = setTimeout(() => setShow(true), 50 + delay); 
    return () => clearTimeout(t); 
  }, [delay]);
  return (
    <div className={`transition-all duration-1000 ease-out ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>
      {children}
    </div>
  );
}

export default function LandingHero(p: Props) {
  const { tier, firstName, activeTripName, activeDayIndex, activeTotal, topPicks, catalogStats, onOpenTab, searchSlot } = p;
  const authed = tier !== 'guest';
  const isNew = tier === 'new';
  const picks = topPicks ?? [];
  // The floating preview card's header must match the listings shown inside it:
  // use the destination of the first pick (e.g. "Palawan, Philippines") instead of a
  // hardcoded "Kyoto, Japan" while the rows below are real (Philippine) listings.
  const previewDest = (() => {
    const d = picks[0]?.destination;
    if (!d) return null;
    const country = String(d.region_country ?? '').match(/\(([^)]+)\)/)?.[1] ?? d.region_country ?? '';
    return { name: d.destination_name, country };
  })();
  const previewTitle = previewDest ? `${previewDest.name}${previewDest.country ? `, ${previewDest.country}` : ''}` : 'Your Next Trip';
  const stats = catalogStats ?? { places: 0, destinations: 0, regions: 0 };
  const name = firstName ? <span className={GRAD_TEXT}>, {firstName}</span> : null;

 return (
  <div className="relative selection:bg-violet-100 selection:text-violet-900">
    <style>{`
      @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
      .animate-float { animation: float 6s ease-in-out infinite; }
      @keyframes pulse-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
    `}</style>

    {/* HERO SECTION - Remove bg-white */}
    <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Keep the gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[40rem] w-[40rem] rounded-full bg-gradient-to-r from-violet-200/40 to-sky-200/40 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 h-[30rem] w-[30rem] rounded-full bg-gradient-to-r from-fuchsia-200/30 to-violet-200/30 blur-[100px]" />
      </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left: Copy & Actions */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <FadeIn delay={0}>
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-gradient-to-r from-violet-50 to-sky-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-700 backdrop-blur-sm shadow-sm">
                  <SparkleIcon className="h-4 w-4 animate-pulse" />
                  {tier === 'veteran' ? 'Welcome back, explorer' : isNew ? 'Your adventure begins' : 'Travel planning reimagined'}
                </span>
              </FadeIn>
              
              <FadeIn delay={100}>
                <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-900">
                  {authed ? (
                    <>
                      Let&apos;s plan your next<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600">
                        adventure{name}
                      </span>
                    </>
                  ) : (
                    <>
                      Plan your dream<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600">
                        trip in minutes
                      </span>
                    </>
                  )}
                </h1>
              </FadeIn>

              <FadeIn delay={200}>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 lg:mx-0">
                  {tier === 'veteran'
                    ? 'Welcome back! Every great story starts with a single step — drop your destinations in, and we\'ll shape them into a day-by-day plan you\'ll actually want to follow.'
                    : isNew
                      ? "You're one step away from an unforgettable getaway. Tell us where you dream of going — our step-by-step planner turns that spark into a finished itinerary, free."
                      : 'Turn your travel dreams into reality. AI-powered planning, real-time collaboration, and unforgettable memories.'}
                </p>
              </FadeIn>

              <FadeIn delay={300}>
                <div className="mt-8 mx-auto max-w-xl lg:mx-0">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-lg shadow-slate-200/50 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-slate-200/60">
                    {searchSlot}
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={400}>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                  <button 
                    type="button" 
                    onClick={() => onOpenTab('plan')} 
                    className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/40 active:scale-95"
                  >
                    <RouteIcon className="h-5 w-5 transition-transform group-hover:rotate-12" />
                    Start planning free
                  </button>
                  
                  <Link 
                    href="/trip" 
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 active:scale-95"
                  >
                    {activeTripName && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {activeTripName ? `Day ${activeDayIndex}${activeTotal ? `/${activeTotal}` : ''}` : 'My trips'}
                  </Link>
                </div>
              </FadeIn>

              {/* Mini Stats */}
              <FadeIn delay={500}>
                <div className="mt-12 flex items-center justify-center gap-10 border-t border-slate-100 pt-8 lg:justify-start">
                  {[
                    { v: stats.places.toLocaleString(), l: 'Places', icon: MapIcon },
                    { v: stats.destinations.toLocaleString(), l: 'Destinations', icon: CompassIcon },
                    { v: 'Free', l: 'Forever', icon: Star }
                  ].map((s) => (
                    <div key={s.l} className="text-center lg:text-left group cursor-default">
                      <div className="flex items-center justify-center lg:justify-start gap-2">
                        <s.icon className="h-4 w-4 text-violet-500 transition-transform group-hover:scale-110" />
                        <p className="text-2xl font-black text-slate-900 tabular-nums">{s.v}</p>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.l}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>

              {/* Become a business owner — brought forward from the footer, big & encouraging */}
              <FadeIn delay={600}>
                <Link href="/apply" className="group mt-10 block">
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 p-[1px] shadow-xl shadow-violet-500/25 transition-all hover:shadow-2xl hover:shadow-violet-500/40">
                    <div className="relative flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-6 py-6 text-center sm:flex-row sm:text-left">
                      {/* soft glow accents */}
                      <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/20 blur-2xl transition-opacity group-hover:opacity-80" />
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm transition-transform group-hover:scale-110 group-hover:rotate-6">
                        <BoltIcon className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                          Own a place worth visiting?
                        </p>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-violet-100">
                          Become a business owner and put your hotel, restaurant, or attraction in front of thousands of travelers planning right now — it&apos;s free to apply.
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-lg transition-all group-hover:scale-105 group-hover:bg-violet-50">
                        Get started
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.19l-3.72-3.72a.75.75 0 111.06-1.06l5 5a.75.75 0 010 1.06l-5 5a.75.75 0 11-1.06-1.06l3.72-3.72H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
                      </span>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            </div>

            {/* Right: Abstract UI Preview */}
            <FadeIn delay={300} className="lg:col-span-5 hidden lg:block">
              <div className="relative animate-float">
                <div className="relative z-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-300/50">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Day 1</p>
                      <p className="text-2xl font-black text-slate-900 truncate max-w-[16rem]" title={previewTitle}>{previewTitle}</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-3 text-white shadow-lg shadow-violet-500/30">
                      <MapIcon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(picks.length ? picks.slice(0, 3) : [{ name: 'Arrival & Old Town Walk', type: 'Activity' }, { name: 'Lunch at Local Café', type: 'Food' }, { name: 'Sunset Viewpoint', type: 'Sightseeing' }]).map((item: any, i) => (
                      <div key={i} className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-slate-50 to-white p-4 transition-all hover:scale-[1.02] hover:shadow-md">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${i === 0 ? 'from-violet-500 to-indigo-600' : i === 1 ? 'from-amber-400 to-orange-500' : 'from-sky-400 to-indigo-500'} text-white shadow-lg`}>
                          {i === 0 ? <CompassIcon className="h-5 w-5" /> : i === 1 ? <Star className="h-5 w-5" /> : <MapIcon className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                          <p className="text-xs font-semibold text-slate-500">{item.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => onOpenTab('plan')} 
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                  >
                    <SparkleIcon className="h-4 w-4" />
                    Auto-generate your plan
                  </button>
                </div>
                <div className="absolute -right-4 -top-4 h-full w-full rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 -z-10" />
                <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-3xl bg-gradient-to-br from-violet-300 to-fuchsia-300 blur-2xl -z-10 animate-pulse-glow" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </div>
  );
}