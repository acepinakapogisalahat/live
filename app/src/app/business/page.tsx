// app/src/app/business/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useRole } from '@/utils/supabase/role';
import { getOwnerDemand, type OwnerDemandSummary } from '@/utils/supabase/tripSignals';

type OwnListing = {
  listing_id: string;
  name: string;
  listing_type: string;
  image_url: string | null;
  average_rating: number | null;
};

type BookingRow = {
  booking_id: string;
  listing_id: string;
  user_id: string;
  check_in: string | null;
  check_out: string | null;
  guests: number | null;
  special_requests: string | null;
  status: string | null;
  booker_name?: string;
  listing_name?: string;
  listing_image?: string | null;
};

type ReviewRow = {
  review_id: string;
  user_id: string;
  listing_id: string;
  rating: number;
  title: string | null;
  review_text: string | null;
  submission_date: string | null;
  user_name?: string;
};

const CANVAS = 'min-h-screen bg-[#e8ecf8] relative overflow-x-hidden';
const NEU = 'bg-[#edf0fa] shadow-[10px_10px_24px_rgba(163,170,205,0.42),-10px_-10px_24px_rgba(255,255,255,0.95)]';
const NEU_SM = 'bg-[#edf0fa] shadow-[6px_6px_14px_rgba(163,170,205,0.38),-6px_-6px_14px_rgba(255,255,255,0.9)]';
const NEU_HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:shadow-[14px_14px_32px_rgba(163,170,205,0.5),-14px_-14px_32px_rgba(255,255,255,1)]';
const INSET = 'bg-[#e4e8f4] shadow-[inset_5px_5px_11px_rgba(163,170,205,0.38),inset_-5px_-5px_11px_rgba(255,255,255,0.85)]';
const GLASS = 'bg-white/60 backdrop-blur-xl border border-white/70 shadow-[0_10px_34px_rgba(110,120,190,0.15)]';
const GLASS_SM = 'bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(110,120,190,0.12)]';
const SHEEN = 'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:via-white/5 before:to-transparent';
const GRAD = 'from-indigo-500 via-violet-500 to-fuchsia-500';
const BTN_VIOLET = `relative overflow-hidden bg-gradient-to-r ${GRAD} text-white shadow-[0_12px_30px_-8px_rgba(124,58,237,0.6),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition-all duration-200 ${SHEEN}`;
const BTN_AMBER = `relative overflow-hidden bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_12px_28px_-8px_rgba(245,158,11,0.6),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition-all duration-200 ${SHEEN}`;
const BTN_ROSE = `relative overflow-hidden bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_12px_28px_-8px_rgba(244,63,94,0.6),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition-all duration-200 ${SHEEN}`;
const BTN_EMERALD = `relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_12px_28px_-8px_rgba(16,185,129,0.6),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition-all duration-200 ${SHEEN}`;
const CHIP_IDLE = `${GLASS_SM} text-slate-600 hover:text-violet-700 hover:bg-white/70 active:scale-[0.97] transition-all duration-200`;
const GRAD_TEXT = 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent';

// Clickable summary tile used on the Business Hub dashboards.
function HubStat({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`group text-left ${NEU} ${NEU_HOVER} rounded-3xl p-6 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400`}>
      {children}
    </button>
  );
}

const GLOSS = 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(70,80,150,0.2)]';

function Star({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={className ?? 'w-4 h-4'}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" />
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className ?? 'w-4 h-4'}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Close({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
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

function Calendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function TrendUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-5 h-5'}>
      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-5 h-5'}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function MessageSquare({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-5 h-5'}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-5 h-5'}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function GlassWellIcon({ gradient, children, size = 'md' }: { gradient: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  return (
    <div className={`relative overflow-hidden ${size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-12 h-12 rounded-2xl'} bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_-8px_rgba(80,90,180,0.5),inset_0_1px_0_rgba(255,255,255,0.55)]`}>
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent" />
      <span className="relative flex items-center justify-center">{children}</span>
    </div>
  );
}

function AccentBar() {
  return <div className={`mt-2.5 h-1.5 w-16 rounded-full bg-gradient-to-r ${GRAD} shadow-[0_0_14px_rgba(139,92,246,0.5)]`} />;
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function statusChip(status: string | null) {
  const s = status ?? 'pending';
  const cls =
    s === 'confirmed' ? 'bg-emerald-50/80 text-emerald-600 border border-emerald-200/80 backdrop-blur-md'
    : s === 'rejected' ? 'bg-rose-50/80 text-rose-600 border border-rose-200/80 backdrop-blur-md'
    : s === 'cancelled' ? 'bg-slate-100/80 text-slate-500 border border-slate-200/80 backdrop-blur-md'
    : 'bg-amber-50/80 text-amber-600 border border-amber-200/80 backdrop-blur-md';
  const label = s === 'confirmed' ? 'Confirmed' : s === 'rejected' ? 'Rejected' : s === 'cancelled' ? 'Cancelled' : 'Pending';
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold capitalize shadow-sm ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function avatarGradient(rating: number) {
  if (rating <= 2) return 'from-rose-400 to-red-500';
  if (rating === 5) return 'from-emerald-400 to-teal-500';
  return 'from-indigo-400 to-violet-500';
}

function ReviewCard({
  review,
  thanked,
  flagged,
  onThank,
  onFlag,
}: {
  review: ReviewRow;
  thanked: boolean;
  flagged: boolean;
  onThank: () => void;
  onFlag: () => void;
}) {
  const isCritical = review.rating <= 2;
  return (
    <div className={`${GLASS} rounded-3xl p-6 ${NEU_HOVER} ${isCritical ? '!bg-rose-50/60 !border-rose-200/80' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <GlassWellIcon gradient={avatarGradient(review.rating)}>
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base">
              {(review.user_name ?? 'T').charAt(0).toUpperCase()}
            </span>
          </GlassWellIcon>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 text-sm truncate">{review.user_name ?? 'TravelMate user'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{fmtDate(review.submission_date)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`w-4 h-4 ${n <= review.rating ? 'text-amber-400' : 'text-slate-300'}`} filled={n <= review.rating} />
            ))}
          </div>
          {isCritical && (
            <span className="px-2.5 py-1 rounded-full bg-rose-50/80 backdrop-blur-md border border-rose-200/80 text-rose-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Needs attention
            </span>
          )}
          {review.rating === 5 && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-50/80 backdrop-blur-md border border-emerald-200/80 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
              Loved it
            </span>
          )}
        </div>
      </div>
      {review.title && <p className="font-bold text-slate-700 text-sm mb-1.5">{review.title}</p>}
      <p className="text-sm text-slate-500 leading-relaxed">{review.review_text || 'No written review — rating only.'}</p>
      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/60">
        {isCritical ? (
          <button type="button" onClick={onFlag} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${flagged ? BTN_ROSE : 'bg-rose-50/80 text-rose-500 border border-rose-200/80 backdrop-blur-md hover:bg-rose-100/80'}`}>
            <FlagIcon className="w-3.5 h-3.5" />
            {flagged ? 'Flagged' : 'Flag for moderation'}
          </button>
        ) : (
          <button type="button" onClick={onThank} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${thanked ? BTN_EMERALD : 'bg-emerald-50/80 text-emerald-600 border border-emerald-200/80 backdrop-blur-md hover:bg-emerald-100/80'}`}>
            <Check className="w-3.5 h-3.5" />
            {thanked ? 'Thanked' : 'Thank this guest'}
          </button>
        )}
        <span className="ml-auto text-[10px] font-mono text-slate-300">{review.review_id}</span>
      </div>
    </div>
  );
}

export default function BusinessPage() {
  const supabase = createClient();
  const role = useRole();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<OwnListing[]>([]);
  const [allBookings, setAllBookings] = useState<BookingRow[]>([]);
  const [allReviews, setAllReviews] = useState<ReviewRow[]>([]);
  const [application, setApplication] = useState<any>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'interest' | 'reviews' | 'bookings'>('overview');
  const router = useRouter();
  // Trip-interest analytics: listings travelers added to their trips
  const [demand, setDemand] = useState<OwnerDemandSummary | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [reviewStarFilter, setReviewStarFilter] = useState<number | null>(null);
  const [reviewSort, setReviewSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [thankedReviews, setThankedReviews] = useState<Set<string>>(new Set());
  const [flaggedReviews, setFlaggedReviews] = useState<Set<string>>(new Set());
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!role.loading && role.userId) load(role.userId, role.isAdmin);
    if (!role.loading && !role.userId) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.loading, role.userId, role.isAdmin]);

  async function load(uid: string, admin: boolean) {
    let lsQuery = supabase.from('listings').select('listing_id, name, listing_type, image_url, average_rating');
    if (!admin) lsQuery = lsQuery.eq('uploaded_by', uid);
    const { data: ls } = await lsQuery;
    const own = (ls ?? []) as OwnListing[];
    setListings(own);
    const ids = own.map((l) => l.listing_id);

    setSelectedListingId((cur) => (cur && own.some((l) => l.listing_id === cur) ? cur : own[0]?.listing_id ?? null));

    if (ids.length) {
      const { data: bk } = await supabase.from('bookings').select('*').in('listing_id', ids).order('booking_id', { ascending: false });
      const rows = (bk ?? []) as BookingRow[];
      const uids = [...new Set(rows.map((b) => b.user_id))];
      if (uids.length) {
        const { data: us } = await supabase.from('app_users').select('user_id, name').in('user_id', uids);
        const nm: Record<string, string> = {};
        (us ?? []).forEach((u: any) => { nm[u.user_id] = u.name; });
        rows.forEach((b) => { b.booker_name = nm[b.user_id] ?? 'Traveler'; });
      }
      const lm: Record<string, { name: string; image_url: string | null }> = {};
      own.forEach((l) => { lm[l.listing_id] = { name: l.name, image_url: l.image_url }; });
      rows.forEach((b) => {
        b.listing_name = lm[b.listing_id]?.name;
        b.listing_image = lm[b.listing_id]?.image_url;
      });
      setAllBookings(rows);

      const { data: rv } = await supabase.from('reviews').select('*').in('listing_id', ids).order('submission_date', { ascending: false });
      const revs = (rv ?? []) as ReviewRow[];
      const ruids = [...new Set(revs.map((r) => r.user_id))];
      if (ruids.length) {
        const { data: us2 } = await supabase.from('app_users').select('user_id, name').in('user_id', ruids);
        const nm2: Record<string, string> = {};
        (us2 ?? []).forEach((u: any) => { nm2[u.user_id] = u.name; });
        revs.forEach((r) => { r.user_name = nm2[r.user_id] ?? 'TravelMate user'; });
      }
      setAllReviews(revs);
    }

    const { data: appRows } = await supabase.from('business_applications').select('*').eq('user_id', uid).limit(1);
    setApplication((appRows ?? [])[0] ?? null);

    // Demand analytics (best-effort — never blocks the hub)
    try { setDemand(await getOwnerDemand(uid)); } catch {}

    setLoading(false);
  }

  async function decide(bookingId: string, status: 'confirmed' | 'rejected') {
    setBusyId(bookingId);
    const { error } = await supabase.from('bookings').update({ status }).eq('booking_id', bookingId);
    if (!error && role.userId) await load(role.userId, role.isAdmin);
    setBusyId(null);
  }

  if (role.loading || loading) {
    return (
      <main className={CANVAS}>
        <div className="flex items-center justify-center min-h-screen pb-16">
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto rounded-full ${INSET} flex items-center justify-center`}>
              <div className="w-9 h-9 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
            </div>
            <p className="mt-5 text-sm font-medium text-slate-400">Loading your business dashboard…</p>
          </div>
        </div>
      </main>
    );
  }

  if (!role.authId) {
    return (
      <main className={CANVAS}>
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className={`${NEU} rounded-3xl p-10 max-w-md text-center`}>
            <GlassWellIcon gradient={GRAD} size="lg"><Store className="w-7 h-7" /></GlassWellIcon>
            <h1 className="text-2xl font-black text-slate-800 mt-5 mb-2">Business hub</h1>
            <p className="text-slate-500 text-sm">
              <Link href="/login" className="text-violet-600 font-semibold underline hover:text-violet-700">Sign in</Link> to manage your listings, bookings, and reviews.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const isManager = role.isOwner || role.isAdmin;
  if (!isManager) {
    const appStatus = application?.status ?? null;
    return (
      <main className={CANVAS}>
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className={`${NEU} rounded-3xl p-10 max-w-md text-center`}>
            <div className={`w-16 h-16 mx-auto rounded-3xl ${INSET} text-slate-400 flex items-center justify-center mb-5`}>
              <Store className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">{appStatus === 'pending' ? 'Application under review' : 'Publisher access required'}</h1>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              {appStatus === 'pending' ? 'Your business owner application is being reviewed.' : appStatus === 'rejected' ? 'Your previous application was not approved. You may submit a new one.' : 'The business hub is for approved business owners.'}
            </p>
            <div className="mt-7 flex justify-center gap-3">
              {appStatus !== 'pending' && (
                <Link href="/apply" className={`${BTN_VIOLET} px-6 py-3 rounded-full text-sm font-bold`}>
                  <span className="relative">{appStatus === 'rejected' ? 'Reapply now' : 'Apply now'}</span>
                </Link>
              )}
              <Link href="/" className={`${CHIP_IDLE} px-6 py-3 rounded-full text-sm font-bold`}>Back to Discover</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const pending = allBookings.filter((b) => (b.status ?? 'pending') === 'pending');
  const confirmed = allBookings.filter((b) => b.status === 'confirmed');
  
  const bookingsPerListing: Record<string, number> = {};
  allBookings.forEach((b) => { 
    if (b.status === 'confirmed' || b.status === 'pending') {
      bookingsPerListing[b.listing_id] = (bookingsPerListing[b.listing_id] ?? 0) + 1; 
    }
  });

  const listingsByCategory: Record<string, OwnListing[]> = {};
  listings.forEach((l) => {
    const cat = l.listing_type || 'Other';
    if (!listingsByCategory[cat]) listingsByCategory[cat] = [];
    listingsByCategory[cat].push(l);
  });

  const topListingPerCategory: Record<string, OwnListing> = {};
  Object.entries(listingsByCategory).forEach(([cat, catListings]) => {
    const top = catListings.reduce((prev, current) => 
      (bookingsPerListing[prev.listing_id] || 0) > (bookingsPerListing[current.listing_id] || 0) ? prev : current
    );
    topListingPerCategory[cat] = top;
  });

  const reviewCounts: Record<string, number> = {};
  allReviews.forEach((r) => { reviewCounts[r.listing_id] = (reviewCounts[r.listing_id] ?? 0) + 1; });
  
  const rated = listings.map((l) => l.average_rating).filter((v): v is number => v != null);
  const avgAll = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
  const criticalReviews = allReviews.filter((r) => r.rating <= 2).length;
  const pendingBookingsCount = pending.length;
  const needsAttention = criticalReviews > 0 || pendingBookingsCount > 0;

  const selListing = listings.find((l) => l.listing_id === selectedListingId) ?? null;
  const selReviews = allReviews.filter((r) => r.listing_id === selectedListingId);
  const selAvg = selReviews.length ? selReviews.reduce((s, r) => s + Number(r.rating), 0) / selReviews.length : null;
  const selCritical = selReviews.filter((r) => r.rating <= 2).length;
  const selLatest = selReviews.length ? selReviews.map((r) => r.submission_date ?? '').sort().reverse()[0] : null;
  
  const selDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: selReviews.filter((r) => r.rating === star).length,
    pct: selReviews.length ? (selReviews.filter((r) => r.rating === star).length / selReviews.length) * 100 : 0,
  }));
  
  const filteredReviews = selReviews
    .filter((r) => reviewStarFilter === null || r.rating === reviewStarFilter)
    .sort((a, b) => {
      if (reviewSort === 'newest') return (b.submission_date || '').localeCompare(a.submission_date || '');
      if (reviewSort === 'oldest') return (a.submission_date || '').localeCompare(b.submission_date || '');
      if (reviewSort === 'highest') return b.rating - a.rating;
      return a.rating - b.rating;
    });

  const filteredBookings = allBookings.filter((b) => bookingStatusFilter === 'all' || (b.status ?? 'pending') === bookingStatusFilter);
  const selectedBooking = allBookings.find((b) => b.booking_id === selectedBookingId) ?? null;

  const avgStayLength = confirmed.length
    ? confirmed.reduce((sum, b) => {
        if (!b.check_in || !b.check_out) return sum;
        const days = Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000);
        return sum + days;
      }, 0) / confirmed.length
    : 0;
  const responseRate = allBookings.length ? Math.round(((allBookings.length - pending.length) / allBookings.length) * 100) : 100;

  // ── Trip-interest (added-to-trip) derived values ──
  const demandTotal = demand?.total_adds ?? 0;
  const demand7d = demand?.adds_7d ?? 0;
  const maxAdds = demand?.per_listing?.length ? Math.max(1, ...demand.per_listing.map((p) => Number(p.adds))) : 1;

  function visitWindow(planned: string | null, st: string | null, en: string | null): string {
    const date = planned ? fmtDate(planned) : 'date not set yet';
    if (st && en) return `${date} · ${st.slice(0, 5)}–${en.slice(0, 5)}`;
    if (st) return `${date} · from ${st.slice(0, 5)}`;
    return date;
  }

  function openCriticalReviews() {
    const byCrit = [...listings].sort(
      (a, b) =>
        allReviews.filter((r) => r.listing_id === b.listing_id && r.rating <= 2).length -
        allReviews.filter((r) => r.listing_id === a.listing_id && r.rating <= 2).length
    );
    if (byCrit[0]) setSelectedListingId(byCrit[0].listing_id);
    setReviewStarFilter(null);
    setReviewSort('lowest');
    setActiveTab('reviews');
  }

  return (
    <main className={CANVAS}>
      <div className="pointer-events-none fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/25 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
          <div>
            <p className={`text-[11px] font-black uppercase tracking-[0.25em] ${GRAD_TEXT} mb-2`}>Publisher console</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800">Business hub</h1>
            <AccentBar />
            <p className="mt-3 text-sm text-slate-500 max-w-xl">
              {role.isAdmin ? 'Platform-wide bookings, reviews, and listing performance.' : 'Manage bookings, reviews, and performance across all your properties.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${GLASS_SM} px-4 py-2 rounded-full text-xs font-bold text-slate-600`}>
              {role.isAdmin ? 'Administrator' : 'Approved publisher'}
            </span>
            <Link href={role.isAdmin ? '/admin' : '/owner'} className={`${BTN_VIOLET} px-6 py-3 rounded-full text-sm font-bold`}>
              <span className="relative">{role.isAdmin ? 'Admin manager' : 'Manage listings'}</span>
            </Link>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl ${INSET} mb-8 w-fit`}>
          {(['overview', 'interest', 'reviews', 'bookings'] as const).map((tab) => {
            const badge = tab === 'reviews' ? criticalReviews : tab === 'bookings' ? pendingBookingsCount : 0;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? `${BTN_VIOLET} shadow-[0_10px_26px_-8px_rgba(124,58,237,0.6)]`
                    : 'text-slate-500 hover:text-violet-700 hover:bg-white/50'
                }`}
              >
                <span className="relative flex items-center gap-2">
                  {tab === 'interest' ? 'Trip interest' : tab}
                  {tab === 'interest' && demandTotal > 0 && (
                    <span className={`min-w-[1.35rem] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${activeTab === tab ? 'bg-white/25 text-white' : 'bg-violet-100 text-violet-600'}`}>
                      {demandTotal}
                    </span>
                  )}
                  {badge > 0 && (
                    <span className={`min-w-[1.35rem] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${activeTab === tab ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-600'}`}>
                      {badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {needsAttention && activeTab === 'overview' && (
          <div className="mb-8 p-5 rounded-3xl backdrop-blur-xl border border-white/70 shadow-[0_10px_34px_rgba(110,120,190,0.2)] bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-rose-50/80">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <GlassWellIcon gradient="from-amber-400 to-rose-500"><AlertCircle className="w-6 h-6" /></GlassWellIcon>
              <div className="flex-1">
                <p className="font-black text-slate-800 text-lg">Action required</p>
                <p className="text-sm text-slate-600 mt-0.5">
                  {pendingBookingsCount > 0 && <><strong className="text-slate-800">{pendingBookingsCount}</strong> pending booking request{pendingBookingsCount > 1 ? 's' : ''}</>}
                  {pendingBookingsCount > 0 && criticalReviews > 0 && ' and '}
                  {criticalReviews > 0 && <><strong className="text-slate-800">{criticalReviews}</strong> critical review{criticalReviews > 1 ? 's' : ''} (1–2 stars)</>}{' '}
                  need{pendingBookingsCount + criticalReviews === 1 ? 's' : ''} your attention.
                </p>
              </div>
              <div className="flex gap-3">
                {pendingBookingsCount > 0 && (
                  <button type="button" onClick={() => { setActiveTab('bookings'); setBookingStatusFilter('pending'); }} className={`${BTN_AMBER} px-5 py-3 rounded-full text-sm font-bold whitespace-nowrap`}>
                    <span className="relative">Review bookings</span>
                  </button>
                )}
                {criticalReviews > 0 && (
                  <button type="button" onClick={openCriticalReviews} className={`${BTN_ROSE} px-5 py-3 rounded-full text-sm font-bold whitespace-nowrap`}>
                    <span className="relative">View critical reviews</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <HubStat onClick={() => router.push('/owner')}>
                <div className="flex items-start justify-between mb-4">
                  <GlassWellIcon gradient="from-indigo-500 to-violet-500"><Store className="w-6 h-6" /></GlassWellIcon>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Active listings</p>
                <p className="text-4xl font-black text-slate-800">{listings.length}</p>
              </HubStat>
              <HubStat onClick={() => setActiveTab('reviews')}>
                <div className="flex items-start justify-between mb-4">
                  <GlassWellIcon gradient="from-amber-400 to-orange-500"><Star className="w-6 h-6" filled /></GlassWellIcon>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Average rating</p>
                <p className="text-4xl font-black text-slate-800">{avgAll != null ? avgAll.toFixed(1) : '—'}</p>
              </HubStat>
              <HubStat onClick={() => setActiveTab('reviews')}>
                <div className="flex items-start justify-between mb-4">
                  <GlassWellIcon gradient="from-emerald-400 to-teal-500"><MessageSquare className="w-6 h-6" /></GlassWellIcon>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Total reviews</p>
                <p className="text-4xl font-black text-slate-800">{allReviews.length}</p>
              </HubStat>
              <HubStat onClick={() => setActiveTab('bookings')}>
                <div className="flex items-start justify-between mb-4">
                  <GlassWellIcon gradient="from-sky-400 to-indigo-500"><Clock className="w-6 h-6" /></GlassWellIcon>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Response rate</p>
                <p className="text-4xl font-black text-slate-800">{responseRate}%</p>
              </HubStat>
            </div>

            {Object.keys(topListingPerCategory).length > 0 && (
              <section>
                <h2 className="text-xl font-black text-slate-800 mb-5 flex items-center gap-2">
                  <TrendUp className="w-5 h-5 text-emerald-500" />
                  Top Performers by Category
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Object.entries(topListingPerCategory).map(([category, listing]) => {
                    const count = bookingsPerListing[listing.listing_id] || 0;
                    return (
                      <div key={listing.listing_id} className={`${GLASS} rounded-3xl p-5 border border-white/60 hover:shadow-xl transition-all duration-300`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg">
                            <Store className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Top {category}</p>
                            <p className="font-black text-slate-800 truncate">{listing.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 text-amber-500">
                            <Star className="w-4 h-4" filled />
                            <span className="text-sm font-bold">{listing.average_rating?.toFixed(1) ?? 'New'}</span>
                          </div>
                          <div className="text-sm font-black text-emerald-600">{count} bookings</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-black text-slate-800 mb-5">Your Properties</h2>
              {listings.length === 0 ? (
                <div className={`${NEU} rounded-3xl p-12 text-center`}>
                  <div className={`w-16 h-16 mx-auto rounded-3xl ${INSET} text-indigo-300 flex items-center justify-center mb-4`}>
                    <Store className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">No listings yet</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">Publish your first place to start receiving bookings and reviews.</p>
                  <Link href="/owner" className={`${BTN_VIOLET} inline-block px-7 py-3 rounded-full text-sm font-bold`}>
                    <span className="relative">Publish a listing</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(listingsByCategory).map(([category, catListings]) => (
                    <div key={category}>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        {category} <span className="text-slate-400 font-normal">({catListings.length})</span>
                      </h3>
                      <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4" style={{ scrollSnapType: 'x mandatory' }}>
                        {catListings.map((l) => (
                          <div key={l.listing_id} className={`${NEU} ${NEU_HOVER} rounded-3xl overflow-hidden shrink-0 w-80`} style={{ scrollSnapAlign: 'start' }}>
                            <div className="relative h-48 bg-[#dfe4f2]">
                              {l.image_url ? (
                                <img src={l.image_url} alt="" className="w-full h-48 object-cover" />
                              ) : (
                                <div className="w-full h-48 bg-gradient-to-br from-indigo-100 via-violet-100 to-fuchsia-100 flex items-center justify-center">
                                  <span className="text-sm font-black uppercase tracking-widest text-violet-300">{l.listing_type}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                              <span className={`${GLASS_SM} absolute top-3 left-3 px-3 py-1 rounded-full text-slate-600 text-[10px] font-black uppercase tracking-wider`}>
                                {l.listing_type}
                              </span>
                            </div>
                            <div className="p-5">
                              <h3 className="font-black text-slate-800 mb-3 truncate">{l.name}</h3>
                              <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-4">
                                <span className="flex items-center gap-1 text-amber-500">
                                  <Star className="w-4 h-4" filled />
                                  {l.average_rating != null ? Number(l.average_rating).toFixed(1) : 'New'}
                                </span>
                                <span className="text-violet-500">{reviewCounts[l.listing_id] ?? 0} reviews</span>
                                <span className="text-sky-500">{bookingsPerListing[l.listing_id] ?? 0} bookings</span>
                              </div>
                              <div className="flex gap-2 pt-4 border-t border-white/60">
                                <button
                                  type="button"
                                  onClick={() => { setActiveTab('reviews'); setSelectedListingId(l.listing_id); setReviewStarFilter(null); }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-violet-50/80 backdrop-blur-md border border-violet-200/70 text-violet-600 text-xs font-bold hover:bg-violet-100/80 transition"
                                >
                                  <Star className="w-3.5 h-3.5 text-amber-400" filled />
                                  Reviews
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setActiveTab('bookings'); setSelectedBookingId(null); }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-sky-50/80 backdrop-blur-md border border-sky-200/70 text-sky-600 text-xs font-bold hover:bg-sky-100/80 transition"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  Bookings
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${GLASS} rounded-3xl p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-black text-slate-800">Recent bookings</h2>
                  <button type="button" onClick={() => setActiveTab('bookings')} className="text-sm font-bold text-violet-600 hover:text-violet-700 transition">View all →</button>
                </div>
                {allBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className={`w-14 h-14 mx-auto rounded-2xl ${INSET} text-indigo-300 flex items-center justify-center mb-3`}>
                      <Calendar className="w-7 h-7" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">No booking requests yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allBookings.slice(0, 4).map((b) => (
                      <button
                        type="button"
                        key={b.booking_id}
                        onClick={() => { setActiveTab('bookings'); setSelectedBookingId(b.booking_id); }}
                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/60 transition text-left"
                      >
                        {b.listing_image ? (
                          <img src={b.listing_image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-md" />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl ${INSET} flex items-center justify-center shrink-0 text-indigo-300`}>
                            <Store className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 text-sm truncate">{b.listing_name ?? b.listing_id}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{b.booker_name ?? 'Traveler'} · {fmtDate(b.check_in)}</p>
                        </div>
                        {statusChip(b.status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${GLASS} rounded-3xl p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-black text-slate-800">Recent reviews</h2>
                  <button type="button" onClick={() => setActiveTab('reviews')} className="text-sm font-bold text-violet-600 hover:text-violet-700 transition">View all →</button>
                </div>
                {allReviews.length === 0 ? (
                  <div className="text-center py-8">
                    <div className={`w-14 h-14 mx-auto rounded-2xl ${INSET} text-amber-300 flex items-center justify-center mb-3`}>
                      <Star className="w-7 h-7" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">No reviews yet on your listings.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allReviews.slice(0, 4).map((r) => (
                      <button
                        type="button"
                        key={r.review_id}
                        onClick={() => { setActiveTab('reviews'); setSelectedListingId(r.listing_id); setReviewStarFilter(null); }}
                        className="w-full flex items-start gap-3 p-3 rounded-2xl hover:bg-white/60 transition text-left"
                      >
                        <div className="flex gap-0.5 shrink-0 pt-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'text-amber-400' : 'text-slate-300'}`} filled={n <= r.rating} />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 text-sm truncate">{r.user_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            on {listings.find((l) => l.listing_id === r.listing_id)?.name ?? r.listing_id}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interest' && (
          <div>
            <div className="mb-7">
              <h2 className="text-2xl font-black text-slate-800">Trip interest</h2>
              <AccentBar />
              <p className="text-sm text-slate-500 mt-3">
                See what is actually happening: every time a traveler adds one of your places to their itinerary it shows up here —
                including which trip, when they plan to visit and for how long. Traveler identities stay private by design.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
              <HubStat onClick={() => setActiveTab('interest')}>
                <div className="flex items-start justify-between mb-4">
                  <GlassWellIcon gradient="from-violet-500 to-fuchsia-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </GlassWellIcon>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Added to trips</p>
                <p className="text-4xl font-black text-slate-800">{demandTotal}</p>
              </HubStat>
              <HubStat onClick={() => setActiveTab('interest')}>
                <div className="flex items-start justify-between mb-4">
                  <GlassWellIcon gradient="from-indigo-500 to-sky-500"><Calendar className="w-6 h-6" /></GlassWellIcon>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Trips planning</p>
                <p className="text-4xl font-black text-slate-800">{demand?.unique_trips ?? 0}</p>
              </HubStat>
              <HubStat onClick={() => setActiveTab('interest')}>
                <div className="flex items-start justify-between mb-4">
                  <GlassWellIcon gradient="from-emerald-400 to-teal-500"><TrendUp className="w-6 h-6" /></GlassWellIcon>
                  {demand7d > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50/80 backdrop-blur-md border border-emerald-200/80 text-emerald-600 text-[10px] font-black">NEW</span>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Visits planned this week</p>
                <p className="text-4xl font-black text-slate-800">{demand7d}</p>
              </HubStat>
              <HubStat onClick={() => { setActiveTab('bookings'); setBookingStatusFilter('confirmed'); }}>
                <div className="flex items-start justify-between mb-4">
                  <GlassWellIcon gradient="from-amber-400 to-orange-500"><Star className="w-6 h-6" filled /></GlassWellIcon>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Booked stays</p>
                <p className="text-4xl font-black text-slate-800">{confirmed.length}</p>
              </HubStat>
            </div>

            {/* Adds per listing */}
            <section className="mb-8">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <TrendUp className="w-5 h-5 text-violet-500" />
                Added to trips by listing
              </h3>
              {!demand || demand.per_listing.length === 0 ? (
                <div className={`${NEU} rounded-3xl p-12 text-center`}>
                  <div className={`w-16 h-16 mx-auto rounded-3xl ${INSET} text-violet-300 flex items-center justify-center mb-4`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
                      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="font-black text-slate-700 mb-1">No trips include your places yet</p>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">When travelers add your places to their itineraries, the activity will appear here in real time.</p>
                </div>
              ) : (
                <div className={`${GLASS} rounded-3xl p-6 space-y-4`}>
                  {demand.per_listing.map((p) => {
                    const pct = Math.round((Number(p.adds) / maxAdds) * 100);
                    return (
                      <div key={p.listing_id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-bold text-slate-700 text-sm truncate">{p.name}</p>
                            <span className="text-[10px] font-mono text-slate-300 shrink-0">{p.listing_id}</span>
                          </div>
                          <p className="text-xs font-black text-violet-600 shrink-0 ml-3">
                            {p.adds} trip{Number(p.adds) === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className={`h-2.5 rounded-full ${INSET} overflow-hidden`}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-500"
                            style={{ width: `${Math.max(pct, Number(p.adds) > 0 ? 6 : 0)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Recent trip activity — who's planning, when, how long */}
            {!!demand && demand.recent.length > 0 && (
              <section>
                <h3 className="text-lg font-black text-slate-800 mb-1.5 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sky-500" />
                  Recent trip activity
                </h3>
                <p className="text-xs text-slate-400 mb-4">Traveler identities stay private — you see the trip, when they plan to visit and for how long.</p>
                <div className="space-y-3">
                  {demand.recent.map((r, idx) => {
                    const lname = listings.find((l) => l.listing_id === r.listing_id)?.name ?? r.listing_id;
                    return (
                      <div key={`${r.trip_name}-${r.listing_id}-${idx}`} className={`${NEU_SM} ${NEU_HOVER} rounded-3xl p-5 flex items-center gap-4`}>
                        <GlassWellIcon gradient="from-indigo-500 via-violet-500 to-fuchsia-500">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                            <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </GlassWellIcon>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 text-sm truncate">
                            <span className="text-violet-600">{lname}</span> added to trip <span className="font-black">“{r.trip_name}”</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {visitWindow(r.planned_date, r.start_time, r.end_time)}
                            </span>
                            {r.start_time && r.end_time && (() => {
                              const mins = Math.max(0, Math.round((new Date(`2000-01-01T${r.end_time}`).getTime() - new Date(`2000-01-01T${r.start_time}`).getTime()) / 60000));
                              return mins >= 60 ? (
                                <span className="px-2 py-0.5 rounded-full bg-sky-50/80 border border-sky-200/70 text-sky-600 text-[10px] font-black">
                                  ~{(mins / 60).toFixed(mins % 60 === 0 ? 0 : 1)}h planned visit
                                </span>
                              ) : mins > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-sky-50/80 border border-sky-200/70 text-sky-600 text-[10px] font-black">~{mins}m planned visit</span>
                              ) : null;
                            })()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            <div className="mb-7">
              <h2 className="text-2xl font-black text-slate-800">Traveler reviews</h2>
              <AccentBar />
              <p className="text-sm text-slate-500 mt-3">Pick a listing to read exactly what travelers said about it.</p>
            </div>

            {listings.length === 0 ? (
              <div className={`${NEU} rounded-3xl p-14 text-center`}>
                <div className={`w-16 h-16 mx-auto rounded-3xl ${INSET} text-indigo-300 flex items-center justify-center mb-4`}>
                  <Store className="w-8 h-8" />
                </div>
                <p className="text-slate-400 font-medium">Publish a listing first — reviews will appear here.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-9">
                  {listings.map((l) => {
                    const count = reviewCounts[l.listing_id] ?? 0;
                    const crit = allReviews.filter((r) => r.listing_id === l.listing_id && r.rating <= 2).length;
                    const sel = selectedListingId === l.listing_id;
                    return (
                      <button
                        key={l.listing_id}
                        type="button"
                        onClick={() => { setSelectedListingId(l.listing_id); setReviewStarFilter(null); }}
                        className={`text-left rounded-3xl p-4 flex flex-col transition-all duration-300 ${
                          sel
                            ? 'bg-white/75 backdrop-blur-xl border-2 border-violet-400 shadow-[0_16px_38px_-14px_rgba(124,58,237,0.4)]'
                            : `${NEU_SM} border-2 border-transparent hover:bg-white/60 hover:backdrop-blur-xl`
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {l.image_url ? (
                            <img src={l.image_url} alt="" className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-md" />
                          ) : (
                            <div className={`w-12 h-12 rounded-2xl ${INSET} flex items-center justify-center shrink-0 text-indigo-300`}>
                              <Store className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`font-bold truncate text-sm ${sel ? 'text-violet-700' : 'text-slate-700'}`}>{l.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 font-semibold">
                              <Star className="w-3 h-3 text-amber-400" filled />
                              {l.average_rating != null ? Number(l.average_rating).toFixed(1) : 'New'}
                              <span className="text-slate-300">· {count} review{count === 1 ? '' : 's'}</span>
                            </p>
                          </div>
                          {crit > 0 && (
                            <span className="shrink-0 min-w-[1.4rem] h-6 px-1.5 rounded-full bg-rose-50/80 backdrop-blur-md border border-rose-200/80 text-rose-500 text-[10px] font-black flex items-center justify-center">
                              {crit}
                            </span>
                          )}
                        </div>
                        <div className="mt-auto pt-3 h-8 flex items-center">
                          {sel ? (
                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                              Viewing reviews
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Tap to view</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selListing ? (
                  <>
                    <div className={`${GLASS} rounded-3xl p-8 mb-7`}>
                      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-9 items-center">
                        <div className="text-center md:text-left">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 truncate max-w-[13rem]">{selListing.name}</p>
                          <p className={`text-6xl font-black ${GRAD_TEXT}`}>{selAvg != null ? selAvg.toFixed(1) : '—'}</p>
                          <div className="flex gap-1 justify-center md:justify-start mt-3">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={`w-5 h-5 ${selAvg != null && n <= Math.round(selAvg) ? 'text-amber-400' : 'text-slate-300'}`} filled={selAvg != null && n <= Math.round(selAvg)} />
                            ))}
                          </div>
                          <p className="text-xs text-slate-400 font-semibold mt-2.5">
                            {selReviews.length} review{selReviews.length === 1 ? '' : 's'}
                            {selLatest ? ` · latest ${fmtDate(selLatest)}` : ''}
                          </p>
                        </div>

                        <div className="space-y-2.5">
                          {selDistribution.map((d) => (
                            <button
                              key={d.star}
                              type="button"
                              onClick={() => setReviewStarFilter(reviewStarFilter === d.star ? null : d.star)}
                              className="w-full flex items-center gap-3 group"
                            >
                              <span className={`text-xs font-black w-9 text-right transition ${reviewStarFilter === d.star ? 'text-violet-600' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                {d.star} ★
                              </span>
                              <div className={`${INSET} flex-1 h-3 rounded-full overflow-hidden`}>
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${GLOSS} ${
                                    d.star <= 2 ? 'bg-gradient-to-r from-rose-400 to-red-400' : d.star === 3 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-teal-400'
                                  }`}
                                  style={{ width: `${d.pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-400 w-8">{d.count}</span>
                            </button>
                          ))}
                        </div>

                        <div className="flex md:flex-col gap-3 md:min-w-[9.5rem]">
                          <div className={`flex-1 md:flex-none ${INSET} rounded-2xl p-4 text-center`}>
                            <p className="text-xl font-black text-indigo-600">{selReviews.length}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Total</p>
                          </div>
                          <div className={`flex-1 md:flex-none rounded-2xl p-4 text-center ${selCritical > 0 ? 'bg-rose-50/70 backdrop-blur-md border border-rose-200/80' : `${INSET}`}`}>
                            <p className={`text-xl font-black ${selCritical > 0 ? 'text-rose-500' : 'text-slate-600'}`}>{selCritical}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Critical</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
                      <div className="flex flex-wrap gap-2.5">
                        <button type="button" onClick={() => setReviewStarFilter(null)} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${reviewStarFilter === null ? BTN_VIOLET : CHIP_IDLE}`}>
                          <span className="relative">All ({selReviews.length})</span>
                        </button>
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = selReviews.filter((r) => r.rating === star).length;
                          const isCrit = star <= 2;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewStarFilter(reviewStarFilter === star ? null : star)}
                              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${
                                reviewStarFilter === star
                                  ? isCrit ? BTN_ROSE : BTN_VIOLET
                                  : isCrit
                                    ? 'bg-rose-50/70 backdrop-blur-md text-rose-500 border border-rose-200/80 hover:bg-rose-100/70'
                                    : CHIP_IDLE
                              }`}
                            >
                              <span className="relative flex items-center gap-1.5">
                                {star} <Star className="w-3.5 h-3.5 text-amber-400" filled />
                                <span className="opacity-70">({count})</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className={`flex items-center gap-1 p-1.5 rounded-xl ${INSET} shrink-0`}>
                        {(['newest', 'oldest', 'highest', 'lowest'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewSort(s)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all duration-200 ${
                              reviewSort === s
                                ? 'bg-white/80 backdrop-blur-md text-violet-600 shadow-[0_4px_12px_rgba(120,130,200,0.3),inset_0_1px_0_rgba(255,255,255,0.8)]'
                                : 'text-slate-500 hover:text-violet-600'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredReviews.length === 0 ? (
                      <div className={`${NEU} rounded-3xl p-14 text-center`}>
                        <p className="text-slate-400 font-medium">
                          {selReviews.length === 0 ? `No reviews yet for ${selListing.name}.` : 'No reviews match this star filter.'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {filteredReviews.map((r) => (
                          <ReviewCard
                            key={r.review_id}
                            review={r}
                            thanked={thankedReviews.has(r.review_id)}
                            flagged={flaggedReviews.has(r.review_id)}
                            onThank={() => setThankedReviews((prev) => { const next = new Set(prev); next.has(r.review_id) ? next.delete(r.review_id) : next.add(r.review_id); return next; })}
                            onFlag={() => setFlaggedReviews((prev) => { const next = new Set(prev); next.has(r.review_id) ? next.delete(r.review_id) : next.add(r.review_id); return next; })}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`${NEU} rounded-3xl p-14 text-center`}>
                    <p className="text-slate-400 font-medium">Select a listing above to see its reviews.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div>
            <div className="mb-7">
              <h2 className="text-2xl font-black text-slate-800">Booking requests</h2>
              <AccentBar />
              <p className="text-sm text-slate-500 mt-3">Manage traveler reservations and availability.</p>
            </div>

            <div className="flex flex-wrap gap-2.5 mb-8">
              {['all', 'pending', 'confirmed', 'rejected', 'cancelled'].map((status) => {
                const count = status === 'all' ? allBookings.length : allBookings.filter((b) => (b.status ?? 'pending') === status).length;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => { setBookingStatusFilter(status); setSelectedBookingId(null); }}
                    className={`px-5 py-3 rounded-full text-sm font-bold capitalize transition-all duration-200 ${
                      bookingStatusFilter === status ? BTN_VIOLET : CHIP_IDLE
                    }`}
                  >
                    <span className="relative">{status} ({count})</span>
                  </button>
                );
              })}
            </div>

            {allBookings.length === 0 ? (
              <div className={`${NEU} rounded-3xl p-14 text-center`}>
                <div className={`w-16 h-16 mx-auto rounded-3xl ${INSET} text-sky-300 flex items-center justify-center mb-4`}>
                  <Calendar className="w-8 h-8" />
                </div>
                <p className="text-slate-400 font-medium">No booking requests yet. They appear here when travelers request dates.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
                <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2">
                  {filteredBookings.length === 0 ? (
                    <div className={`${NEU} rounded-3xl p-10 text-center`}>
                      <p className="text-slate-400 font-medium">No bookings match this filter.</p>
                    </div>
                  ) : (
                    filteredBookings.map((b) => {
                      const sel = selectedBookingId === b.booking_id;
                      const isPending = (b.status ?? 'pending') === 'pending';
                      return (
                        <button
                          key={b.booking_id}
                          type="button"
                          onClick={() => setSelectedBookingId(b.booking_id)}
                          className={`w-full text-left p-4 rounded-3xl transition-all duration-300 ${
                            sel
                              ? 'bg-white/75 backdrop-blur-xl border-2 border-violet-400 shadow-[0_16px_38px_-14px_rgba(124,58,237,0.4)]'
                              : isPending
                                ? 'bg-amber-50/70 backdrop-blur-md border-2 border-amber-300/70 hover:border-amber-400'
                                : `${NEU_SM} border-2 border-transparent hover:bg-white/60 hover:backdrop-blur-xl`
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-2.5">
                            {b.listing_image ? (
                              <img src={b.listing_image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-md" />
                            ) : (
                              <div className={`w-12 h-12 rounded-xl ${INSET} flex items-center justify-center shrink-0 text-indigo-300`}>
                                <Store className="w-6 h-6" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold truncate text-sm ${sel ? 'text-violet-700' : 'text-slate-700'}`}>{b.listing_name ?? b.listing_id}</p>
                              <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                                {b.booker_name ?? 'Traveler'} · {b.guests ?? 1} guest{(b.guests ?? 1) === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-2.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</span>
                          </div>
                          {statusChip(b.status)}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className={`${GLASS} rounded-3xl p-8 min-h-[440px]`}>
                  {!selectedBooking ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <div className={`w-20 h-20 mx-auto rounded-3xl ${INSET} text-sky-300 flex items-center justify-center mb-4`}>
                          <Calendar className="w-10 h-10" />
                        </div>
                        <p className="text-slate-400 font-medium">Select a booking to see full details</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-7">
                        <div className="flex items-center gap-4">
                          {selectedBooking.listing_image ? (
                            <img src={selectedBooking.listing_image} alt="" className="w-20 h-20 rounded-3xl object-cover shadow-[0_14px_28px_-10px_rgba(101,108,229,0.4)]" />
                          ) : (
                            <div className={`w-20 h-20 rounded-3xl ${INSET} flex items-center justify-center text-indigo-300`}>
                              <Store className="w-10 h-10" />
                            </div>
                          )}
                          <div>
                            <p className="font-black text-slate-800 text-lg">{selectedBooking.listing_name ?? selectedBooking.listing_id}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedBooking.booking_id}</p>
                          </div>
                        </div>
                        {statusChip(selectedBooking.status)}
                      </div>

                      <div className="space-y-4 mb-7">
                        <div className="grid grid-cols-2 gap-4">
                          <div className={`${INSET} rounded-2xl p-4`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Guest</p>
                            <p className="font-bold text-slate-700 text-sm">{selectedBooking.booker_name ?? 'Traveler'}</p>
                          </div>
                          <div className={`${INSET} rounded-2xl p-4`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Guests</p>
                            <p className="font-bold text-slate-700 text-sm">{selectedBooking.guests ?? 1}</p>
                          </div>
                        </div>
                        <div className={`${INSET} rounded-2xl p-4`}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Dates</p>
                          <p className="font-bold text-slate-700 text-sm">
                            {fmtDate(selectedBooking.check_in)} → {fmtDate(selectedBooking.check_out)}
                          </p>
                        </div>
                        {selectedBooking.special_requests && (
                          <div className={`${INSET} rounded-2xl p-4`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Special requests</p>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">{selectedBooking.special_requests}</p>
                          </div>
                        )}
                      </div>

                      {(selectedBooking.status ?? 'pending') === 'pending' && (
                        <div className="pt-6 border-t border-white/60 flex gap-3">
                          <button
                            type="button"
                            onClick={() => decide(selectedBooking.booking_id, 'confirmed')}
                            disabled={busyId === selectedBooking.booking_id}
                            className={`${BTN_EMERALD} flex-1 py-3.5 rounded-full font-bold disabled:opacity-60`}
                          >
                            <span className="relative flex items-center justify-center gap-2"><Check className="w-5 h-5" />Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(selectedBooking.booking_id, 'rejected')}
                            disabled={busyId === selectedBooking.booking_id}
                            className="flex-1 py-3.5 rounded-full bg-rose-50/80 backdrop-blur-md text-rose-500 border border-rose-200/80 font-bold hover:bg-rose-100/80 transition disabled:opacity-60"
                          >
                            <span className="relative flex items-center justify-center gap-2"><Close className="w-5 h-5" />Decline</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}