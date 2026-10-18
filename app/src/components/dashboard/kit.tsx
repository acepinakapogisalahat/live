// app/src/components/dashboard/kit.tsx
'use client';
import Link from 'next/link';


/* ── shared types (single source) ── */
export type Rec = {
  recommendation_score: number; recommendation_reason: string | null;
  listing: { listing_id: string; name: string; listing_type: string; destination: { destination_name: string; region_country: string } | null } | null;
};
export type ExploreCard = {
  listing_id: string; name: string; listing_type: string; image_url: string | null; average_rating: number | null; description: string | null;
  destination: { destination_id: string; destination_name: string; region_country: string } | null;
};
export type ForecastDay = { day: string; temp: number };
export type TripItem = {
  key: string; listing_id: string; name: string; destination_id: string | null; destination_name: string | null; region_country: string | null;
  listing_type: string | null; rating: number | null; planned_date: string | null; start_time: string | null; sequence_no: number | null; notes: string | null; destBlob?: any; raw: any;
};
export type TripData = {
  trip_id: string; trip_name: string | null; start_date: string | null; end_date: string | null; status: string | null;
  stops: { label: string; days: number }[]; items: TripItem[];
};
export type ReviewMap = Record<string, { total: number; reviewed: number }>;

/* ── Neo + Glass tokens ── */
export const NEU = 'bg-[#edf0fa] shadow-[10px_10px_24px_rgba(163,170,205,0.42),-10px_-10px_24px_rgba(255,255,255,0.95)]';
export const NEU_SM = 'bg-[#edf0fa] shadow-[6px_6px_14px_rgba(163,170,205,0.38),-6px_-6px_14px_rgba(255,255,255,0.9)]';
export const NEU_HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:shadow-[14px_14px_32px_rgba(163,170,205,0.5),-14px_-14px_32px_rgba(255,255,255,1)]';
export const INSET = 'bg-[#e4e8f4] shadow-[inset_5px_5px_11px_rgba(163,170,205,0.38),inset_-5px_-5px_11px_rgba(255,255,255,0.85)]';
export const GLASS = 'bg-white/55 backdrop-blur-xl border border-white/70 shadow-[0_10px_34px_rgba(110,120,190,0.2)]';
export const GLASS_SM = 'bg-white/45 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(110,120,190,0.18),inset_0_1px_0_rgba(255,255,255,0.65)]';
export const SHEEN = 'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:via-white/5 before:to-transparent';
export const GRAD = 'from-indigo-500 via-violet-500 to-fuchsia-500';
export const GRAD_TEXT = 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent';
export const GLOSS = 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(70,80,150,0.25)]';
export const PILL_ACTIVE = `relative overflow-hidden bg-gradient-to-r ${GRAD} text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.75)] ${SHEEN}`;
export const FIELD = 'w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none';
export const INPUT = 'w-full px-4 py-3 rounded-2xl bg-[#e4e8f4] shadow-[inset_4px_4px_9px_rgba(163,170,205,0.4),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] border border-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-400/60 transition';
export const BTN_PRIMARY = `relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${GRAD} text-white font-bold shadow-[0_12px_28px_-10px_rgba(124,58,237,0.8)] hover:brightness-110 active:scale-[0.97] transition ${SHEEN}`;
export const BTN_GHOST = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-white/55 backdrop-blur-md border border-white/70 text-slate-600 font-bold hover:text-violet-600 hover:bg-white/80 active:scale-[0.97] transition shadow-[0_4px_16px_rgba(110,120,190,0.18)]';
export const BTN_DANGER = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 text-white font-bold shadow-[0_12px_28px_-10px_rgba(244,63,94,0.7)] hover:brightness-110 active:scale-[0.97] transition';
export const CANVAS = 'min-h-screen bg-[#e8ecf8] relative overflow-x-hidden';
export const FLOAT_SHADOW = 'shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3)]';
export const MODAL = 'bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.5)] ring-1 ring-slate-900/5';

/* ── pure helpers ── */
export function getTripStatus(t: { start_date: string | null; end_date: string | null }): string {
  const today = new Date().toISOString().slice(0, 10);
  if (!t.start_date || !t.end_date) return 'upcoming';
  if (today > t.end_date) return 'finished';
  if (today >= t.start_date && today <= t.end_date) return 'ongoing';
  return 'upcoming';
}
export function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}
export function extractStopLabel(regionCountry: string | null): string | null {
  if (!regionCountry) return null;
  let cleaned = regionCountry.replace(/[()]/g, '').trim();
  cleaned = cleaned.replace(/\s+(Philippines|PH|Pilipinas|Japan|JP|Australia|AU|USA|US|Canada|CA|United Kingdom|UK|Thailand|South Korea|Korea|Vietnam|Indonesia|Malaysia|Singapore|China|India|France|Italy|Spain|Germany|Switzerland|New Zealand|NZ)$/i, '').trim();
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length >= 2) return parts[parts.length - 2] || parts[0];
  return parts[0];
}
export const statusPill = (s: string) =>
  s === 'finished' ? 'bg-slate-100/80 border border-slate-200/80 text-slate-500'
  : s === 'ongoing' ? 'bg-sky-50/80 border border-sky-200/80 text-sky-600'
  : 'bg-emerald-50/80 border border-emerald-200/80 text-emerald-600';

/* ── icons ── */
export function Star({ className }: { className?: string }) { return (<svg viewBox="0 0 20 20" fill="currentColor" className={className ?? 'w-4 h-4'}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" /></svg>); }
export function Chevron({ className }: { className?: string }) { return (<svg viewBox="0 0 20 20" fill="currentColor" className={className ?? 'w-4 h-4'}><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06l3.79-3.71-3.79-3.71a.75.75 0 111.04-1.08l4.32 4.24a.75.75 0 010 1.08l-4.32 4.24a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>); }
export function ChevronDown({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
export function PlusIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>); }
export function MapIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" strokeLinejoin="round" /><path d="M9 4v14M15 6v14" strokeLinecap="round" /></svg>); }
export function CloseIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>); }
export function EditIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
export function CalendarIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" strokeLinecap="round" /></svg>); }
export function TrashIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
export function SparkleIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="currentColor" className={className ?? 'w-4 h-4'}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /><circle cx="19" cy="18" r="2" opacity=".6" /></svg>); }
export function CompassIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><circle cx="12" cy="12" r="10" /><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
export function RouteIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" /><path d="M9 19h6a3 3 0 003-3V8M6 16V8a3 3 0 013-3h6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
export function BoltIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
export function SunIcon({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" /></svg>); }

/* ── primitives ── */
export function GlassWellIcon({ gradient, children, size = 'md' }: { gradient: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  return (<div className={`relative overflow-hidden ${size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-12 h-12 rounded-2xl'} bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_-8px_rgba(80,90,180,0.65),inset_0_1px_0_rgba(255,255,255,0.55)]`}><span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent" /><span className="relative flex items-center justify-center">{children}</span></div>);
}
export function AccentBar({ center = false }: { center?: boolean }) { return <div className={`${center ? 'mx-auto ' : ''}mt-2.5 h-1.5 w-20 rounded-full bg-gradient-to-r ${GRAD} shadow-[0_0_14px_rgba(139,92,246,0.65)]`} />; }
export function SectionHeader({ title, helper }: { title: string; helper: string }) {
  return (<div className="mb-5"><h2 className="text-2xl font-black tracking-tight text-slate-800">{title}</h2><AccentBar /><span className="block mt-2 text-sm text-slate-500">{helper}</span></div>);
}
export function SummaryTile({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (<><p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">{label}</p><p className={`text-2xl font-black ${GRAD_TEXT}`}>{value}</p></>);
  if (href) {
    return (<Link href={href} className={`${NEU_SM} block rounded-2xl p-5 text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[10px_10px_26px_rgba(163,170,205,0.5)]`}>{body}</Link>);
  }
  return (<div className={`${NEU_SM} rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[10px_10px_26px_rgba(163,170,205,0.5)]`}>{body}</div>);
}
export function PlaceOverlay({ type, description, fact, footer }: { type: string; description: string | null; fact?: { label: string; value: string }; footer: string }) {
  return (<div className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-3 bg-slate-900/95 backdrop-blur-md p-6 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"><span className={`self-start px-3 py-1 rounded-full bg-gradient-to-r ${GRAD} text-xs font-black uppercase tracking-wider shadow-sm`}>{type}</span>{description ? (<p className="text-sm leading-relaxed text-slate-100 line-clamp-4">{description}</p>) : (<p className="text-sm text-slate-300">No description yet — click to see reviews and photos.</p>)}{fact && (<p className="text-xs text-slate-200"><span className="font-black uppercase tracking-wider text-slate-400">{fact.label}: </span>{fact.value}</p>)}<span className="mt-auto text-xs font-black text-violet-300">{footer} →</span></div>);
}
export function EmptyBox({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (<div className="text-center py-14"><div className={`w-14 h-14 mx-auto rounded-2xl ${INSET} text-violet-300 flex items-center justify-center mb-3`}>{icon}</div><p className="text-sm font-bold text-slate-500">{title}</p>{sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}</div>);
}
export { Link };