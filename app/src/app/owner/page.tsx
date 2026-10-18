// app/src/app/owner/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useRole } from '@/utils/supabase/role';
import { getMyListingSaves, listTripSignalsForOwner, type TripSavedSignal } from '@/utils/supabase/tripSignals';

type ListingRow = {
  listing_id: string;
  name: string;
  listing_type: string;
  destination_id: string;
  description: string | null;
  address: string | null;
  image_url: string | null;
  average_rating: number | null;
};

type DestRow = { destination_id: string; destination_name: string; region_country: string };

/* ───────────────  Neumorphic + Glass design tokens (shared with Business Hub / Search)  ─────────────── */
const CANVAS = 'min-h-screen bg-[#e8ecf8] relative overflow-hidden';
const NEU = 'bg-[#edf0fa] shadow-[10px_10px_24px_rgba(163,170,205,0.42),-10px_-10px_24px_rgba(255,255,255,0.95)]';
const NEU_SM = 'bg-[#edf0fa] shadow-[6px_6px_14px_rgba(163,170,205,0.38),-6px_-6px_14px_rgba(255,255,255,0.9)]';
const NEU_HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:shadow-[14px_14px_32px_rgba(163,170,205,0.5),-14px_-14px_32px_rgba(255,255,255,1)]';
const INSET = 'bg-[#e4e8f4] shadow-[inset_5px_5px_11px_rgba(163,170,205,0.38),inset_-5px_-5px_11px_rgba(255,255,255,0.85)]';
const GLASS = 'bg-white/55 backdrop-blur-xl border border-white/70 shadow-[0_10px_34px_rgba(110,120,190,0.2)]';
const GLASS_SM = 'bg-white/45 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(110,120,190,0.18),inset_0_1px_0_rgba(255,255,255,0.65)]';
const SHEEN = 'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:via-white/5 before:to-transparent';
const GRAD = 'from-indigo-500 via-violet-500 to-fuchsia-500';
const GRAD_TEXT = 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent';
const BTN_VIOLET = `relative overflow-hidden bg-gradient-to-r ${GRAD} text-white shadow-[0_12px_30px_-8px_rgba(124,58,237,0.7),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition ${SHEEN}`;

const PREFIX: Record<string, { p: string; pad: number }> = {
  Attraction: { p: 'ATTR-', pad: 3 },
  Hotel: { p: 'HTL0', pad: 2 },
  Restaurant: { p: 'RES0', pad: 2 },
};

function nextId(existing: string[], prefix: string, pad: number) {
  const nums = existing
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return prefix + String(next).padStart(pad, '0');
}

// Safety net: if nextId ever returns the same id that just collided, step +1
function bumpId(id: string, prefix: string, pad: number) {
  const n = parseInt(id.slice(prefix.length), 10) || 0;
  return prefix + String(n + 1).padStart(pad, '0');
}

const EMPTY = {
  listing_id: '',
  destination_id: '',
  listing_type: 'Attraction',
  name: '',
  description: '',
  address: '',
  activity_name: '',
  coordinates: '',
  star_rating: '',
  cuisine_type: '',
};

// Neumorphic inset field + uppercase micro-label
const inputCls =
  'w-full px-4 py-3 rounded-2xl bg-[#e4e8f4] shadow-[inset_4px_4px_9px_rgba(163,170,205,0.4),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] border border-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-400/60 transition';
const labelCls = 'block text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5';

function GlassWellIcon({ gradient, children, size = 'md' }: { gradient: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  return (
    <div
      className={`relative overflow-hidden ${size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-12 h-12 rounded-2xl'} bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_-8px_rgba(80,90,180,0.65),inset_0_1px_0_rgba(255,255,255,0.55)]`}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent" />
      <span className="relative flex items-center justify-center">{children}</span>
    </div>
  );
}

function AccentBar() {
  return <div className={`mt-2.5 h-1.5 w-20 rounded-full bg-gradient-to-r ${GRAD} shadow-[0_0_14px_rgba(139,92,246,0.65)]`} />;
}

function StatTile({ label, value, icon, gradient, badge }: { label: string; value: string; icon: React.ReactNode; gradient: string; badge?: React.ReactNode }) {
  return (
    <div className={`${NEU} ${NEU_HOVER} rounded-3xl p-6`}>
      <div className="flex items-start justify-between mb-4">
        <GlassWellIcon gradient={gradient}>{icon}</GlassWellIcon>
        {badge}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-800">{value}</p>
    </div>
  );
}

function Store({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}>
      <path d="M4 10v10h16V10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 6l1.5-3h15L21 6c0 1.7-1.3 3-3 3s-3-1.3-3-3c0 1.7-1.3 3-3 3S9 7.7 9 6c0 1.7-1.3 3-3 3S3 7.7 3 6z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// relative time helper for the demand-signal feed ("2h ago")
function timeAgo(d: Date): string {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Star({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={className ?? 'w-4 h-4'}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}>
      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}>
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function OwnerPage() {
  const supabase = createClient();
  const role = useRole();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [destinations, setDestinations] = useState<DestRow[]>([]);
  const [destNames, setDestNames] = useState<Record<string, string>>({});
  // GLOBAL pool of every listing_id in the table — used for collision-free ID generation
  const [allListingIds, setAllListingIds] = useState<string[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [destForm, setDestForm] = useState({ name: '', region: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ totalListings: 0, avgRating: 0, totalReviews: 0, pendingBookings: 0 });
  // Demand signals: anonymous "travelers saved your place to their trips" analytics
  const [saves, setSaves] = useState<{ totalSaves: number; perListing: { listing_id: string; name: string; saves: number; lastSaved: string | null }[] }>({ totalSaves: 0, perListing: [] });
  const [signals, setSignals] = useState<TripSavedSignal[]>([]);

  useEffect(() => {
    if (!role.loading && role.isOwner) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.loading, role.isOwner]);

  async function fetchAllListingIds(): Promise<string[]> {
    const { data } = await supabase.from('listings').select('listing_id');
    return (data ?? []).map((r: any) => r.listing_id as string);
  }

  async function load() {
    const [{ data: mine }, { data: dests }, { data: allIds }] = await Promise.all([
      supabase.from('listings').select('*').eq('uploaded_by', role.userId).order('listing_id'),
      supabase.from('destinations').select('*'),
      supabase.from('listings').select('listing_id'),
    ]);
    const mineRows = (mine ?? []) as ListingRow[];
    setListings(mineRows);
    setDestinations(dests ?? []);
    setAllListingIds((allIds ?? []).map((r: any) => r.listing_id as string));
    const map: Record<string, string> = {};
    (dests ?? []).forEach((d: any) => { map[d.destination_id] = `${d.destination_name} — ${d.region_country}`; });
    setDestNames(map);

    // Stats
    const ids = mineRows.map((l) => l.listing_id);
    const rated = mineRows.map((l) => l.average_rating).filter((v): v is number => v != null);
    const avgRating = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
    let totalReviews = 0;
    let pendingBookings = 0;
    if (ids.length) {
      const [{ count: revCount }, { count: bkCount }] = await Promise.all([
        supabase.from('reviews').select('review_id', { count: 'exact', head: true }).in('listing_id', ids),
        supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).in('listing_id', ids).eq('status', 'pending'),
      ]);
      totalReviews = revCount ?? 0;
      pendingBookings = bkCount ?? 0;
    }
    setStats({ totalListings: mineRows.length, avgRating, totalReviews, pendingBookings });

    // Demand signals (best-effort — never blocks the dashboard)
    if (role.userId) {
      try {
        const [sv, sg] = await Promise.all([getMyListingSaves(role.userId), listTripSignalsForOwner(role.userId)]);
        setSaves(sv); setSignals(sg);
      } catch {}
    }
  }

  async function reloadDestinations() {
    const { data: dests } = await supabase.from('destinations').select('*');
    setDestinations(dests ?? []);
    const map: Record<string, string> = {};
    (dests ?? []).forEach((d: any) => { map[d.destination_id] = `${d.destination_name} — ${d.region_country}`; });
    setDestNames(map);
  }

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [f]: e.target.value });

  async function writeSubtype(id: string, type: string, isUpdate: boolean, destId: string) {
    if (type === 'Attraction') {
      const row = { attraction_id: id, destination_id: destId, activity_name: form.activity_name || form.name, coordinates: form.coordinates || null };
      const { error } = isUpdate
        ? await supabase.from('attractions').update(row).eq('attraction_id', id)
        : await supabase.from('attractions').insert(row);
      if (error) throw error;
    }
    if (type === 'Hotel') {
      const row = { hotel_id: id, destination_id: destId, hotel_name: form.name, star_rating: form.star_rating || null, address: form.address || null };
      const { error } = isUpdate
        ? await supabase.from('hotels').update(row).eq('hotel_id', id)
        : await supabase.from('hotels').insert(row);
      if (error) throw error;
    }
    if (type === 'Restaurant') {
      const row = { restaurant_id: id, destination_id: destId, restaurant_name: form.name, cuisine_type: form.cuisine_type || null, address: form.address || null };
      const { error } = isUpdate
        ? await supabase.from('restaurants').update(row).eq('restaurant_id', id)
        : await supabase.from('restaurants').insert(row);
      if (error) throw error;
    }
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      if (!form.name.trim()) throw new Error('Listing name is required.');

      let destId = form.destination_id;
      if (!editing && mode === 'new') {
        if (!destForm.name.trim() || !destForm.region.trim()) {
          throw new Error('New place needs both a destination name and a region/country.');
        }
        destId = nextId(destinations.map((d) => d.destination_id), 'DEST-', 3);
        const { error: dErr } = await supabase.from('destinations').insert({
          destination_id: destId,
          destination_name: destForm.name.trim(),
          region_country: destForm.region.trim(),
        });
        if (dErr) throw dErr;
        await reloadDestinations();
      }
      if (!destId) throw new Error('Select a destination for this listing (BR-012).');

      const { p, pad } = PREFIX[form.listing_type];

      if (editing) {
        const listingId = form.listing_id;
        const { error } = await supabase.from('listings').update({
          name: form.name,
          description: form.description || null,
          address: form.address || null,
          destination_id: destId,
        }).eq('listing_id', listingId);
        if (error) throw error;
        await writeSubtype(listingId, form.listing_type, true, destId);
        setMsg(`Listing ${listingId} updated.`);
      } else {
        // ID from the GLOBAL pool (not just my listings) + retry on collision,
        // so "duplicate key ... listings_pkey" can never block a publish again.
        let pool = allListingIds.length ? allListingIds : await fetchAllListingIds();
        let listingId = nextId(pool, p, pad);
        let inserted = false;
        let lastErr: any = null;

        for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
          const { error } = await supabase.from('listings').insert({
            listing_id: listingId,
            destination_id: destId,
            listing_type: form.listing_type,
            name: form.name,
            description: form.description || null,
            address: form.address || null,
            average_rating: null,
            date_added: new Date().toISOString().slice(0, 10),
            uploaded_by: role.userId, // BR-026 ownership stamp
          });
          if (!error) { inserted = true; break; }
          lastErr = error;
          if (error.code === '23505') {
            pool = await fetchAllListingIds();
            const regen = nextId(pool, p, pad);
            listingId = regen !== listingId ? regen : bumpId(listingId, p, pad);
            continue;
          }
          throw error;
        }
        if (!inserted) throw lastErr ?? new Error('Publish failed.');

        await writeSubtype(listingId, form.listing_type, false, destId);

        if (photo) {
          const path = `listings/${listingId}/${Date.now()}-${photo.name}`;
          const { error: upErr } = await supabase.storage.from('Media').upload(path, photo);
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from('Media').getPublicUrl(path);
          await supabase.from('listings').update({ image_url: pub.publicUrl }).eq('listing_id', listingId);
          const { data: photoRows } = await supabase.from('photos').select('photo_id');
          const photoId = nextId((photoRows ?? []).map((r: any) => r.photo_id), 'PHT-', 3);
          await supabase.from('photos').insert({
            photo_id: photoId,
            listing_id: listingId,
            uploaded_by: role.userId,
            photo_url: pub.publicUrl,
            caption: form.name,
            upload_date: new Date().toISOString().slice(0, 10),
          });
        }

        setMsg(
          mode === 'new'
            ? `New place ${destId} created and listing ${listingId} published — live in search.`
            : `Listing ${listingId} published — live in search.`
        );
      }

      setForm(EMPTY); setPhoto(null); setEditing(false);
      setDestForm({ name: '', region: '' }); setMode('new');
      await load();
    } catch (e2: any) {
      setErr(e2?.message ?? 'Publish failed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(`Delete listing ${id}? This cannot be undone.`)) return;
    setErr(null); setMsg(null);
    await supabase.from('photos').delete().eq('listing_id', id);
    const row = listings.find((l) => l.listing_id === id);
    if (row?.listing_type === 'Attraction') await supabase.from('attractions').delete().eq('attraction_id', id);
    if (row?.listing_type === 'Hotel') await supabase.from('hotels').delete().eq('hotel_id', id);
    if (row?.listing_type === 'Restaurant') await supabase.from('restaurants').delete().eq('restaurant_id', id);
    const { error } = await supabase.from('listings').delete().eq('listing_id', id);
    if (error) {
      setErr(`Delete blocked: reviews still reference ${id} (referential integrity).`);
      await load();
      return;
    }
    setMsg(`Listing ${id} deleted.`);
    await load();
  }

  function startEdit(l: ListingRow) {
    setEditing(true); setMode('existing'); setPhoto(null);
    setForm({
      ...EMPTY,
      listing_id: l.listing_id,
      destination_id: l.destination_id,
      listing_type: l.listing_type,
      name: l.name,
      description: l.description ?? '',
      address: l.address ?? '',
    });
    setErr(null); setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (role.loading) {
    return (
      <main className={`${CANVAS} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto rounded-full ${INSET} flex items-center justify-center`}>
            <div className="w-9 h-9 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          </div>
          <p className="mt-5 text-sm font-medium text-slate-400">Checking role…</p>
        </div>
      </main>
    );
  }

  if (!role.authId) {
    return (
      <main className={`${CANVAS} flex items-center justify-center p-8`}>
        <div className={`${NEU} rounded-3xl p-10 max-w-md text-center`}>
          <GlassWellIcon gradient={GRAD} size="lg"><Store className="w-7 h-7" /></GlassWellIcon>
          <h1 className="text-2xl font-black text-slate-800 mt-5 mb-2">Publishers only</h1>
          <p className="text-slate-500 text-sm">
            <Link href="/login" className="text-violet-600 font-semibold underline hover:text-violet-700">Sign in</Link> to manage your listings.
          </p>
        </div>
      </main>
    );
  }

  if (!role.isOwner) {
    return (
      <main className={`${CANVAS} flex items-center justify-center p-8`}>
        <div className={`${NEU} rounded-3xl p-10 max-w-md text-center`}>
          <div className={`w-16 h-16 mx-auto rounded-3xl ${INSET} text-amber-400 flex items-center justify-center mb-5`}>
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Not a publisher yet</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {role.application?.status === 'pending'
              ? `Your application ${role.application.application_id} is still under review.`
              : 'Apply to become an approved business owner to publish your own listings.'}
          </p>
          <Link href="/apply" className={`${BTN_VIOLET} inline-block px-6 py-3 rounded-full text-sm font-bold`}>
            <span className="relative">Go to application</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={CANVAS}>
      {/* Ambient gradient orbs (glass refraction) */}
      <div className="pointer-events-none fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/30 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full bg-fuchsia-300/20 blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-9 animate-fade-in-up">
          <div>
            <p className={`text-[11px] font-black uppercase tracking-[0.25em] ${GRAD_TEXT} mb-2`}>Publisher console</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-800">My Listings</h1>
            <AccentBar />
            <p className="mt-3 text-sm text-slate-500">
              {role.ownerId} · BR-026 scoped to your own listings
            </p>
          </div>
          <Link href="/business" className={`${GLASS_SM} px-5 py-2.5 rounded-full text-sm font-bold text-violet-600 hover:bg-white/70 transition btn-press active:scale-95 whitespace-nowrap`}>
            ← Business hub
          </Link>
        </div>

        {/* Alerts */}
        {msg && (
          <div className="mb-6 p-4 rounded-2xl backdrop-blur-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/90 to-teal-50/80 shadow-[0_8px_24px_-10px_rgba(16,185,129,0.4)] animate-fade-in flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)] shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">{msg}</p>
          </div>
        )}
        {err && (
          <div className="mb-6 p-4 rounded-2xl backdrop-blur-xl border border-rose-200/70 bg-gradient-to-r from-rose-50/90 to-red-50/80 shadow-[0_8px_24px_-10px_rgba(244,63,94,0.4)] animate-fade-in flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)] shrink-0" />
            <p className="text-sm font-semibold text-rose-800">{err}</p>
          </div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-10">
          <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            <StatTile
              label="Total listings"
              value={String(stats.totalListings)}
              gradient="from-indigo-500 to-violet-500"
              icon={<Store className="w-6 h-6" />}
              badge={<span className="px-2.5 py-1 rounded-full bg-emerald-50/80 backdrop-blur-md border border-emerald-200/80 text-emerald-600 text-[10px] font-black">ACTIVE</span>}
            />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <StatTile
              label="Average rating"
              value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
              gradient="from-amber-400 to-orange-500"
              icon={<Star className="w-6 h-6" filled />}
              badge={stats.avgRating >= 4 ? <span className="px-2.5 py-1 rounded-full bg-emerald-50/80 backdrop-blur-md border border-emerald-200/80 text-emerald-600 text-[10px] font-black">EXCELLENT</span> : undefined}
            />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '180ms' }}>
            <StatTile
              label="Total reviews"
              value={String(stats.totalReviews)}
              gradient="from-emerald-400 to-teal-500"
              icon={<MessageIcon className="w-6 h-6" />}
            />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '210ms' }}>
            <StatTile
              label="Trip saves"
              value={String(saves.totalSaves)}
              gradient="from-fuchsia-500 to-pink-500"
              icon={<BookmarkIcon className="w-6 h-6" />}
              badge={saves.totalSaves > 0 ? <span className="px-2.5 py-1 rounded-full bg-violet-50/80 backdrop-blur-md border border-violet-200/80 text-violet-600 text-[10px] font-black">DEMAND</span> : undefined}
            />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
            <StatTile
              label="Pending bookings"
              value={String(stats.pendingBookings)}
              gradient="from-sky-400 to-indigo-500"
              icon={<CalendarIcon className="w-6 h-6" />}
              badge={stats.pendingBookings > 0 ? <span className="px-2.5 py-1 rounded-full bg-amber-50/80 backdrop-blur-md border border-amber-200/80 text-amber-600 text-[10px] font-black">ACTION</span> : undefined}
            />
          </div>
        </div>

        {/* Demand signals — anonymous "saved to a trip" activity (traveler identity is never exposed) */}
        {signals.length > 0 && (
          <section className={`${GLASS} rounded-3xl p-6 mb-10 animate-fade-in-up`} style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-black text-slate-800">Travelers planning trips with your places</h2>
              <Link href="/notifications" className="text-xs font-bold text-violet-600 hover:text-violet-800 transition">View alerts →</Link>
            </div>
            <p className="text-sm text-slate-500 mb-4">Anonymous demand signals — we never reveal who saved what, only that travelers are adding your listings to their itineraries.</p>
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
              {signals.map((s) => {
                const listingName = saves.perListing.find((p) => p.listing_id === s.listing_id)?.name ?? s.listing_id;
                const when = s.created_at ? new Date(s.created_at) : null;
                return (
                  <li key={s.trip_item_id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/70 shadow-[0_4px_14px_rgba(110,120,190,0.12)]">
                    <GlassWellIcon gradient="from-fuchsia-400 to-pink-500"><BookmarkIcon className="w-4 h-4" /></GlassWellIcon>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-700 truncate">
                        <Link href={`/listing/${s.listing_id}`} className="hover:text-violet-600 transition">{listingName}</Link>
                        <span className="font-semibold text-slate-400"> was added to a traveler&apos;s trip</span>
                      </p>
                      <p className="text-xs text-slate-400 font-medium truncate">
                        Itinerary stop{s.planned_date ? ` · planned ${new Date(s.planned_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}{s.start_time ? ` at ${s.start_time.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    {when && <span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-slate-400">{timeAgo(when)}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Main grid: glass form (left, sticky) + listings (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT — publish/edit form (frosted glass panel) */}
          <section className={`${GLASS} rounded-3xl p-6 lg:sticky lg:top-6 animate-fade-in-up`} style={{ animationDelay: '120ms' }}>
            <h2 className="text-xl font-black text-slate-800 mb-1">
              {editing ? `Edit ${form.listing_id}` : 'Publish a listing'}
            </h2>
            <AccentBar />

            {/* Segmented mode toggle (inset track + raised white active) */}
            <div className={`flex items-center gap-1 p-1.5 rounded-2xl ${INSET} mt-5 mb-6`}>
              <button
                type="button"
                disabled={editing}
                onClick={() => { setMode('new'); setForm({ ...form, destination_id: '' }); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 btn-press active:scale-95 ${
                  mode === 'new' && !editing
                    ? 'bg-white/85 backdrop-blur-md text-violet-600 shadow-[0_4px_12px_rgba(120,130,200,0.35),inset_0_1px_0_rgba(255,255,255,0.8)]'
                    : 'text-slate-500 hover:text-violet-600'
                } ${editing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                + New place
              </button>
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 btn-press active:scale-95 ${
                  mode === 'existing'
                    ? 'bg-white/85 backdrop-blur-md text-violet-600 shadow-[0_4px_12px_rgba(120,130,200,0.35),inset_0_1px_0_rgba(255,255,255,0.8)]'
                    : 'text-slate-500 hover:text-violet-600'
                }`}
              >
                Existing place
              </button>
            </div>

            <form onSubmit={publish} className="space-y-4">
              {!editing && mode === 'new' && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-violet-50/60 ring-1 ring-violet-100 backdrop-blur space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-violet-600">New destination</p>
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <p className={labelCls}>Name</p>
                      <span className="text-[11px] font-semibold text-slate-400">{destForm.name.length}/100</span>
                    </div>
                    <input
                      value={destForm.name}
                      onChange={(e) => setDestForm({ ...destForm, name: e.target.value })}
                      maxLength={100}
                      placeholder="Destination name (e.g. Vigan)"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <p className={labelCls}>Region / Country</p>
                      <span className="text-[11px] font-semibold text-slate-400">{destForm.region.length}/100</span>
                    </div>
                    <input
                      value={destForm.region}
                      onChange={(e) => setDestForm({ ...destForm, region: e.target.value })}
                      maxLength={100}
                      placeholder="Ilocos Sur (Philippines)"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {mode === 'existing' && (
                <div>
                  <p className={labelCls}>Destination (BR-012)</p>
                  <div className={`space-y-1 max-h-52 overflow-y-auto rounded-2xl ${INSET} p-2 scrollbar-hide`}>
                    {destinations.map((d) => {
                      const sel = form.destination_id === d.destination_id;
                      return (
                        <label
                          key={d.destination_id}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold transition-all duration-200 ${
                            sel
                              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_8px_18px_-6px_rgba(124,58,237,0.7)]'
                              : 'text-slate-600 hover:bg-white/70'
                          }`}
                        >
                          <input
                            type="radio"
                            name="owner-destination"
                            checked={sel}
                            onChange={() => setForm({ ...form, destination_id: d.destination_id })}
                            className={sel ? 'accent-white' : 'accent-violet-600'}
                          />
                          <span className="truncate">{d.destination_name} — {d.region_country}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className={labelCls}>Listing type</p>
                <select value={form.listing_type} onChange={set('listing_type')} className={inputCls} disabled={editing}>
                  <option value="Attraction">Attraction</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Restaurant">Restaurant</option>
                </select>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <p className={labelCls}>Listing name</p>
                  <span className="text-[11px] font-semibold text-slate-400">{form.name.length}/50</span>
                </div>
                <input value={form.name} onChange={set('name')} maxLength={50} placeholder="e.g. Harbor View Inn" className={inputCls} required />
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <p className={labelCls}>Description</p>
                  <span className="text-[11px] font-semibold text-slate-400">{form.description.length}/300</span>
                </div>
                <textarea value={form.description} onChange={set('description')} rows={3} maxLength={300} placeholder="What makes this place worth visiting?" className={`${inputCls} resize-none`} />
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <p className={labelCls}>Address</p>
                  <span className="text-[11px] font-semibold text-slate-400">{form.address.length}/150</span>
                </div>
                <input value={form.address} onChange={set('address')} maxLength={150} placeholder="Street, city" className={inputCls} />
              </div>

              {form.listing_type === 'Attraction' && (
                <>
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <p className={labelCls}>Activity name</p>
                      <span className="text-[11px] font-semibold text-slate-400">{form.activity_name.length}/100</span>
                    </div>
                    <input value={form.activity_name} onChange={set('activity_name')} maxLength={100} placeholder="e.g. Heritage walk" className={inputCls} />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <p className={labelCls}>Coordinates</p>
                      <span className="text-[11px] font-semibold text-slate-400">{form.coordinates.length}/50</span>
                    </div>
                    <input value={form.coordinates} onChange={set('coordinates')} maxLength={50} placeholder="e.g. 17.57N, 120.38E" className={inputCls} />
                  </div>
                </>
              )}

              {form.listing_type === 'Hotel' && (
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <p className={labelCls}>Star rating</p>
                    <span className="text-[11px] font-semibold text-slate-400">{form.star_rating.length}/20</span>
                  </div>
                  <input value={form.star_rating} onChange={set('star_rating')} maxLength={20} placeholder="e.g. 4-Star" className={inputCls} />
                </div>
              )}

              {form.listing_type === 'Restaurant' && (
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <p className={labelCls}>Cuisine type</p>
                    <span className="text-[11px] font-semibold text-slate-400">{form.cuisine_type.length}/50</span>
                  </div>
                  <input value={form.cuisine_type} onChange={set('cuisine_type')} maxLength={50} placeholder="e.g. Ilocano" className={inputCls} />
                </div>
              )}

              {!editing && (
                <div>
                  <p className={labelCls}>Cover photo</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-500 file:mr-3 file:px-4 file:py-2.5 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-indigo-500 file:to-violet-500 file:text-white file:font-bold file:cursor-pointer file:shadow-[0_8px_18px_-6px_rgba(124,58,237,0.7)] file:hover:brightness-110 file:transition"
                  />
                  {photo && <p className="mt-1.5 text-[11px] font-semibold text-violet-600 truncate">📷 {photo.name}</p>}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className={`${BTN_VIOLET} flex-1 py-3.5 rounded-2xl font-bold btn-press disabled:opacity-60`}
                >
                  <span className="relative">{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}</span>
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setForm(EMPTY); setMode('new'); }}
                    className="px-5 py-3.5 rounded-2xl bg-white/60 backdrop-blur-md border border-slate-200/70 text-sm font-bold text-slate-600 hover:bg-white/80 hover:text-slate-800 transition btn-press active:scale-95"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* RIGHT — listings */}
          <section className="lg:col-span-2">
            <div className="flex items-end justify-between mb-5">
              <h2 className="text-xl font-black text-slate-800">
                My listings
                <span className="ml-2 text-sm font-bold text-slate-400">({listings.length})</span>
              </h2>
            </div>

            {listings.length === 0 ? (
              <div className={`${NEU} rounded-3xl p-12 text-center`}>
                <div className={`w-16 h-16 mx-auto rounded-3xl ${INSET} text-violet-300 flex items-center justify-center mb-4`}>
                  <Store className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">No listings yet</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Publish your first place using the form on the left. It will appear here and become visible to travelers on search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {listings.map((l, i) => {
                  const rating = l.average_rating != null ? Number(l.average_rating) : null;
                  return (
                    <div
                      key={l.listing_id}
                      className={`${NEU} ${NEU_HOVER} rounded-3xl overflow-hidden animate-fade-in-up`}
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <div className="relative h-44 bg-[#dfe4f2]">
                        {l.image_url ? (
                          <img src={l.image_url} alt={l.name} className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-44 bg-gradient-to-br from-indigo-100 via-violet-100 to-fuchsia-100 flex items-center justify-center">
                            <span className="text-5xl font-black text-violet-300/60">{l.listing_type.charAt(0)}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                        <span className={`${GLASS_SM} absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-600`}>
                          {l.listing_type}
                        </span>
                        {rating != null && (
                          <span className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[11px] font-black shadow-[0_6px_14px_-4px_rgba(245,158,11,0.7)]">
                            <Star className="w-3 h-3" filled />
                            {rating.toFixed(1)}
                          </span>
                        )}
                        <span className="absolute bottom-3 left-3 text-[11px] font-mono font-bold text-white/85 drop-shadow">
                          {l.listing_id}
                        </span>
                      </div>
                      <div className="p-5">
                        <p className="font-black text-slate-800 text-base truncate">{l.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate font-semibold">
                          {destNames[l.destination_id] ?? l.destination_id}
                        </p>
                        {l.description && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                            {l.description}
                          </p>
                        )}
                        <div className="mt-4 flex items-center gap-2 pt-4 border-t border-white/60">
                          <Link
                            href={`/listing/${l.listing_id}`}
                            className={`${GLASS_SM} flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-slate-600 text-xs font-bold hover:bg-white/80 hover:text-violet-600 transition btn-press active:scale-95`}
                          >
                            <EyeIcon />
                            View
                          </Link>
                          <button
                            onClick={() => startEdit(l)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-violet-50/80 backdrop-blur-md border border-violet-200/70 text-violet-600 text-xs font-bold hover:bg-violet-100/80 transition btn-press active:scale-95"
                          >
                            <EditIcon />
                            Edit
                          </button>
                          <button
                            onClick={() => remove(l.listing_id)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50/80 backdrop-blur-md border border-rose-200/70 text-rose-500 text-xs font-bold hover:bg-rose-100/80 transition btn-press active:scale-95"
                            aria-label={`Delete ${l.name}`}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}