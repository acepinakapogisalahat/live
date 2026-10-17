// app/src/components/dashboard/PlanTab.tsx — CLICK TO SCHEDULE (No Drag & Drop)
'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { notifyListingOwner } from '@/utils/supabase/tripSignals';
import {
  INSET, GLASS, GLASS_SM, GRAD, GLOSS, PILL_ACTIVE, INPUT,
  Star, ChevronDown, PlusIcon, MapIcon, CloseIcon, EditIcon, TrashIcon, SparkleIcon, RouteIcon,
  GlassWellIcon, EmptyBox, Link,
  getTripStatus, fmtDate, extractStopLabel, statusPill,
  type TripItem, type TripData, type ExploreCard, type ReviewMap,
} from '@/components/dashboard/kit';

const TIME_OPTIONS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const SLOT_BASE = ['09:00', '13:00', '18:00'];
const SLOT_NAMES = ['Morning', 'Afternoon', 'Evening'];
const SLOT_STRIPE = ['from-sky-400 to-cyan-400', 'from-amber-400 to-orange-400', 'from-indigo-400 to-violet-500'];
const STOP_LINE = ['bg-violet-400', 'bg-sky-400', 'bg-amber-400', 'bg-emerald-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400', 'bg-rose-400'];
const STOP_BORDER = ['border-violet-500', 'border-sky-500', 'border-amber-500', 'border-emerald-500', 'border-pink-500', 'border-indigo-500', 'border-teal-500', 'border-rose-500'];
const STOP_FILL = ['bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500'];
const MODAL_SURF = 'bg-white shadow-[0_28px_70px_-18px_rgba(15,23,42,0.6)] ring-1 ring-slate-900/10';
const SHEET_SURF = 'bg-white shadow-[-32px_0_80px_-24px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10';
const CARD = 'bg-white border border-slate-200 shadow-sm';
const selectCls = 'px-1 py-1 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 focus:ring-2 focus:ring-violet-400/60 outline-none cursor-pointer hover:bg-slate-200 transition';

const GEO_KEY = /(province|region|state|city|municipalit|town|address|location|subdivision|district|area|country|destination)/i;
function geoOf(x: any): string {
  if (!x) return '';
  const parts: string[] = [];
  const push = (o: any) => { if (o && typeof o === 'object') { for (const k of Object.keys(o)) { if (k.endsWith('_id')) continue; const v = o[k]; if (typeof v === 'string' && v.trim() && GEO_KEY.test(k)) parts.push(v); } } };
  if (x.destination) push(x.destination);
  if (x.destBlob) push(x.destBlob);
  push(x);
  return parts.join(' ').toLowerCase();
}
function matchesStop(x: any, label: string): boolean {
  const l = (label ?? '').trim().toLowerCase();
  if (!l || !x) return false;
  const hay = geoOf(x);
  if (!hay) return false;
  if (hay.includes(l)) return true;
  const norm = (s: string) => s.replace(/[^a-z0-9]+/g, ' ').trim();
  const hn = norm(hay), ln = norm(l);
  if (hn.includes(ln)) return true;
  const words = ln.split(' ').filter(Boolean);
  if (!words.length) return false;
  const hw = hn.split(' ').filter(Boolean);
  const hs = new Set(hw);
  return words.every((w) => hs.has(w) || hw.some((h) => h.includes(w) || w.includes(h)));
}
const bucketOf = (time: string | null, fallback = 0) => { if (!time) return fallback; const h = parseInt(time.slice(0, 2), 10); return h < 12 ? 0 : h < 17 ? 1 : 2; };

if (typeof window !== 'undefined') console.log('[PlanTab] build=click-schedule-v1');

type Props = {
  userId: string | null; trips: TripData[]; refreshTrips: () => Promise<void> | void;
  explore: ExploreCard[]; schedMap: Record<string, { open: string; close: string }>;
  allDests: { destination_name: string; region_country: string }[];
  tripReviewMap: ReviewMap; onReviewed: () => void;
};

export default function PlanTab({ userId, trips, refreshTrips, explore, schedMap, allDests, tripReviewMap, onReviewed }: Props) {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showReviewTripModal, setShowReviewTripModal] = useState(false);
  const [showReplanConfirm, setShowReplanConfirm] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<TripItem | null>(null);
  const [tripFilter, setTripFilter] = useState<'active' | 'upcoming' | 'ongoing' | 'finished'>('active');
  const [plannerQuery, setPlannerQuery] = useState('');
  const [plannerErr, setPlannerErr] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [startName, setStartName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startBusy, setStartBusy] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [destPickerOpen, setDestPickerOpen] = useState(false);
  const [destSearch, setDestSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<'pool' | 'route'>('pool');
  const [showNoteModal, setShowNoteModal] = useState<{ afterKey: string; date: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [copied, setCopied] = useState(false);
  const [flashDay, setFlashDay] = useState<string | null>(null);
  
  // NEW: State for the "Choose a Day" modal
  const [scheduleModal, setScheduleModal] = useState<{ listingId?: string; itemKey?: string } | null>(null);

  const plannerScrolledRef = useRef(false);
  const diagRef = useRef(false);
  const dayRefs = useRef<Record<string, HTMLElement | null>>({});
  const flashTimerRef = useRef<number | null>(null);

  // ---- derived ----
  const selectedTrip = trips.find((t) => t.trip_id === selectedTripId) ?? trips[0] ?? null;
  const inTripIds = new Set(selectedTrip?.items.map((i) => i.listing_id).filter((id) => id != null && id !== 'NOTE') ?? []);
  const tripStops = (selectedTrip?.stops ?? []) as { label: string; days: number }[];
  const tripDays = selectedTrip?.start_date && selectedTrip?.end_date ? Math.max(1, Math.round((new Date(selectedTrip.end_date + 'T00:00:00').getTime() - new Date(selectedTrip.start_date + 'T00:00:00').getTime()) / 86400000) + 1) : null;
  const totalAllocated = tripStops.reduce((sum, s) => sum + (s.days || 1), 0);
  const capacity = tripStops.length > 0 ? totalAllocated * 3 : tripDays ? tripDays * 3 : 6;
  const plannedPlaceCount = selectedTrip ? selectedTrip.items.filter((i) => i.planned_date && i.listing_type !== 'Note').length : 0;
  const plannedDates = selectedTrip ? ([...new Set(selectedTrip.items.map((i) => i.planned_date).filter(Boolean))] as string[]).sort() : [];
  const unscheduledItems = selectedTrip ? selectedTrip.items.filter((i) => !i.planned_date && i.listing_type !== 'Note') : [];
  const allDays: string[] = (() => { if (!selectedTrip?.start_date || !selectedTrip?.end_date) return []; const out: string[] = []; const d0 = new Date(selectedTrip.start_date + 'T00:00:00'); const d1 = new Date(selectedTrip.end_date + 'T00:00:00'); for (const d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) out.push(d.toISOString().slice(0, 10)); return out; })();
  const previewCount = destSearch.trim().length >= 2 ? explore.filter((l) => matchesStop(l, destSearch)).length : 0;
  const regionSuggestions = (() => {
    const q = destSearch.trim().toLowerCase(); if (q.length < 2) return [] as string[];
    const seen = new Set<string>(); const out: string[] = [];
    for (const d of allDests) {
      const geo = geoOf(d); if (!geo || !geo.includes(q)) continue;
      const label = String((d as any).province ?? (d as any).region ?? (d as any).state ?? d.region_country ?? d.destination_name ?? '').trim();
      if (!label || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase()); out.push(label); if (out.length >= 4) break;
    }
    return out;
  })();
  const scopedPool = tripStops.length > 0 ? explore.filter((l) => tripStops.some((s) => matchesStop(l, s.label))) : explore;
  const scopedList = scopedPool.filter((l) => !inTripIds.has(l.listing_id)).sort((a, b) => (b.average_rating ?? -1) - (a.average_rating ?? -1));
  const stopHasNoCatalogMatches = tripStops.length > 0 && scopedPool.length === 0 && explore.length > 0;
  const allStopMatchesAdded = tripStops.length > 0 && scopedPool.length > 0 && scopedList.length === 0;
  const globalFallback = explore.filter((l) => !inTripIds.has(l.listing_id)).sort((a, b) => (b.average_rating ?? -1) - (a.average_rating ?? -1)).slice(0, 8);
  const suggestions: ExploreCard[] = scopedList.length > 0 ? scopedList.slice(0, 8) : (stopHasNoCatalogMatches ? globalFallback : []);
  const plannerMatches = plannerQuery.trim().length >= 2 ? explore.filter((l) => !inTripIds.has(l.listing_id) && (tripStops.length === 0 || tripStops.some((s) => matchesStop(l, s.label))) && `${l.name} ${l.destination?.destination_name ?? ''} ${l.destination?.region_country ?? ''}`.toLowerCase().includes(plannerQuery.trim().toLowerCase())).slice(0, 6) : [];
  const addList = plannerMatches.length > 0 ? plannerMatches : suggestions;
  const sortedTrips = [...trips].sort((a, b) => { const rank = (t: TripData) => (getTripStatus(t) !== 'finished' ? 0 : tripNeedsReview(t) ? 1 : 2); return rank(a) - rank(b) || (b.start_date ?? '').localeCompare(a.start_date ?? ''); });
  const filteredTrips = sortedTrips.filter((t) => { const st = getTripStatus(t); if (tripFilter === 'active') return st !== 'finished'; return st === tripFilter; });
  const tripStatus = selectedTrip ? getTripStatus(selectedTrip) : null;
  const liveDayIndex = selectedTrip?.start_date && tripStatus === 'ongoing' ? Math.max(1, Math.floor((Date.now() - new Date(selectedTrip.start_date + 'T00:00:00').getTime()) / 86400000) + 1) : null;
  const todayISO = new Date().toISOString().slice(0, 10);

  function tripReviewInfo(t: TripData) { return tripReviewMap[t.trip_id] ?? { total: 0, reviewed: 0 }; }
  function tripNeedsReview(t: TripData) { const i = tripReviewInfo(t); return getTripStatus(t) === 'finished' && i.total > 0 && i.reviewed < i.total; }
  const pendingReviewCount = selectedTrip ? Math.max(0, tripReviewInfo(selectedTrip).total - tripReviewInfo(selectedTrip).reviewed) : 0;
  const needsReviewCount = trips.filter(tripNeedsReview).length;

  // ---- helpers ----
  function dbId(it: TripItem) { return it.raw?.trip_item_id ?? it.key; }
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  function fmtTime(t: string | null) { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h, 10); const ampm = hr >= 12 ? 'PM' : 'AM'; const hr12 = hr % 12 === 0 ? 12 : hr % 12; return `${hr12}:${m} ${ampm}`; }
  function stopsFor(date: string) { return (selectedTrip?.items ?? []).filter((i) => i.planned_date === date).sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0) || (a.start_time ?? '').localeCompare(b.start_time ?? '')); }
  function dayPlaces(date: string) { return stopsFor(date).filter((i) => i.listing_type !== 'Note'); }
  function dayNotes(date: string) { return stopsFor(date).filter((i) => i.listing_type === 'Note'); }
  function freeSlotIndex(date: string): number { const ps = dayPlaces(date); if (ps.length >= 3) return -1; for (let si = 0; si < 3; si++) { if (!ps.some((p) => bucketOf(p.start_time, si) === si)) return si; } return ps.length < 3 ? Math.min(2, ps.length) : -1; }
  function nextSeq(date: string): number { const taken = new Set(stopsFor(date).map((i) => i.sequence_no ?? 0)); let n = 1; while (taken.has(n)) n++; return n; }
  function getItemStop(item: TripItem): string | null { if (!item.destination_name && !item.region_country && !item.destBlob) return null; for (const s of tripStops) { if (matchesStop(item, s.label)) return s.label; } return null; }
  function getStopForDate(date: string): string | null { if (!selectedTrip?.start_date || !tripStops.length) return null; const start = new Date(selectedTrip.start_date + 'T00:00:00'); const target = new Date(date + 'T00:00:00'); const off = Math.floor((target.getTime() - start.getTime()) / 86400000); let cursor = 0; for (const s of tripStops) { const n = s.days || 1; if (off >= cursor && off < cursor + n) return s.label; cursor += n; } return null; }
  function stopItemCount(label: string) { return (selectedTrip?.items ?? []).filter((i) => matchesStop(i, label)).length; }
  function stopIdxFor(date: string): number { const stop = getStopForDate(date); const i = stop ? tripStops.findIndex((s) => s.label === stop) : -1; return i >= 0 ? i : 0; }
  function pickSlotTimes(type: string | null, listingId: string): string[] { if (type === 'Restaurant') return ['12:00:00', '18:00:00']; const base = ['09:00:00', '13:00:00']; const sched = schedMap[listingId]; if (!sched) return base; const ok = base.filter((s) => sched.open <= s.slice(0, 5) && s.slice(0, 5) < sched.close); return ok.length ? ok : base; }
  function findFreeTime(date: string, slotIdx: number, allowed: string[], excludeKey?: string): string | null {
    const others = dayPlaces(date).filter((i) => i.key !== excludeKey).map((i) => toMin((i.start_time ?? '').slice(0, 5))).filter((n) => !isNaN(n));
    const clash = (mins: number) => others.some((o) => Math.abs(o - mins) < 60);
    const base = SLOT_BASE[slotIdx];
    const pref = allowed.includes(`${base}:00`) ? `${base}:00` : (allowed.find((t) => bucketOf(t) === slotIdx) ?? allowed[0] ?? `${base}:00`);
    if (!clash(toMin(pref.slice(0, 5)))) return pref;
    const bh = parseInt(base.slice(0, 2), 10);
    for (const off of [30, -30, 60, -60, 90]) {
      const mins = bh * 60 + off;
      if (mins < 7 * 60 || mins > 22 * 60) continue;
      const cand = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`;
      if (!clash(mins)) return cand;
    }
    return null;
  }

  // ---- mutations ----
  async function createTrip(name: string, start: string, end: string): Promise<string> { if (!name.trim()) throw new Error('Give your trip a name.'); if (start && end && end < start) throw new Error('End date must be after the start date.'); const { data: tripId, error: idErr } = await supabase.rpc('new_trip_id'); if (idErr) throw idErr; const { error } = await supabase.from('trips').insert({ trip_id: tripId as string, user_id: userId, trip_name: name.trim(), start_date: start || null, end_date: end || null }); if (error) throw error; return tripId as string; }
  async function handleStartCreate(e: React.FormEvent) { e.preventDefault(); setPlannerErr(null); setStartBusy(true); try { const id = await createTrip(startName, startDate, endDate); await refreshTrips(); setSelectedTripId(id); setStartName(''); setStartDate(''); setEndDate(''); } catch (err: any) { setPlannerErr(err?.message ?? 'Could not create the trip.'); } setStartBusy(false); }
  async function deleteTrip(tripId: string) { const { error: itemsErr } = await supabase.from('trip_items').delete().eq('trip_id', tripId); if (itemsErr) { setPlannerErr(itemsErr.message); return; } const { error } = await supabase.from('trips').delete().eq('trip_id', tripId); if (error) setPlannerErr(error.message); else { await refreshTrips(); setShowDeleteConfirm(null); if (selectedTripId === tripId) setSelectedTripId(null); } }
  
  async function addItem(listingId: string, slot?: { date: string; time: string; seq: number }) {
    const trip = selectedTrip; if (!trip) return; setPlannerErr(null); setAddingId(listingId);
    try {
      const pc = trip.items.filter((i) => i.listing_type !== 'Note').length;
      if (pc >= capacity) { throw new Error(tripDays ? `Trip full: ${tripDays} day${tripDays === 1 ? '' : 's'} fit ${capacity} places (3 per day). Extend the dates or remove a place.` : 'Starter limit reached (6 places). Set trip dates to unlock more slots.'); }
      if (trip.stops.length === 0) { const listing = addList.find((l) => l.listing_id === listingId) ?? explore.find((l) => l.listing_id === listingId); if (listing) { const stopLabel = extractStopLabel(listing.destination?.region_country ?? null); if (stopLabel) await saveStops([{ label: stopLabel, days: tripDays ?? 1 }]); } }
      const { error } = await supabase.from('trip_items').insert({ trip_item_id: `ITI-${Date.now().toString().slice(-8)}`, trip_id: trip.trip_id, listing_id: listingId, sequence_no: slot?.seq ?? (trip.items.length ?? 0) + 1, planned_date: slot?.date ?? null, start_time: slot?.time ?? null, notes: null });
      if (error) throw error;
      await notifyListingOwner(listingId); // anonymous demand signal to the business owner (best-effort)
      await refreshTrips();
    } catch (err: any) { setPlannerErr(err?.message ?? 'Could not add this place.'); }
    setAddingId(null);
  }

  function removeItem(it: TripItem) { setPendingRemove(it); }
  async function performRemove(it: TripItem) {
    const trip = selectedTrip; if (!trip) { setPendingRemove(null); return; }
    let query = supabase.from('trip_items').delete();
    if (it.raw?.trip_item_id) query = query.eq('trip_item_id', it.raw.trip_item_id);
    else if (it.listing_id && it.listing_id !== 'NOTE') query = query.eq('trip_id', trip.trip_id).eq('listing_id', it.listing_id);
    else { setPlannerErr('This item is missing an ID. Refresh the page and try again.'); setPendingRemove(null); return; }
    const { error } = await query;
    if (error) setPlannerErr(error.message); else await refreshTrips();
    setPendingRemove(null);
  }

  async function unscheduleItem(key: string) {
    const trip = selectedTrip; if (!trip) return;
    const item = trip.items.find((i) => i.key === key); if (!item || item.listing_type === 'Note') return;
    setPlannerErr(null);
    const { error } = await supabase.from('trip_items').update({ planned_date: null, start_time: null, sequence_no: null }).eq('trip_item_id', dbId(item));
    if (error) setPlannerErr(error.message); else await refreshTrips();
  }

  async function unscheduleDay(date: string) {
    const trip = selectedTrip; if (!trip) return;
    setPlannerErr(null);
    for (const it of dayPlaces(date)) {
      const { error } = await supabase.from('trip_items').update({ planned_date: null, start_time: null, sequence_no: null }).eq('trip_item_id', dbId(it));
      if (error) { setPlannerErr(error.message); return; }
    }
    await refreshTrips();
  }

  async function changeItemTime(itemKey: string, time: string) { const trip = selectedTrip; if (!trip || !time) return; const item = trip.items.find((i) => i.key === itemKey); if (!item) return; setPlannerErr(null); const { error } = await supabase.from('trip_items').update({ start_time: `${time}:00` }).eq('trip_item_id', dbId(item)); if (error) setPlannerErr(error.message); else await refreshTrips(); }
  
  async function swapItems(keyA: string, keyB: string) { const trip = selectedTrip; if (!trip || keyA === keyB) return; const a = trip.items.find((i) => i.key === keyA); const b = trip.items.find((i) => i.key === keyB); if (!a || !b || a.listing_type === 'Note' || b.listing_type === 'Note') return; const stopA = getStopForDate(a.planned_date ?? ''); const stopB = getStopForDate(b.planned_date ?? ''); const regionA = getItemStop(a); const regionB = getItemStop(b); if (stopA && regionB && stopA !== regionB) { setPlannerErr(`Can't swap — "${b.name}" isn't in ${stopA}.`); return; } if (stopB && regionA && stopB !== regionA) { setPlannerErr(`Can't swap — "${a.name}" isn't in ${stopB}.`); return; } const seqA = a.sequence_no, seqB = b.sequence_no; setPlannerErr(null); const { error: e1 } = await supabase.from('trip_items').update({ planned_date: b.planned_date, start_time: b.start_time, sequence_no: seqB }).eq('trip_item_id', dbId(a)); const { error: e2 } = await supabase.from('trip_items').update({ planned_date: a.planned_date, start_time: a.start_time, sequence_no: seqA }).eq('trip_item_id', dbId(b)); if (e1 || e2) setPlannerErr((e1 ?? e2)?.message ?? 'Swap failed.'); else await refreshTrips(); }
  
  async function placeExisting(key: string, date: string, slotIdx: number) {
    const trip = selectedTrip; if (!trip) return;
    const item = trip.items.find((i) => i.key === key); if (!item || item.listing_type === 'Note') return;
    setPlannerErr(null);
    const itemStop = getItemStop(item); const dayStop = getStopForDate(date);
    if (itemStop && dayStop && itemStop !== dayStop) { setPlannerErr(`"${item.name}" belongs to ${itemStop} — it can't go on a ${dayStop} day.`); return; }
    if (dayPlaces(date).filter((p) => p.key !== key).length >= 3) { setPlannerErr('That day already has 3 places.'); return; }
    const time = findFreeTime(date, slotIdx, pickSlotTimes(item.listing_type, item.listing_id), key);
    if (!time) { setPlannerErr('No free time slot there — times must stay 1 hour apart.'); return; }
    const { error } = await supabase.from('trip_items').update({ planned_date: date, start_time: time, sequence_no: nextSeq(date) }).eq('trip_item_id', dbId(item));
    if (error) setPlannerErr(error.message); else await refreshTrips();
  }

  // NEW: Handle scheduling via the modal
  async function handleScheduleDay(date: string) {
    if (!scheduleModal) return;
    const si = freeSlotIndex(date);
    if (si === -1) { 
      setPlannerErr('That day already has 3 places. Try another day!'); 
      return; 
    }

    if (scheduleModal.itemKey) {
      // Moving an existing item
      await placeExisting(scheduleModal.itemKey, date, si);
    } else if (scheduleModal.listingId) {
      // Adding a new item from the pool/inbox
      const listing = explore.find((l) => l.listing_id === scheduleModal.listingId);
      const dayStop = getStopForDate(date);
      if (listing && dayStop && !matchesStop(listing, dayStop)) { 
        setPlannerErr(`"${listing.name}" isn't in ${dayStop} — pick a day in its stop.`); 
        return; 
      }
      const time = findFreeTime(date, si, pickSlotTimes(listing?.listing_type ?? null, scheduleModal.listingId));
      if (!time) { setPlannerErr('No free time slot there.'); return; }
      await addItem(scheduleModal.listingId, { date, time, seq: nextSeq(date) });
    }
    setScheduleModal(null);
  }

  async function addNoteToDay(date: string) {
    const day = stopsFor(date);
    const after = day[day.length - 1];
    if (!after) { setPlannerErr('Add a place to that day first — notes attach under places.'); return; }
    setShowNoteModal({ afterKey: after.key, date }); setNoteText('');
  }
  async function addNoteBetween() { const trip = selectedTrip; if (!trip || !showNoteModal || !noteText.trim()) return; const { afterKey, date } = showNoteModal; setPlannerErr(null); const dayItems = trip.items.filter((i) => i.planned_date === date).sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0)); const after = dayItems.find((i) => i.key === afterKey); if (!after) return; const insertSeq = (after.sequence_no ?? 0) + 1; try { for (const i of dayItems.filter((x) => (x.sequence_no ?? 0) >= insertSeq)) { const { error } = await supabase.from('trip_items').update({ sequence_no: (i.sequence_no ?? 0) + 1 }).eq('trip_item_id', dbId(i)); if (error) throw error; } const { error } = await supabase.from('trip_items').insert({ trip_item_id: `NOTE-${Date.now().toString().slice(-8)}`, trip_id: trip.trip_id, listing_id: null, sequence_no: insertSeq, planned_date: date, start_time: null, notes: noteText.trim() }); if (error) throw error; setShowNoteModal(null); setNoteText(''); await refreshTrips(); } catch (e: any) { setPlannerErr(e?.message ?? 'Could not add note.'); } }
  async function updateTripDates(start: string, end: string) { const trip = selectedTrip; if (!trip) return; if (start && end && end < start) { setPlannerErr('End date must be after the start date.'); return; } setPlannerErr(null); const { error } = await supabase.from('trips').update({ start_date: start || null, end_date: end || null }).eq('trip_id', trip.trip_id); if (error) setPlannerErr(error.message); else await refreshTrips(); }
  async function saveStops(next: { label: string; days: number }[]) { const trip = selectedTrip; if (!trip) return; const { error } = await supabase.from('trips').update({ stops: next }).eq('trip_id', trip.trip_id); if (error) setPlannerErr(error.message); else await refreshTrips(); }
  async function addStop(label: string) { const clean = label.trim(); if (clean.length < 2) return; if (tripStops.some((s) => s.label.toLowerCase() === clean.toLowerCase())) { setPlannerErr('That stop is already in the trip.'); return; } setPlannerErr(null); await saveStops(distributeDays([...tripStops, { label: clean, days: 1 }], tripDays)); setDestPickerOpen(false); setDestSearch(''); }
  async function removeStop(label: string) { await saveStops(distributeDays(tripStops.filter((s) => s.label !== label), tripDays)); }
  async function setStopDays(label: string, days: number) { await saveStops(tripStops.map((s) => (s.label === label ? { ...s, days: Math.max(1, days) } : s))); }
  function distributeDays(stops: { label: string; days: number }[], totalDays: number | null): { label: string; days: number }[] {
    if (!totalDays || stops.length === 0) return stops;
    const counts = stops.map((s) => stopItemCount(s.label));
    const totalItems = counts.reduce((a, b) => a + b, 0);
    let rawDays: number[];
    if (totalItems === 0) { const base = Math.floor(totalDays / stops.length); const rem = totalDays % stops.length; rawDays = stops.map((_, i) => base + (i < rem ? 1 : 0)); }
    else { rawDays = counts.map((c) => Math.max(1, Math.round((c / totalItems) * totalDays))); }
    let currentSum = rawDays.reduce((a, b) => a + b, 0);
    let diff = totalDays - currentSum;
    if (diff > 0) { const indices = stops.map((_, i) => i).sort((a, b) => counts[b] - counts[a]); for (let i = 0; diff > 0; diff--, i = (i + 1) % indices.length) rawDays[indices[i]]++; }
    else if (diff < 0) { for (let i = 0; diff < 0; diff++) { let maxIdx = -1, maxDays = 1; for (let j = 0; j < rawDays.length; j++) if (rawDays[j] > maxDays) { maxDays = rawDays[j]; maxIdx = j; } if (maxIdx !== -1) rawDays[maxIdx]--; else break; } }
    return stops.map((s, i) => ({ ...s, days: Math.max(0, rawDays[i]) }));
  }
  async function autoAllocateDays() { const trip = selectedTrip; if (!trip) return; await saveStops(distributeDays(tripStops, tripDays)); }
  async function autoFill() {
    const trip = selectedTrip; if (!trip) return; setPlannerErr(null);
    if (!trip.start_date || !trip.end_date) { setPlannerErr('Set the trip dates first — the board needs days to fill.'); return; }
    const pending = trip.items.filter((i) => !i.planned_date && i.listing_type !== 'Note' && i.listing_type !== 'Hotel');
    if (!pending.length) { setPlannerErr('Nothing is waiting in the inbox.'); return; }
    setPlanning(true);
    try {
      const blocks = new Map<string, string[]>(); let cursor = 0;
      for (const s of tripStops) { const n = Math.max(1, s.days || 1); blocks.set(s.label, allDays.slice(cursor, cursor + n)); cursor += n; }
      const restDays = allDays.slice(cursor);
      const typeRank: Record<string, number> = { Attraction: 0, Restaurant: 1, Hotel: 2 };
      const ordered = [...pending].sort((a, b) => { const ta = typeRank[a.listing_type ?? ''] ?? 3; const tb = typeRank[b.listing_type ?? ''] ?? 3; if (ta !== tb) return ta - tb; return (b.rating ?? -1) - (a.rating ?? -1); });
      for (const item of ordered) {
        const stopLabel = getItemStop(item);
        const candidates = stopLabel ? (blocks.get(stopLabel) ?? allDays) : (restDays.length ? restDays : allDays);
        let placed = false;
        for (const day of [...candidates, ...allDays]) {
          const si = freeSlotIndex(day);
          if (si === -1) continue;
          const itemStop = getItemStop(item); const dayStop = getStopForDate(day);
          if (itemStop && dayStop && itemStop !== dayStop) continue;
          const time = findFreeTime(day, si, pickSlotTimes(item.listing_type, item.listing_id));
          if (!time) continue;
          const { error } = await supabase.from('trip_items').update({ planned_date: day, start_time: time, sequence_no: nextSeq(day) }).eq('trip_item_id', dbId(item));
          if (error) throw error;
          placed = true; break;
        }
        if (!placed) setPlannerErr(`Couldn't fit "${item.name}" — every day in its stop is full.`);
      }
      await refreshTrips();
    } catch (err: any) { setPlannerErr(err?.message ?? 'Could not auto-fill.'); }
    setPlanning(false);
  }
  async function autoPlan() {
    const trip = selectedTrip; if (!trip) return; setPlannerErr(null);
    if (!trip.start_date || !trip.end_date) { setPlannerErr('Set the trip dates above first — the planner needs days to fill.'); return; }
    if (tripStops.length === 0) { setPlannerErr('Add a destination stop first (e.g., "La Union"), then add places inside it.'); return; }
    if (trip.items.filter((i) => i.listing_type !== 'Note').length === 0) { setPlannerErr('Add at least one place first.'); return; }
    setPlanning(true);
    try {
      const days: string[] = []; const d0 = new Date(trip.start_date + 'T00:00:00'); const d1 = new Date(trip.end_date + 'T00:00:00');
      for (const d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) days.push(d.toISOString().slice(0, 10));
      const blocks = new Map<string, string[]>(); let cursor = 0;
      for (const s of tripStops) { const n = Math.max(1, s.days || 1); blocks.set(s.label, days.slice(cursor, cursor + n)); cursor += n; }
      const daySeqTaken = new Map<string, Set<number>>();
      function takeSeq(date: string): number { if (!daySeqTaken.has(date)) daySeqTaken.set(date, new Set(trip.items.filter((i) => i.planned_date === date && i.listing_type === 'Note').map((i) => i.sequence_no ?? 0))); const set = daySeqTaken.get(date)!; let s = 1; while (set.has(s)) s++; set.add(s); return s; }
      const typeRank: Record<string, number> = { Attraction: 0, Restaurant: 1, Hotel: 2 };
      const assignments: { item: TripItem; date: string; time: string; seq: number }[] = [];
      const usedTimesPerDay = new Map<string, Set<string>>();
      function getUsedTimes(date: string) { if (!usedTimesPerDay.has(date)) usedTimesPerDay.set(date, new Set()); return usedTimesPerDay.get(date)!; }
      function getTime(date: string, slotIdx: number, allowed: string[]): string { const usedTimes = getUsedTimes(date); const preferred = ['09:00:00', '13:00:00', '18:00:00']; const pref = preferred[slotIdx]; if (allowed.includes(pref) && !usedTimes.has(pref)) { usedTimes.add(pref); return pref; } for (const t of allowed) { if (!usedTimes.has(t)) { usedTimes.add(t); return t; } } if (!usedTimes.has(pref)) { usedTimes.add(pref); return pref; } const baseHour = [9, 13, 18][slotIdx]; let h = baseHour, m = 0; while (usedTimes.has(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)) { m += 30; if (m >= 60) { m = 0; h += 1; } if (h >= 23) { h = 9; m = 0; break; } } const finalTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`; usedTimes.add(finalTime); return finalTime; }
      for (const s of tripStops) { const sdays = blocks.get(s.label) ?? []; if (!sdays.length) continue; const items = trip.items.filter((i) => matchesStop(i, s.label) && i.listing_type !== 'Note').sort((a, b) => { const ta = typeRank[a.listing_type ?? ''] ?? 3; const tb = typeRank[b.listing_type ?? ''] ?? 3; if (ta !== tb) return ta - tb; return (b.rating ?? -1) - (a.rating ?? -1); }); let dayIdx = 0; let used = 0; for (const item of items) { if (item.listing_type === 'Hotel') continue; const allowed = pickSlotTimes(item.listing_type, item.listing_id); if (used >= 3) { dayIdx += 1; used = 0; } if (dayIdx >= sdays.length) dayIdx = sdays.length - 1; const time = getTime(sdays[dayIdx], used, allowed); assignments.push({ item, date: sdays[dayIdx], time, seq: takeSeq(sdays[dayIdx]) }); used += 1; } }
      const assignedKeys = new Set(assignments.map((a) => a.item.key));
      const leftovers = trip.items.filter((i) => !assignedKeys.has(i.key) && i.listing_type !== 'Hotel' && i.listing_type !== 'Note');
      if (leftovers.length) { const restDays = days.slice(cursor); const useDays = restDays.length ? restDays : days; let dayIdx = 0; let used = 0; for (const item of leftovers.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))) { const allowed = pickSlotTimes(item.listing_type, item.listing_id); if (used >= 3) { dayIdx += 1; used = 0; } if (dayIdx >= useDays.length) dayIdx = useDays.length - 1; const time = getTime(useDays[dayIdx], used, allowed); assignments.push({ item, date: useDays[dayIdx], time, seq: takeSeq(useDays[dayIdx]) }); used += 1; } }
      for (const a of assignments) { const { error } = await supabase.from('trip_items').update({ planned_date: a.date, start_time: a.time, sequence_no: a.seq }).eq('trip_item_id', dbId(a.item)); if (error) throw error; }
      await refreshTrips();
    } catch (err: any) { setPlannerErr(err?.message ?? 'Could not auto-plan this trip.'); }
    setPlanning(false);
  }
  async function clearPlan() { const trip = selectedTrip; if (!trip) return; const { error } = await supabase.from('trip_items').update({ planned_date: null, start_time: null, sequence_no: null }).eq('trip_id', trip.trip_id); if (!error) await refreshTrips(); else setPlannerErr(error.message); }
  async function replanAll() { setShowReplanConfirm(false); await clearPlan(); await autoPlan(); }
  async function copyItinerary() {
    const trip = selectedTrip; if (!trip) return;
    const lines: string[] = [`${trip.trip_name ?? 'Trip'} — ${fmtDate(trip.start_date)} → ${fmtDate(trip.end_date)}`, ''];
    plannedDates.forEach((d, i) => {
      lines.push(`DAY ${i + 1} · ${fmtDate(d)}${getStopForDate(d) ? ` · ${getStopForDate(d)}` : ''}`);
      stopsFor(d).forEach((it) => { if (it.listing_type === 'Note') lines.push(`   📝 ${it.notes}`); else lines.push(`   ${fmtTime(it.start_time) || '—'} · ${SLOT_NAMES[bucketOf(it.start_time)]} · ${it.name}${it.rating != null ? ` (★${Number(it.rating).toFixed(1)})` : ''}`); });
      lines.push('');
    });
    if (unscheduledItems.length) { lines.push('NOT SCHEDULED:'); unscheduledItems.forEach((u) => lines.push(`   · ${u.name}`)); }
    try {
      const text = lines.join('\n');
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { setPlannerErr('Could not copy — clipboard blocked.'); }
  }
  function openPool(tab: 'pool' | 'route') { setSheetTab(tab); setSheetOpen(true); }
  function focusDay(date: string) {
    const el = dayRefs.current[date];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashDay(date);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlashDay((d) => (d === date ? null : d)), 1400);
  }

  // ---- effects ----
  useEffect(() => { const fromUrl = searchParams.get('trip'); const fromSession = typeof window !== 'undefined' ? window.sessionStorage.getItem('tm-open-trip') : null; const t = fromUrl ?? fromSession; if (t && trips.some((x) => x.trip_id === t)) { setSelectedTripId(t); if (fromSession && typeof window !== 'undefined') window.sessionStorage.removeItem('tm-open-trip'); } }, [trips, searchParams]);
  useEffect(() => { if (plannerScrolledRef.current) return; const fromUrl = Boolean(searchParams.get('trip')); const fromSession = typeof window !== 'undefined' && window.sessionStorage.getItem('tm-scroll-planner') === '1'; if (!fromUrl && !fromSession) return; const el = document.getElementById('trip-planner'); if (!el) return; plannerScrolledRef.current = true; if (typeof window !== 'undefined') { window.sessionStorage.removeItem('tm-scroll-planner'); window.sessionStorage.removeItem('tm-open-trip'); } requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' })); }, [searchParams, trips, selectedTripId]);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || diagRef.current || !stopHasNoCatalogMatches) return;
    diagRef.current = true;
    console.group('[TravelMate] stop-matcher diagnostic');
    console.warn(`Stop(s) [${tripStops.map((s) => s.label).join(', ')}] matched 0 of ${explore.length} explore rows.`);
    console.table(explore.slice(0, 10).map((l) => ({ name: l.name, destination_name: l.destination?.destination_name ?? '(null)', region_country: l.destination?.region_country ?? '(null)', geo: geoOf(l).slice(0, 80) })));
    console.groupEnd();
  }, [stopHasNoCatalogMatches, tripStops, explore]);
  useEffect(() => () => { if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current); }, []);

  // ---- place card (CLICK TO MOVE) ----
  function PlaceCard({ it, date }: { it: TripItem; date: string }) {
    const si = bucketOf(it.start_time, 0);
    return (
      <div className={`group relative rounded-xl ${CARD} pl-4 pr-2 py-3 mb-2 last:mb-0 transition hover:-translate-y-0.5 hover:shadow-md`}>
        <span className={`absolute left-0 top-2.5 bottom-2.5 w-1.5 rounded-r-full bg-gradient-to-b ${SLOT_STRIPE[si]}`} />
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/listing/${it.listing_id}`} className="block font-bold text-slate-800 text-sm truncate hover:text-violet-700 transition">{it.name}</Link>
            <p className="text-[11px] font-medium text-slate-500 truncate">{SLOT_NAMES[si]}{it.rating != null ? ` · ★ ${Number(it.rating).toFixed(1)}` : ''}{it.destination_name ? ` · ${it.destination_name}` : ''}</p>
          </div>
          <select value={(it.start_time ?? '09:00:00').slice(0, 5)} onChange={(e) => changeItemTime(it.key, e.target.value)} aria-label={`Edit time for ${it.name}`} className={`shrink-0 w-[5.5rem] ${selectCls}`}>
            {!TIME_OPTIONS.includes((it.start_time ?? '09:00:00').slice(0, 5)) && (<option value={(it.start_time ?? '09:00:00').slice(0, 5)}>{fmtTime(it.start_time)}</option>)}
            {TIME_OPTIONS.map((opt) => (<option key={opt} value={opt}>{fmtTime(`${opt}:00`)}</option>))}
          </select>
          {/* MOVE BUTTON */}
          <button type="button" onClick={() => setScheduleModal({ itemKey: it.key })} title="Move to another day" className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition flex items-center justify-center">
            <RouteIcon className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => removeItem(it)} aria-label={`Remove ${it.name}`} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition flex items-center justify-center"><CloseIcon className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div id="trip-planner" className="space-y-6 scroll-mt-24 animate-fade-in pb-20">
      <style>{`
        @keyframes tmPopC { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .tm-pop-c { animation: tmPopC .45s cubic-bezier(.22,.9,.32,1) both; }
        @keyframes tmSheetC { from { transform: translateX(28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .tm-sheet-c { animation: tmSheetC .3s cubic-bezier(.22,.9,.32,1) both; }
      `}</style>

      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
            {(['active', 'upcoming', 'ongoing', 'finished'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setTripFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition active:scale-95 ${tripFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowTripModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95">
            <PlusIcon className="w-4 h-4" /> New trip
          </button>
        </div>

        {/* Trip switcher */}
        {trips.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[20rem] overflow-y-auto pr-1">
            {filteredTrips.length === 0 ? (<p className="col-span-full text-sm text-slate-500 px-2 py-3 font-medium">No {tripFilter} trips yet.</p>) : filteredTrips.map((t) => {
              const sel = selectedTrip?.trip_id === t.trip_id; const st = getTripStatus(t); const nr = tripNeedsReview(t); const info = tripReviewInfo(t);
              return (
                <button key={t.trip_id} type="button" onClick={() => setSelectedTripId(t.trip_id)} className={`text-left px-5 py-4 rounded-2xl border transition-all duration-200 ${sel ? 'bg-white border-violet-300 ring-2 ring-violet-100 shadow-md' : 'bg-white border-slate-200 hover:border-violet-200 hover:shadow-sm'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-bold truncate text-sm ${sel ? 'text-violet-900' : 'text-slate-800'}`}>{t.trip_name ?? `Trip ${t.trip_id}`}</p>
                    <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${st === 'ongoing' ? 'bg-emerald-500 animate-pulse' : st === 'finished' ? 'bg-slate-300' : 'bg-violet-500'}`} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 truncate">{fmtDate(t.start_date)} → {fmtDate(t.end_date)}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{t.items.filter((i) => i.listing_type !== 'Note').length} places · {Array.isArray(t.stops) ? t.stops.length : 0} stops</p>
                  {nr && <p className="mt-2 inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{info.total - info.reviewed} to review</p>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {userId && needsReviewCount > 0 && (
        <Link href="/my-trips" className="group flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100/80 transition">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Star className="w-5 h-5" />
          </div>
          <span className="flex-1 text-sm font-semibold text-amber-800">{needsReviewCount} finished trip{needsReviewCount === 1 ? '' : 's'} waiting for your review.</span>
          <span className="text-xs font-bold text-amber-700 whitespace-nowrap group-hover:translate-x-1 transition-transform">My trips →</span>
        </Link>
      )}

      {!userId ? (
        <div className="bg-white border border-slate-200 rounded-3xl px-8 py-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-6">
            <MapIcon className="w-8 h-8 text-violet-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">Your board, your trips</h3>
          <p className="text-base text-slate-500 max-w-md mx-auto mb-8">Create a free account to schedule places across days, auto-fill slots and keep every itinerary in one visual board.</p>
          <div className="flex justify-center gap-4">
            <Link href="/signup" className="rounded-xl bg-slate-900 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-slate-800">Create a free account</Link>
            <Link href="/login" className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50">Sign in</Link>
          </div>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl px-8 py-12 max-w-2xl mx-auto shadow-sm">
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600 mb-2">Boarding pass · blank</p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900">Where to next?</h3>
            <p className="text-slate-500 mt-2">Name it, date it, and the day grid + roadmap appear ready to fill.</p>
          </div>
          <form onSubmit={handleStartCreate} className="grid grid-cols-1 md:grid-cols-[1fr_160px_160px_auto] gap-3">
            <div><input value={startName} onChange={(e) => setStartName(e.target.value)} maxLength={100} placeholder="Trip name — e.g., Japan Spring Adventure" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none" /><p className="text-[10px] text-slate-400 mt-1 text-right font-medium">{startName.length}/100</p></div>
            <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" aria-label="Start date" />
            <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" aria-label="End date" />
            <button type="submit" disabled={startBusy} className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60 transition hover:bg-slate-800"><span className="relative">{startBusy ? 'Creating…' : 'Create trip'}</span></button>
          </form>
          {plannerErr && <p className="mt-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium">{plannerErr}</p>}
        </div>
      ) : selectedTrip ? (
        <>
          {/* Mission bar */}
<div className="sticky top-20 z-30 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl px-5 py-4 md:px-6 md:py-4 shadow-sm">
  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusPill(tripStatus!)}`}>{tripStatus}</span>
        {tripStatus === 'ongoing' && liveDayIndex && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
            Day {liveDayIndex}{tripDays ? `/${tripDays}` : ''}
          </span>
        )}
      </div>
      <h3 className="mt-1.5 text-xl font-bold text-slate-900 truncate leading-tight">{selectedTrip.trip_name ?? `Trip ${selectedTrip.trip_id}`}</h3>
    </div>

    <div className="hidden lg:flex items-center gap-5 shrink-0">
      <div className="w-36">
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${GRAD} transition-all duration-700`} style={{ width: `${Math.min(100, (plannedPlaceCount / capacity) * 100)}%` }} />
        </div>
        <p className="text-[10px] font-bold text-slate-500 mt-1.5 text-center tabular-nums">{plannedPlaceCount}/{capacity} scheduled</p>
      </div>
    </div>

    {/* BIGGER, MORE APPEALING ACTION BUTTONS */}
    <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 lg:border-l lg:pl-5">
      <button type="button" onClick={() => openPool('pool')} title="Browse & add places" className="inline-flex items-center gap-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 px-4 py-2.5 text-xs font-bold hover:bg-sky-100 transition active:scale-95 shadow-sm">
        <PlusIcon className="w-4 h-4" /> Places
      </button>
      <button type="button" onClick={autoFill} disabled={planning} title="Fill empty slots from the inbox" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-2.5 text-xs font-bold shadow-md hover:brightness-110 transition disabled:opacity-60 active:scale-95">
        <SparkleIcon className="w-4 h-4" /> {planning ? '…' : 'Auto-fill'}
      </button>

      <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block" />

      {/* Bigger Icon Buttons */}
      <button type="button" onClick={copyItinerary} title="Copy itinerary as text" className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition active:scale-95 border border-transparent hover:border-slate-200">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
  <rect x="9" y="9" width="13" height="13" rx="2" />
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
</svg>
      </button>
      <button type="button" onClick={() => setShowReplanConfirm(true)} disabled={planning} title="Wipe & rebuild the whole schedule" className="w-11 h-11 flex items-center justify-center rounded-xl text-amber-600 hover:bg-amber-50 transition active:scale-95 border border-transparent hover:border-amber-200">
        <RouteIcon className="w-5 h-5" />
      </button>
      <button type="button" onClick={() => openPool('route')} title="Route, stops & dates" className="w-11 h-11 flex items-center justify-center rounded-xl text-indigo-600 hover:bg-indigo-50 transition active:scale-95 border border-transparent hover:border-indigo-200">
        <MapIcon className="w-5 h-5" />
      </button>
      <button type="button" onClick={() => setShowEditTripModal(true)} title="Edit name & dates" className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition active:scale-95 border border-transparent hover:border-slate-200">
        <EditIcon className="w-5 h-5" />
      </button>
      <button type="button" onClick={() => setShowDeleteConfirm(selectedTrip.trip_id)} title="Delete trip" className="w-11 h-11 flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition active:scale-95 border border-transparent hover:border-rose-200">
        <TrashIcon className="w-5 h-5" />
      </button>
      {tripStatus === 'finished' && pendingReviewCount > 0 && (
        <button type="button" onClick={() => setShowReviewTripModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 px-4 py-2.5 text-xs font-bold hover:bg-amber-200 transition active:scale-95 shadow-sm">
          <Star className="w-4 h-4" /> Review {pendingReviewCount}
        </button>
      )}
    </div>
  </div>
  {plannerErr && <p className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2.5 text-xs font-medium flex items-start gap-2"><CloseIcon className="w-4 h-4 mt-0.5 shrink-0" /> {plannerErr}</p>}
</div>

          {/* Roadmap + Inbox + Day grid */}
          <div className={`space-y-6 transition-[padding] duration-300 ${sheetOpen ? 'lg:pr-[26rem]' : ''}`}>

            {/* ROADMAP */}
            {allDays.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Roadmap</p>
                  <p className="text-[10px] font-medium text-slate-400">{tripStops.length} stop{tripStops.length === 1 ? '' : 's'} · tap a day to jump</p>
                </div>
                <div className="flex items-start overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                  {allDays.map((date, di) => {
                    const stop = getStopForDate(date);
                    const sIdx = stopIdxFor(date);
                    const places = dayPlaces(date);
                    const isToday = date === todayISO;
                    const isFlash = flashDay === date;
                    const dObj = new Date(date + 'T00:00:00');
                    return (
                      <Fragment key={date}>
                        {di > 0 && <span className={`mt-[1.1rem] h-0.5 w-6 sm:w-10 shrink-0 rounded-full ${STOP_LINE[sIdx % STOP_LINE.length]}`} aria-hidden="true" />}
                        <button type="button" onClick={() => focusDay(date)} className="group shrink-0 flex flex-col items-center gap-1.5 w-[4rem] sm:w-[4.5rem]">
                          <span className={`relative w-10 h-10 rounded-full border-2 ${STOP_BORDER[sIdx % STOP_BORDER.length]} flex items-center justify-center text-xs font-bold transition ${places.length ? `${STOP_FILL[sIdx % STOP_FILL.length]} text-white shadow-md` : 'bg-white text-slate-500'} ${isToday ? 'ring-2 ring-emerald-400 ring-offset-2' : ''} ${isFlash ? 'scale-110 ring-2 ring-violet-500 ring-offset-2' : 'group-hover:scale-105 group-hover:border-slate-400'}`}>
                            {di + 1}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wide leading-none ${isToday ? 'text-emerald-600' : 'text-slate-400'}`}>{isToday ? 'Today' : dObj.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                          <span className="text-[11px] font-semibold text-slate-600 tabular-nums leading-none">{dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          <span className="flex gap-0.5 mt-1" aria-hidden="true">{[0, 1, 2].map((si) => (<span key={si} className={`w-1 h-3 rounded-full ${places.some((p) => bucketOf(p.start_time, si) === si) ? `bg-gradient-to-b ${SLOT_STRIPE[si]}` : 'bg-slate-200'}`} />))}</span>
                        </button>
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* INBOX (CLICK TO SCHEDULE) */}
            <div className={`rounded-2xl p-5 transition-all duration-200 bg-amber-50/50 border-2 border-dashed border-amber-200`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <MapIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Inbox · waiting to schedule</p>
                    <p className="text-[11px] font-medium text-amber-700/80">Click "Schedule" to assign a place to a specific day.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold tabular-nums">{unscheduledItems.length} waiting</span>
                  <button type="button" onClick={() => openPool('pool')} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold hover:bg-slate-800 transition active:scale-95">
                    <PlusIcon className="w-3.5 h-3.5" /> Browse places
                  </button>
                </div>
              </div>
              {unscheduledItems.length === 0 ? (
                <p className="text-sm font-medium text-amber-700/70 text-center py-8 bg-amber-100/50 rounded-xl border border-amber-200/50">Nothing waiting — every place is scheduled. Add more from Places.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {unscheduledItems.map((it) => (
                    <div key={it.key} className="group relative rounded-xl bg-white border border-slate-200 pl-4 pr-2 py-3 transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className="absolute left-0 top-2.5 bottom-2.5 w-1.5 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-400" />
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 min-w-0">
                          <Link href={`/listing/${it.listing_id}`} className="block font-bold text-slate-800 text-sm truncate hover:text-violet-700 transition">{it.name}</Link>
                          <p className="text-[11px] font-medium text-slate-500 truncate">{it.listing_type ?? 'Place'}{it.destination_name ? ` · ${it.destination_name}` : ''}</p>
                        </div>
                        {/* SCHEDULE BUTTON */}
                        <button type="button" onClick={() => setScheduleModal({ listingId: it.listing_id })} className="shrink-0 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1.5 text-[11px] font-semibold hover:bg-sky-100 transition active:scale-95">
                          Schedule
                        </button>
                        <button type="button" onClick={() => removeItem(it)} aria-label={`Remove ${it.name}`} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition flex items-center justify-center"><CloseIcon className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DAY GRID */}
            {allDays.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-10 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
                  <RouteIcon className="w-8 h-8 text-violet-600" />
                </div>
                <p className="font-bold text-slate-800 mt-2 mb-1 text-lg">No day grid yet</p>
                <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">Set the trip dates and every day becomes a card with Morning / Afternoon / Evening slots.</p>
                <button type="button" onClick={() => openPool('route')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"><span className="relative">Set dates & stops</span></button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {allDays.map((date, di) => {
                  const places = dayPlaces(date);
                  const notes = dayNotes(date);
                  const stop = getStopForDate(date);
                  const sIdx = stopIdxFor(date);
                  const isToday = date === todayISO;
                  const isFlash = flashDay === date;
                  const dObj = new Date(date + 'T00:00:00');
                  return (
                    <div key={date}
                      ref={(el) => { dayRefs.current[date] = el; }}
                      className={`relative rounded-2xl p-5 pl-6 transition tm-pop-c ${isToday ? 'bg-emerald-50/50 border border-emerald-200' : 'bg-white border border-slate-200 shadow-sm hover:shadow-md'} ${isFlash ? 'ring-2 ring-violet-500 scale-[1.02]' : ''}`}
                      style={{ animationDelay: `${Math.min(di, 12) * 45}ms` }}>
                      <span className={`absolute left-0 top-5 bottom-5 w-1.5 rounded-r-full ${STOP_FILL[sIdx % STOP_FILL.length]}`} aria-hidden="true" />
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${GRAD} text-white text-lg font-bold flex items-center justify-center shadow-sm`}>{di + 1}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-base leading-tight truncate">{dObj.toLocaleDateString(undefined, { weekday: 'long' })}{isToday && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Today</span>}</p>
                            <p className="text-sm font-medium text-slate-500 truncate tabular-nums">{dObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</p>
                            <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">{stop ? `📍 ${stop}` : 'No stop assigned'} · {places.length}/3 places</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => addNoteToDay(date)} title="Add note to this day" className="w-8 h-8 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition flex items-center justify-center"><PlusIcon className="w-4 h-4" /></button>
                          {places.length > 0 && (<button type="button" onClick={() => unscheduleDay(date)} title="Send this day's places back to inbox" className="w-8 h-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition flex items-center justify-center"><ChevronDown className="w-4 h-4" /></button>)}
                        </div>
                      </div>
                      <div className="min-h-[4rem] space-y-2">
                        {places.map((it) => (<PlaceCard key={it.key} it={it} date={date} />))}
                        {places.length === 0 && (
                          <div className="w-full rounded-xl border-2 border-dashed border-slate-200 px-3 py-6 text-sm font-semibold text-slate-400 flex items-center justify-center gap-1.5 bg-slate-50/50">
                            No places yet. Use the "Places" button above to add some!
                          </div>
                        )}
                      </div>
                      {notes.length > 0 && (
                        <div className="mt-4 space-y-2 pt-4 border-t border-slate-100">
                          {notes.map((n) => (
                            <div key={n.key} className="group flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                              <span className="text-xs mt-0.5">📝</span>
                              <p className="flex-1 text-xs text-slate-700 font-medium leading-snug">{n.notes}</p>
                              <button type="button" onClick={() => removeItem(n)} aria-label="Remove note" className="w-6 h-6 shrink-0 rounded text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-600 transition flex items-center justify-center"><CloseIcon className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Workspace: docked panel on desktop, scrim sheet on mobile */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 z-[64] bg-slate-900/20 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => { setSheetOpen(false); }} />
          <div className={`fixed right-0 top-0 bottom-0 z-[65] w-[94%] sm:w-[26rem] lg:w-[24rem] ${SHEET_SURF} tm-sheet-c flex flex-col`}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
                {(['pool', 'route'] as const).map((tb) => (
                  <button key={tb} type="button" onClick={() => setSheetTab(tb)} className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold tracking-wide transition active:scale-95 ${sheetTab === tb ? `bg-white text-slate-900 shadow-sm` : 'text-slate-500 hover:text-slate-700'}`}>{tb === 'pool' ? 'Places' : 'Route & dates'}</button>
                ))}
              </div>
              <button type="button" onClick={() => { setSheetOpen(false); }} className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex items-center justify-center" aria-label="Close"><CloseIcon className="w-5 h-5" /></button>
            </div>

            {sheetTab === 'pool' ? (
              <div className="flex-1 min-h-0 flex flex-col px-5 py-4">
                <input value={plannerQuery} onChange={(e) => setPlannerQuery(e.target.value)} maxLength={50} placeholder="Search any place — name, city, province…" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm mb-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none" />
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 -mr-1">
                  {stopHasNoCatalogMatches && addList.length > 0 && (<p className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">No catalog places match your stop yet — showing top picks instead.</p>)}
                  {allStopMatchesAdded && (<p className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">You’ve added every catalog place that matches {tripStops.map((s) => s.label).join(', ')}.</p>)}
                  {addList.length === 0 && !allStopMatchesAdded && (<EmptyBox icon={<MapIcon className="w-6 h-6" />} title="Nothing matches" sub="Try another keyword, or your catalog may not cover this stop." />)}
                  {addList.map((l) => (
                    <div key={l.listing_id} className="group flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2.5 transition hover:-translate-y-0.5 hover:shadow-md hover:border-violet-200">
                      {l.image_url ? (<img src={l.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 shadow-sm" />) : (<div className="w-11 h-11 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center text-slate-400 font-bold">{l.listing_type.charAt(0)}</div>)}
                      <div className="flex-1 min-w-0">
                        <Link href={`/listing/${l.listing_id}`} className="block font-bold text-slate-800 text-sm truncate hover:text-violet-700 transition">{l.name}</Link>
                        <p className="text-[10px] text-slate-500 truncate font-medium">{l.destination?.destination_name}{l.average_rating != null ? ` · ★ ${Number(l.average_rating).toFixed(1)}` : ''}</p>
                      </div>
                      {/* ADD BUTTON (Opens Day Selector) */}
                      <button type="button" disabled={addingId === l.listing_id}
                        onClick={() => setScheduleModal({ listingId: l.listing_id })}
                        className="shrink-0 rounded-lg bg-slate-900 text-white px-3 py-2 text-[11px] font-semibold disabled:opacity-60 transition hover:bg-slate-800 active:scale-95">
                        <span className="relative flex items-center gap-1"><PlusIcon className="w-3 h-3" /> Add</span>
                      </button>
                    </div>
                  ))}
                </div>
                <p className="pt-3 text-[10px] font-medium text-slate-400 text-center">Click "Add" to choose which day to schedule this place.</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Trip dates</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="date" value={selectedTrip?.start_date ?? ''} max={selectedTrip?.end_date || undefined} onChange={(e) => updateTripDates(e.target.value, selectedTrip?.end_date ?? '')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" aria-label="Start date" />
                    <span className="text-slate-400 font-bold">→</span>
                    <input type="date" value={selectedTrip?.end_date ?? ''} min={selectedTrip?.start_date || undefined} onChange={(e) => updateTripDates(selectedTrip?.start_date ?? '', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" aria-label="End date" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Destination stops</p>
                    <div className="flex gap-1.5">
                      {tripStops.length > 0 && tripDays && (<button type="button" onClick={autoAllocateDays} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition">Auto-allocate</button>)}
                      <button type="button" onClick={() => setDestPickerOpen(true)} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-slate-800 transition"><span className="relative flex items-center gap-1"><PlusIcon className="w-3 h-3" />Add</span></button>
                    </div>
                  </div>
                  {tripStops.length === 0 ? (<p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-5 text-center font-medium">No stops yet — add a province, city, or country.</p>) : (
                    <div className="space-y-2">
                      {tripStops.map((s, si) => (
                        <div key={s.label} className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                          <span className={`w-7 h-7 shrink-0 rounded-lg ${STOP_FILL[si % STOP_FILL.length]} text-white text-[10px] font-bold flex items-center justify-center`}>{si + 1}</span>
                          <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-sm truncate">{s.label}</p><p className="text-[10px] text-slate-500 font-medium truncate">{stopItemCount(s.label)} places here</p></div>
                          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                            <button type="button" onClick={() => setStopDays(s.label, Math.max(1, s.days - 1))} disabled={s.days <= 1} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-violet-600 disabled:opacity-30 transition" aria-label="Decrease days"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M5 12h14" strokeLinecap="round" /></svg></button>
                            <span className="w-7 text-center text-xs font-bold text-slate-700 tabular-nums">{s.days}</span>
                            <button type="button" onClick={() => setStopDays(s.label, Math.min(tripDays ?? 60, s.days + 1))} disabled={s.days >= (tripDays ?? 60)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-violet-600 disabled:opacity-30 transition" aria-label="Increase days"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg></button>
                          </div>
                          <button type="button" onClick={() => removeStop(s.label)} aria-label={`Remove ${s.label}`} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition flex items-center justify-center"><CloseIcon className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      {tripDays != null && totalAllocated !== tripDays && (<p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium">Allocated ({totalAllocated}) ≠ trip length ({tripDays}).</p>)}
                    </div>
                  )}
                </div>
                {plannedDates.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-center"><p className="text-lg font-bold text-slate-700">{plannedDates.length}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Days used</p></div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-center"><p className="text-lg font-bold text-slate-700">{unscheduledItems.length}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Waiting</p></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* NEW: CHOOSE A DAY MODAL */}
      {scheduleModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={() => setScheduleModal(null)}>
          <div className={`${MODAL_SURF} rounded-3xl p-6 max-w-md w-full tm-sheet-c max-h-[85vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Choose a day</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {scheduleModal.itemKey ? 'Move this place to:' : 'Schedule this place on:'}
                </p>
              </div>
              <button type="button" onClick={() => setScheduleModal(null)} className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex items-center justify-center"><CloseIcon className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
              {allDays.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Set trip dates to see available days.</p>
              ) : (
                allDays.map((date, i) => {
                  const stop = getStopForDate(date);
                  const places = dayPlaces(date);
                  const isFull = places.length >= 3;
                  const dObj = new Date(date + 'T00:00:00');
                  return (
                    <button 
                      key={date} 
                      disabled={isFull}
                      onClick={() => handleScheduleDay(date)} 
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition text-left ${isFull ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-violet-300 hover:shadow-md active:scale-[0.98]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${GRAD}`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{dObj.toLocaleDateString(undefined, { weekday: 'long' })}</p>
                          <p className="text-xs text-slate-500 font-medium">
                            {dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {stop && <span className="ml-1.5 text-violet-600">· {stop}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${isFull ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {isFull ? 'Full' : `${3 - places.length} slot${3 - places.length !== 1 ? 's' : ''} left`}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">{places.length}/3 places</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other Modals */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowNoteModal(null)}>
          <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full tm-sheet-c`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-bold text-slate-900">Add a note</h3><button type="button" onClick={() => setShowNoteModal(null)} className="text-slate-400 hover:text-slate-600 transition" aria-label="Close"><CloseIcon className="w-5 h-5" /></button></div>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={300} rows={3} autoFocus placeholder='e.g., "Withdraw cash before the next stop"' className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none resize-none" />
            <p className="text-xs text-slate-400 text-right mt-1 font-medium">{noteText.length}/300</p>
            <div className="flex gap-3 mt-5"><button type="button" onClick={() => setShowNoteModal(null)} className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button><button type="button" onClick={addNoteBetween} disabled={!noteText.trim()} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-60"><span className="relative">Add note</span></button></div>
          </div>
        </div>
      )}
      {destPickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={() => setDestPickerOpen(false)}>
          <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full tm-sheet-c`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-bold text-slate-900">Add destination stop</h3><button type="button" onClick={() => setDestPickerOpen(false)} className="text-slate-400 hover:text-slate-600 transition" aria-label="Close"><CloseIcon className="w-5 h-5" /></button></div>
            <input value={destSearch} onChange={(e) => setDestSearch(e.target.value)} maxLength={50} placeholder="Search province, city, or country…" autoFocus className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm mb-2 focus:ring-2 focus:ring-violet-500 outline-none" />
            <p className="text-xs text-slate-400 text-right mb-3 font-medium">{destSearch.length}/50</p>
            <p className="text-sm text-slate-600 mb-4">{destSearch.trim().length >= 2 ? (<><span className="font-bold text-violet-600">{previewCount}</span> place{previewCount === 1 ? '' : 's'} fall inside "{destSearch.trim()}"</>) : 'Type a province, city, or country — e.g., "La Union", "Kyoto".'}</p>
            {regionSuggestions.length > 0 && (<div className="flex flex-wrap gap-2 mb-5">{regionSuggestions.map((r) => (<button key={r} type="button" onClick={() => setDestSearch(r)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-600 transition active:scale-95">{r}</button>))}</div>)}
            <button type="button" disabled={destSearch.trim().length < 2} onClick={() => addStop(destSearch)} className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white disabled:opacity-60 transition hover:bg-slate-800"><span className="relative">Add stop "{destSearch.trim() || '…'}"</span></button>
          </div>
        </div>
      )}
      {showReplanConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowReplanConfirm(false)}>
          <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full tm-sheet-c`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-3">Re-plan the whole trip?</h3>
            <p className="text-sm text-slate-600 mb-6">This wipes every scheduled day and rebuilds the board from scratch. Hand-placed times and moves will be lost. (Auto-fill keeps what you arranged.)</p>
            <div className="flex gap-3"><button type="button" onClick={() => setShowReplanConfirm(false)} className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button><button type="button" onClick={replanAll} disabled={planning} className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 transition disabled:opacity-60">{planning ? 'Working…' : 'Re-plan all'}</button></div>
          </div>
        </div>
      )}
      {showTripModal && userId && (<NewTripModal userId={userId} onClose={() => setShowTripModal(false)} onCreated={async (id) => { setShowTripModal(false); await refreshTrips(); setSelectedTripId(id); }} />)}
      {showEditTripModal && selectedTrip && (<EditTripModal trip={selectedTrip} onClose={() => setShowEditTripModal(false)} onUpdated={async () => { setShowEditTripModal(false); await refreshTrips(); }} />)}
      {showReviewTripModal && selectedTrip && userId && (<ReviewTripModal trip={selectedTrip} userId={userId} onClose={() => setShowReviewTripModal(false)} onReviewed={onReviewed} />)}
      {pendingRemove && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={() => setPendingRemove(null)}>
          <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full tm-sheet-c`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <TrashIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0"><h3 className="text-lg font-bold text-slate-900">{pendingRemove.listing_type === 'Note' ? 'Delete this note?' : 'Remove this place?'}</h3><p className="text-sm text-slate-500 truncate">{pendingRemove.name}</p></div>
            </div>
            <p className="text-sm text-slate-600 mb-6">{pendingRemove.listing_type === 'Note' ? 'This note will be permanently removed from your itinerary.' : 'This place will be taken off your itinerary. You can add it back anytime.'}</p>
            <div className="flex gap-3"><button type="button" onClick={() => setPendingRemove(null)} className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button><button type="button" onClick={async () => { await performRemove(pendingRemove); }} className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white hover:bg-rose-700 transition">{pendingRemove.listing_type === 'Note' ? 'Delete note' : 'Remove'}</button></div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDeleteConfirm(null)}>
          <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full tm-sheet-c`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-3">Delete this trip?</h3>
            <p className="text-sm text-slate-600 mb-6">This permanently deletes the trip and all its places. Cannot be undone.</p>
            <div className="flex gap-3"><button type="button" onClick={() => setShowDeleteConfirm(null)} className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button><button type="button" onClick={() => deleteTrip(showDeleteConfirm)} className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white hover:bg-rose-700 transition">Delete trip</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── planner-only modals ── */
function NewTripModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: (id: string) => void }) {
  const supabase = createClient();
  const [name, setName] = useState(''); const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function create() { setErr(null); setBusy(true); try { if (!name.trim()) throw new Error('Give your trip a name.'); if (start && end && end < start) throw new Error('End date must be after the start date.'); const { data: tripId, error: idErr } = await supabase.rpc('new_trip_id'); if (idErr) throw idErr; const { error } = await supabase.from('trips').insert({ trip_id: tripId as string, user_id: userId, trip_name: name.trim(), start_date: start || null, end_date: end || null }); if (error) throw error; onCreated(tripId as string); } catch (e: any) { setErr(e?.message ?? 'Could not create the trip.'); setBusy(false); } }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full tm-sheet-c`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-bold text-slate-900">Plan a new trip</h3><button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition"><CloseIcon className="w-5 h-5" /></button></div>
        {err && <p className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium mb-4">{err}</p>}
        <div className="space-y-4">
          <div><div className="flex items-baseline justify-between mb-1.5"><label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Trip name</label><span className="text-[11px] text-slate-400 font-medium">{name.length}/100</span></div><input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g., Japan Spring Adventure" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">Start</label><input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" /></div><div><label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">End</label><input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" /></div></div>
        </div>
        <div className="flex gap-3 mt-6"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button><button type="button" onClick={create} disabled={busy} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-60"><span className="relative">{busy ? 'Creating…' : 'Create trip'}</span></button></div>
      </div>
    </div>
  );
}
function EditTripModal({ trip, onClose, onUpdated }: { trip: TripData; onClose: () => void; onUpdated: () => void }) {
  const supabase = createClient();
  const [name, setName] = useState(trip.trip_name ?? ''); const [start, setStart] = useState(trip.start_date ?? ''); const [end, setEnd] = useState(trip.end_date ?? ''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function update() { setErr(null); setBusy(true); try { if (!name.trim()) throw new Error('Give your trip a name.'); if (start && end && end < start) throw new Error('End date must be after the start date.'); const { error } = await supabase.from('trips').update({ trip_name: name.trim(), start_date: start || null, end_date: end || null }).eq('trip_id', trip.trip_id); if (error) throw error; onUpdated(); } catch (e: any) { setErr(e?.message ?? 'Could not update the trip.'); setBusy(false); } }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full tm-sheet-c`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-bold text-slate-900">Edit trip</h3><button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition"><CloseIcon className="w-5 h-5" /></button></div>
        {err && <p className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium mb-4">{err}</p>}
        <div className="space-y-4">
          <div><div className="flex items-baseline justify-between mb-1.5"><label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Trip name</label><span className="text-[11px] text-slate-400 font-medium">{name.length}/100</span></div><input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">Start</label><input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" /></div><div><label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">End</label><input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" /></div></div>
        </div>
        <div className="flex gap-3 mt-6"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button><button type="button" onClick={update} disabled={busy} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-60"><span className="relative">{busy ? 'Updating…' : 'Update trip'}</span></button></div>
      </div>
    </div>
  );
}
function ReviewTripModal({ trip, userId, onClose, onReviewed }: { trip: TripData; userId: string; onClose: () => void; onReviewed?: (listingId: string) => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-lg w-full tm-sheet-c max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5"><div><h3 className="text-lg font-bold text-slate-900">Review your trip</h3><p className="text-xs text-slate-500 mt-0.5 font-medium">{trip.trip_name ?? 'This trip'} · {fmtDate(trip.end_date)}</p></div><button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition"><CloseIcon className="w-5 h-5" /></button></div>
        <div className="text-center py-8">
          <p className="text-sm text-slate-600">Your existing review logic goes here, styled with the new clean aesthetic.</p>
          <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Close</button>
        </div>
      </div>
    </div>
  );
}