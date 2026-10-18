// app/src/app/listing/[listing_id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useRole } from '@/utils/supabase/role';
import { notifyListingOwner } from '@/utils/supabase/tripSignals';

type Review = {
  review_id: string;
  rating: number;
  title: string | null;
  review_text: string | null;
  visit_date: string | null;
  helpful_votes_count: number | null;
  photo_url: string | null;
  user_id: string;
  user_name?: string;
};

/* ───────────────  Neumorphic + Glass tokens  ─────────────── */
const CANVAS = 'min-h-screen bg-[#e8ecf8] relative overflow-hidden';
const NEU = 'bg-[#edf0fa] shadow-[10px_10px_24px_rgba(163,170,205,0.42),-10px_-10px_24px_rgba(255,255,255,0.95)]';
const NEU_SM = 'bg-[#edf0fa] shadow-[6px_6px_14px_rgba(163,170,205,0.38),-6px_-6px_14px_rgba(255,255,255,0.9)]';
const INSET = 'bg-[#e4e8f4] shadow-[inset_5px_5px_11px_rgba(163,170,205,0.38),inset_-5px_-5px_11px_rgba(255,255,255,0.85)]';
const GLASS = 'bg-white/60 backdrop-blur-xl border border-white/70 shadow-sm';
const GLASS_SM = 'bg-white/45 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(110,120,190,0.18)]';
const SHEEN = 'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:via-white/5 before:to-transparent';
const GRAD = 'from-indigo-500 via-violet-500 to-fuchsia-500';
const GRAD_TEXT = 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent';
const BTN_VIOLET = `relative overflow-hidden bg-gradient-to-r ${GRAD} text-white shadow-[0_12px_30px_-8px_rgba(124,58,237,0.7),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition ${SHEEN}`;
const FIELD = 'w-full px-4 py-3 rounded-2xl bg-[#e4e8f4] shadow-[inset_4px_4px_9px_rgba(163,170,205,0.4),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] border border-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-400/60 transition';
const FIELD_SM = FIELD.replace('py-3', 'py-2.5');
const LBL = 'block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1.5';

function GlassWellIcon({ gradient, children, size = 'md' }: { gradient: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  return (
    <div className={`relative overflow-hidden ${size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-12 h-12 rounded-2xl'} bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-lg`}>
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent" />
      <span className="relative flex items-center justify-center">{children}</span>
    </div>
  );
}

function Star({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={className ?? 'w-4 h-4'}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className ?? 'w-4 h-4'}>
      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.24a.75.75 0 010-1.08l4.5-4.24a.75.75 0 011.06.02z" clipRule="evenodd" />
    </svg>
  );
}

function Pin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}>
      <path d="M12 21s-7-5.1-7-11a7 7 0 1114 0c0 5.9-7 11-7 11z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function ThumbUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}>
      <path d="M7 10v11" strokeLinecap="round" />
      <path d="M7 10l4.2-6.6c.4-.6 1.3-.6 1.7 0 .2.3.3.7.2 1.1L12.6 8H18a2 2 0 012 2.4l-1.3 6.5A2 2 0 0116.7 19H7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function Calendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function Camera({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

function Close({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-5 h-5'}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-5 h-5'}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SafeImg({ src, alt, type }: { src: string | null; alt: string; type: string }) {
  const [failed, setFailed] = useState(false);
  const usable = !!src && !failed;
  return usable ? (
    <img src={src!} alt={alt} onError={() => setFailed(true)} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-100 via-violet-100 to-fuchsia-100">
      <Camera className="w-6 h-6 text-violet-300" />
      <span className="text-xs font-bold uppercase tracking-wider text-violet-400">{type}</span>
    </div>
  );
}

function fmtTimeShort(t: string) {
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const hr12 = hr % 12 === 0 ? 12 : hr % 12;
  return `${hr12}:${m} ${ampm}`;
}

function avatarGradient(rating: number) {
  if (rating <= 2) return 'from-rose-400 to-red-500';
  if (rating === 5) return 'from-emerald-400 to-teal-500';
  return 'from-indigo-400 to-violet-500';
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const role = useRole();
  const listingId = params.listing_id as string;

  const isManager = role.isOwner || role.isAdmin;

  const [listing, setListing] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [subtypeDetails, setSubtypeDetails] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [showAddToTrip, setShowAddToTrip] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [inTripCount, setInTripCount] = useState(0);
  const [scheduleInfo, setScheduleInfo] = useState<{ open_time: string | null; close_time: string | null } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [listingId]);

  useEffect(() => {
    async function load() {
      const { data: listingData } = await supabase.from('listings').select('*').eq('listing_id', listingId).maybeSingle();
      if (!listingData) { setLoading(false); return; }
      setListing(listingData);

      const { data: destData } = await supabase.from('destinations').select('*').eq('destination_id', listingData.destination_id).maybeSingle();
      setDestination(destData);

      let subtypeTable = '';
      let subtypeIdCol = '';
      if (listingData.listing_type === 'Attraction') { subtypeTable = 'attractions'; subtypeIdCol = 'attraction_id'; }
      else if (listingData.listing_type === 'Hotel') { subtypeTable = 'hotels'; subtypeIdCol = 'hotel_id'; }
      else if (listingData.listing_type === 'Restaurant') { subtypeTable = 'restaurants'; subtypeIdCol = 'restaurant_id'; }
      
      if (subtypeTable) {
        const { data: sub } = await supabase.from(subtypeTable).select('*').eq(subtypeIdCol, listingId).maybeSingle();
        setSubtypeDetails(sub);
        if (sub?.schedule_id) {
          const { data: sch } = await supabase.from('schedules').select('open_time, close_time').eq('schedule_id', sub.schedule_id).maybeSingle();
          setScheduleInfo(sch ?? null);
        }
      }

      const { data: photosData } = await supabase.from('photos').select('*').eq('listing_id', listingId).order('upload_date').limit(4);
      setPhotos(photosData || []);

      const { data: reviewsData } = await supabase.from('reviews').select('*').eq('listing_id', listingId).order('submission_date', { ascending: false });
      const revs = (reviewsData || []) as Review[];
      const userIds = [...new Set(revs.map((r) => r.user_id))];
      const nameMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: users } = await supabase.from('app_users').select('user_id, name').in('user_id', userIds);
        (users || []).forEach((u: any) => { nameMap[u.user_id] = u.name; });
      }
      setReviews(revs.map((r) => ({ ...r, user_name: nameMap[r.user_id] })));

      const { data: session } = await supabase.auth.getSession();
      const authId = session.session?.user?.id;
      if (authId) {
        const { data: profile } = await supabase.from('app_users').select('user_id').eq('auth_user_id', authId).maybeSingle();
        const uid = profile?.user_id ?? null;
        setUserId(uid);
        if (uid) {
          const { data: myItems } = await supabase.from('trip_items').select('trip_id, trip:trips(user_id)').eq('listing_id', listingId);
          const mine = (myItems ?? []).filter((r: any) => r.trip?.user_id === uid);
          setInTripCount(new Set(mine.map((r: any) => r.trip_id)).size);
        }
      }
      setLoading(false);
    }
    load();
  }, [listingId, refreshKey]);

  if (loading) {
    return (
      <main className={`${CANVAS} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto rounded-full ${INSET} flex items-center justify-center`}>
            <div className="w-9 h-9 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          </div>
          <p className="mt-5 text-sm font-medium text-slate-400">Loading listing…</p>
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className={`${CANVAS} flex items-center justify-center p-8`}>
        <div className={`${NEU} rounded-3xl p-10 max-w-md text-center`}>
          <p className={`text-6xl font-black ${GRAD_TEXT}`}>404</p>
          <h1 className="mt-3 text-xl font-bold text-slate-800">Listing not found</h1>
          <p className="mt-2 text-sm text-slate-500">This place may have been removed or the link is incorrect.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/search" className={`${BTN_VIOLET} px-5 py-2.5 rounded-full text-sm font-bold`}><span className="relative">Search places</span></Link>
            <button onClick={() => router.back()} className={`${GLASS_SM} px-5 py-2.5 rounded-full text-sm font-bold text-slate-600 hover:bg-white/70 transition active:scale-95`}>Go back</button>
          </div>
        </div>
      </main>
    );
  }

  const gallery = photos.length > 0 ? photos : listing.image_url ? [{ photo_id: 'main', photo_url: listing.image_url, caption: 'Main image' }] : [];
  const safeIndex = Math.min(activePhoto, Math.max(gallery.length - 1, 0));
  const hero = gallery[safeIndex];
  const avg = listing.average_rating != null ? Number(listing.average_rating) : null;

  return (
    <main className={CANVAS}>
      <div className="pointer-events-none fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/30 blur-3xl z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sky-300/25 blur-3xl z-0" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full bg-fuchsia-300/20 blur-3xl z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <button onClick={() => router.back()} className={`${GLASS_SM} inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-slate-600 hover:text-violet-600 hover:bg-white/80 transition active:scale-95 mb-8`}>
          <ChevronLeft className="w-4 h-4" /> Back to results
        </button>

        {/* ================= 1. HERO SECTION ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-16">
          {/* LEFT: Info */}
          <div className="lg:col-span-5 flex flex-col justify-center animate-fade-in-up">
            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r ${GRAD} text-white shadow-lg shadow-violet-500/20 w-fit mb-5`}>
              {listing.listing_type}
            </span>
            
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-5">
              {listing.name}
            </h1>

            {/* Location only (review count removed) */}
            {destination && (
              <div className="flex items-center gap-2 text-slate-600 mb-6">
                <Pin className="w-5 h-5 text-violet-500" />
                <span className="font-semibold">{destination.destination_name}, {destination.region_country}</span>
              </div>
            )}

            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              {listing.description ?? 'No description provided yet.'}
            </p>

            {!isManager && (
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => { if (!userId) router.push('/login'); else setShowAddToTrip(true); }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-700 bg-white border border-slate-200 shadow-sm hover:border-violet-300 hover:text-violet-600 transition active:scale-95"
                >
                  {inTripCount > 0 ? <Check className="w-5 h-5 text-emerald-500" /> : <Plus className="w-5 h-5" />}
                  {inTripCount > 0 ? `In ${inTripCount} trip${inTripCount === 1 ? '' : 's'}` : 'Add to trip'}
                </button>
                <button
                  onClick={() => { if (!userId) router.push('/login'); else setShowBooking(true); }}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r ${GRAD} shadow-lg shadow-violet-500/25 hover:brightness-110 transition active:scale-95`}
                >
                  <Calendar className="w-5 h-5" /> Book now
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Gallery */}
          <div className="lg:col-span-7 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {gallery.length === 0 ? (
              <div className={`h-80 md:h-[26rem] rounded-3xl ${INSET} flex flex-col items-center justify-center gap-3`}>
                <Camera className="w-8 h-8 text-violet-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-violet-400">No photos yet</span>
              </div>
            ) : (
              <>
                <button onClick={() => setLightbox(safeIndex)} className="relative block w-full aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 group shadow-xl" aria-label="Open photo viewer">
                  <SafeImg src={hero?.photo_url ?? null} alt={hero?.caption ?? listing.name} type={listing.listing_type} />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {hero?.caption && <span className="absolute bottom-0 left-0 right-0 text-white text-sm font-semibold p-5 text-left drop-shadow-md">{hero.caption}</span>}
                  <span className={`${GLASS_SM} absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700`}>{safeIndex + 1} / {gallery.length}</span>
                  <span className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-bold backdrop-blur-md group-hover:bg-black/70 transition">
                    <Camera className="w-3.5 h-3.5" /> View full screen
                  </span>
                </button>

                {gallery.length > 1 && (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {gallery.map((p, i) => (
                      <button
                        key={p.photo_id ?? i}
                        onClick={() => setActivePhoto(i)}
                        className={`aspect-[4/3] rounded-2xl overflow-hidden transition-all duration-200 ${i === safeIndex ? 'ring-2 ring-violet-500 shadow-lg scale-[1.02]' : 'ring-1 ring-white/60 opacity-70 hover:opacity-100'}`}
                      >
                        <SafeImg src={p.photo_url} alt={`Photo ${i + 1}`} type={listing.listing_type} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ================= 2. GUEST REVIEWS SECTION (MOVED HERE) ================= */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">Guest Reviews</h2>
              <p className="text-slate-500 mt-1">See what other travelers have to say about this place.</p>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className={`text-3xl font-black ${GRAD_TEXT}`}>{avg != null ? avg.toFixed(1) : '—'}</span>
              <div className="border-l border-slate-200 pl-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="w-4 h-4 text-amber-400" filled={avg != null && n <= Math.round(avg)} />
                  ))}
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-1">{reviews.length} total reviews</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left: Review Form (Sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                {!isManager ? (
                  <ReviewForm listingId={listingId} onSubmitted={() => setRefreshKey((k) => k + 1)} />
                ) : (
                  <section className={`${GLASS} rounded-3xl p-7`}>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Manager View</h3>
                    <p className="text-sm text-slate-500 mb-4">Traveler actions (bookings, trip additions, reviews) are hidden for your role.</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/business" className={`${BTN_VIOLET} px-4 py-2.5 rounded-xl text-sm font-bold`}><span className="relative">Business hub</span></Link>
                    </div>
                  </section>
                )}
              </div>
            </div>

            {/* Right: Review List */}
            <div className="lg:col-span-2 space-y-5">
              {reviews.length === 0 ? (
                <div className={`${GLASS} rounded-3xl p-10 text-center`}>
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Star className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">No reviews yet</h3>
                  <p className="text-sm text-slate-500">Be the first to share your experience at this place!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.review_id} className={`${GLASS} rounded-3xl p-6 transition-all hover:shadow-md`}>
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <GlassWellIcon gradient={avatarGradient(review.rating)}>
                          <span className="w-12 h-12 flex items-center justify-center font-black text-base">
                            {(review.user_name ?? 'T').trim().charAt(0).toUpperCase()}
                          </span>
                        </GlassWellIcon>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{review.user_name || 'TravelMate user'}</p>
                          <p className="text-xs text-slate-400 font-medium">
                            Visited {review.visit_date ? new Date(review.visit_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'recently'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-4 h-4 ${n <= review.rating ? 'text-amber-400' : 'text-slate-200'}`} filled={n <= review.rating} />
                        ))}
                      </div>
                    </div>
                    
                    {review.title && <p className="font-bold text-slate-800 text-base mb-2">{review.title}</p>}
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{review.review_text}</p>
                    
                    {review.photo_url && (
                      <img src={review.photo_url} alt="Review photo" className="mt-2 rounded-2xl max-h-56 object-cover shadow-md border border-slate-100" />
                    )}
                    
                    {review.helpful_votes_count != null && review.helpful_votes_count > 0 && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 mt-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100">
                        <ThumbUp className="w-3.5 h-3.5" /> {review.helpful_votes_count} found this helpful
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ================= 3. ABOUT & DETAILS SECTION ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          <section className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white/70 rounded-3xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">About this place</h2>
            <p className="text-slate-600 leading-relaxed text-lg">{listing.description ?? 'No description provided yet.'}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-100">
              <div className={`${INSET} rounded-2xl p-4`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Budget</p>
                <p className="text-sm font-bold text-slate-700">{listing.budget_tier || '—'}</p>
              </div>
              <div className={`${INSET} rounded-2xl p-4`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Best for</p>
                <p className="text-sm font-bold text-slate-700">{listing.activity_tag || '—'}</p>
              </div>
              {listing.listing_type === 'Attraction' && (
                <div className={`${INSET} rounded-2xl p-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Open hours</p>
                  <p className="text-sm font-bold text-slate-700">
                    {scheduleInfo?.open_time && scheduleInfo?.close_time ? `${fmtTimeShort(scheduleInfo.open_time)} – ${fmtTimeShort(scheduleInfo.close_time)}` : 'Open daily'}
                  </p>
                </div>
              )}
              {listing.listing_type === 'Hotel' && subtypeDetails && (
                <div className={`${INSET} rounded-2xl p-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Star rating</p>
                  <p className="text-sm font-bold text-slate-700">{subtypeDetails.star_rating || '—'}</p>
                </div>
              )}
              {listing.listing_type === 'Restaurant' && subtypeDetails && (
                <div className={`${INSET} rounded-2xl p-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Cuisine</p>
                  <p className="text-sm font-bold text-slate-700">{subtypeDetails.cuisine_type || '—'}</p>
                </div>
              )}
            </div>
          </section>

          <section className="lg:col-span-1 bg-white/60 backdrop-blur-xl border border-white/70 rounded-3xl p-8 shadow-sm h-fit sticky top-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Listing Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Listing Type</p>
                <p className="text-sm font-bold text-slate-700">{listing.listing_type}</p>
              </div>
              {listing.address && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Address</p>
                  <p className="text-sm font-bold text-slate-700">{listing.address}</p>
                </div>
              )}
              {subtypeDetails?.coordinates && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(subtypeDetails.coordinates)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`${GLASS_SM} inline-flex items-center gap-1.5 mt-2 px-3.5 py-2 rounded-full text-xs font-bold text-violet-600 hover:bg-white/70 transition active:scale-95`}
                >
                  <Pin className="w-3.5 h-3.5" /> Open in Google Maps
                </a>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      {!isManager && showAddToTrip && userId && (
        <AddToTripModal listingId={listingId} userId={userId} listingName={listing.name} onClose={() => setShowAddToTrip(false)} onSuccess={() => { setShowAddToTrip(false); setInTripCount((c) => c + 1); setRefreshKey((k) => k + 1); }} />
      )}
      {!isManager && showBooking && userId && (
        <BookingModal listingId={listingId} userId={userId} listingName={listing.name} onClose={() => setShowBooking(false)} onSuccess={() => { setShowBooking(false); setRefreshKey((k) => k + 1); }} />
      )}
      {lightbox != null && gallery.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/80 text-sm font-bold">{lightbox + 1} / {gallery.length}</span>
          <button aria-label="Close viewer" onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition flex items-center justify-center"><Close className="w-5 h-5" /></button>
          {gallery.length > 1 && (
            <>
              <button aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length); }} className="absolute left-3 md:left-8 w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
              <button aria-label="Next photo" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length); }} className="absolute right-3 md:right-8 w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition flex items-center justify-center"><ChevronLeft className="w-5 h-5 rotate-180" /></button>
            </>
          )}
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
              <SafeImg src={gallery[lightbox]?.photo_url ?? null} alt={gallery[lightbox]?.caption ?? listing.name} type={listing.listing_type} />
            </div>
            {gallery[lightbox]?.caption && <p className="text-center text-white/70 text-sm mt-3 font-medium">{gallery[lightbox].caption}</p>}
          </div>
        </div>
      )}
    </main>
  );
}

/* ───────────────  MODALS & FORMS  ─────────────── */

function AddToTripModal({ listingId, userId, listingName, onClose, onSuccess }: { listingId: string; userId: string; listingName: string; onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [doneTripId, setDoneTripId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('trips').select('*, trip_items(trip_item_id, listing_id)').eq('user_id', userId).order('start_date', { ascending: false });
      setTrips(((data ?? []) as any[]).map((t) => ({
        trip_id: t.trip_id,
        trip_name: t.trip_name ?? `Trip ${t.trip_id}`,
        start_date: t.start_date ?? null,
        end_date: t.end_date ?? null,
        count: (t.trip_items ?? []).length,
        has: (t.trip_items ?? []).some((i: any) => i.listing_id === listingId),
      })));
    }
    load();
  }, [userId, listingId]);

  async function handleAdd() {
    setErr(null); setBusy(true);
    try {
      let tripId = selected;
      if (!tripId && showNew) {
        if (!newName.trim()) throw new Error('Give the new trip a name.');
        if (newStart && newEnd && newEnd < newStart) throw new Error('End date must be after the start date.');
        const { data: newId, error: idErr } = await supabase.rpc('new_trip_id');
        if (idErr) throw idErr;
        const { error: tripErr } = await supabase.from('trips').insert({ trip_id: newId as string, user_id: userId, trip_name: newName.trim(), start_date: newStart || null, end_date: newEnd || null });
        if (tripErr) throw tripErr;
        tripId = newId as string;
      }
      if (!tripId) throw new Error('Pick a trip or create a new one.');
      const target = trips.find((t) => t.trip_id === tripId);
      const seq = target ? target.count + 1 : 1;
      const { error } = await supabase.from('trip_items').insert({ trip_item_id: `ITI-${Date.now().toString().slice(-8)}`, trip_id: tripId, listing_id: listingId, sequence_no: seq, planned_date: null, start_time: null, notes: null });
      if (error) throw error;
      await notifyListingOwner(listingId); // anonymous demand signal to the business owner (best-effort)
      setDoneTripId(tripId);
      setDone(target?.trip_name ?? (newName.trim() || 'your trip'));
    } catch (e: any) { setErr(e?.message ?? 'Could not add to trip.'); }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => { if (!done) onClose(); }}>
      <div className={`${NEU} rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto animate-slide-up scrollbar-hide`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-slate-800">{done ? 'Added to trip' : 'Add to trip'}</h3>
          <button type="button" onClick={() => (done ? onSuccess() : onClose())} className="text-slate-400 hover:text-slate-600 transition" aria-label="Close"><Close className="w-5 h-5" /></button>
        </div>
        {err && !done && <p className="bg-rose-50/90 text-rose-700 border border-rose-200 rounded-2xl px-4 py-3 text-sm font-semibold mb-4">{err}</p>}
        {done ? (
          <div className="text-center py-6">
            <GlassWellIcon gradient="from-emerald-400 to-teal-500" size="lg"><Check className="w-7 h-7" /></GlassWellIcon>
            <h4 className="text-lg font-black text-slate-800 mt-4 mb-2">Added to {done}</h4>
            <p className="text-sm text-slate-500 mb-6">This place is now in your itinerary. Open the planner to schedule it, or keep exploring.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => { onSuccess(); router.push(doneTripId ? `/?trip=${encodeURIComponent(doneTripId)}#trip-planner` : '/#trip-planner'); }} className={`${BTN_VIOLET} px-4 py-3 rounded-2xl text-sm font-bold`}><span className="relative">View in Planner</span></button>
              <button type="button" onClick={() => { onSuccess(); router.push('/search'); }} className={`${GLASS_SM} px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-white/70 transition active:scale-95`}>Browse more</button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">Adding: <span className="font-bold text-slate-800">{listingName}</span></p>
            {trips.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mb-4 scrollbar-hide">
                {trips.map((t) => (
                  <label key={t.trip_id} className={`flex items-start gap-3 p-3.5 rounded-2xl transition cursor-pointer ${selected === t.trip_id ? 'bg-gradient-to-r from-indigo-50 to-violet-50 ring-2 ring-violet-400 shadow-lg' : `${NEU_SM} hover:bg-white/70`} ${t.has ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <input type="radio" name="trip" value={t.trip_id} checked={selected === t.trip_id} disabled={t.has} onChange={() => setSelected(t.trip_id)} className="mt-1 accent-violet-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{t.trip_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">{t.start_date ? `${t.start_date} → ${t.end_date ?? '—'}` : 'No dates set'} · {t.count} place{t.count === 1 ? '' : 's'}</p>
                      {t.has && <p className="text-xs text-emerald-600 font-bold mt-0.5">Already in this trip</p>}
                    </div>
                  </label>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500 mb-4">No trips yet — create one below.</p>}
            <button type="button" onClick={() => setShowNew(!showNew)} className="w-full text-sm font-bold text-violet-600 hover:text-violet-700 transition mb-3">{showNew ? 'Hide new trip form' : 'Create a new trip'}</button>
            {showNew && (
              <div className="space-y-3 mb-4">
                <div><div className="flex items-baseline justify-between mb-1.5"><label className={LBL}>Trip name</label><span className="text-[11px] font-semibold text-slate-400">{newName.length}/100</span></div><input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} placeholder="e.g., Summer in La Union" className={FIELD} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={LBL}>Start date</label><input type="date" value={newStart} max={newEnd || undefined} onChange={(e) => setNewStart(e.target.value)} className={FIELD_SM} /></div>
                  <div><label className={LBL}>End date</label><input type="date" value={newEnd} min={newStart || undefined} onChange={(e) => setNewEnd(e.target.value)} className={FIELD_SM} /></div>
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={onClose} className={`${GLASS_SM} flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-white/70 transition active:scale-95`}>Cancel</button>
              <button type="button" onClick={handleAdd} disabled={busy || (!selected && !(showNew && newName.trim()))} className={`${BTN_VIOLET} flex-1 py-3 rounded-2xl text-sm font-bold disabled:opacity-60`}><span className="relative">{busy ? 'Adding…' : 'Add to trip'}</span></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BookingModal({ listingId, userId, listingName, onClose, onSuccess }: { listingId: string; userId: string; listingName: string; onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [requests, setRequests] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleBook() {
    setErr(null); setBusy(true);
    try {
      if (!checkIn || !checkOut) throw new Error('Please select check-in and check-out dates.');
      if (new Date(checkOut) <= new Date(checkIn)) throw new Error('Check-out must be after check-in.');
      const { data: nextId, error: idErr } = await supabase.rpc('new_booking_id');
      if (idErr) throw idErr;
      const { error } = await supabase.from('bookings').insert({ booking_id: nextId as string, listing_id: listingId, user_id: userId, check_in: checkIn, check_out: checkOut, guests, special_requests: requests.trim() || null, status: 'pending' });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (e: any) { setErr(e?.message ?? 'Could not submit booking.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${NEU} rounded-3xl p-6 max-w-md w-full`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-800">Book now</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><Close className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Booking: <span className="font-bold text-slate-800">{listingName}</span></p>
        {success ? (
          <div className="text-center py-8">
            <GlassWellIcon gradient="from-emerald-400 to-teal-500" size="lg"><Check className="w-7 h-7" /></GlassWellIcon>
            <h4 className="text-lg font-black text-slate-800 mt-4 mb-2">Booking request sent!</h4>
            <p className="text-sm text-slate-500">The owner will review your request and get back to you soon.</p>
          </div>
        ) : (
          <>
            {err && <p className="bg-rose-50/90 text-rose-700 border border-rose-200 rounded-2xl px-4 py-3 text-sm font-semibold mb-4">{err}</p>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LBL}>Check-in</label><input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} min={new Date().toISOString().slice(0, 10)} className={FIELD_SM} /></div>
                <div><label className={LBL}>Check-out</label><input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn || new Date().toISOString().slice(0, 10)} className={FIELD_SM} /></div>
              </div>
              <div><label className={LBL}>Guests</label><input type="number" min="1" max="20" value={guests} onChange={(e) => setGuests(parseInt(e.target.value) || 1)} className={FIELD} /></div>
              <div><label className={LBL}>Special requests (optional)</label><textarea value={requests} onChange={(e) => setRequests(e.target.value)} rows={3} maxLength={500} placeholder="e.g., Early check-in, specific room preference" className={`${FIELD} resize-none`} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className={`${GLASS_SM} flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-white/70 transition active:scale-95`}>Cancel</button>
              <button onClick={handleBook} disabled={busy || !checkIn || !checkOut} className={`${BTN_VIOLET} flex-1 py-3 rounded-2xl text-sm font-bold disabled:opacity-60`}><span className="relative">{busy ? 'Submitting…' : 'Submit request'}</span></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewForm({ listingId, onSubmitted }: { listingId: string; onSubmitted: () => void }) {
  const supabase = createClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function who() {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      if (uid) {
        const { data: profile } = await supabase.from('app_users').select('user_id').eq('auth_user_id', uid).maybeSingle();
        setUserId(profile?.user_id ?? null);
      }
      setChecked(true);
    }
    who();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!userId) { setErr('Please sign in to submit a review.'); return; }
    if (rating < 1) { setErr('Pick a star rating from 1 to 5.'); return; }
    setBusy(true);
    try {
      const { data: dup } = await supabase.from('reviews').select('review_id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle();
      if (dup) throw new Error('You already reviewed this listing.');
      const reviewId = `REV-${Date.now().toString().slice(-8)}`;
      let photoUrl: string | null = null;
      if (photo) {
        const path = `reviews/${reviewId}/${Date.now()}-${photo.name}`;
        const { error: upErr } = await supabase.storage.from('Media').upload(path, photo);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('Media').getPublicUrl(path);
        photoUrl = pub.publicUrl;
      }
      const { error } = await supabase.from('reviews').insert({ review_id: reviewId, listing_id: listingId, user_id: userId, rating, title: title || null, review_text: text.trim() || `(rated ${rating}/5 — no written review)`, visit_date: visitDate || null, submission_date: new Date().toISOString().slice(0, 10), helpful_votes_count: 0, photo_url: photoUrl });
      if (error) throw error;
      await supabase.rpc('recalc_listing_rating', { p_listing_id: listingId });
      setMsg('Review published!');
      setRating(0); setTitle(''); setText(''); setVisitDate(''); setPhoto(null);
      onSubmitted();
    } catch (e2: any) { setErr(e2?.message ?? 'Could not submit review.'); }
    finally { setBusy(false); }
  }

  if (!checked) return null;
  if (!userId) {
    return (
      <section className={`${GLASS} rounded-3xl p-7`}>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Write a review</h3>
        <p className="text-sm text-slate-500"><Link href="/login" className="text-violet-600 font-bold underline hover:text-violet-700">Sign in</Link> to share your experience.</p>
      </section>
    );
  }

  return (
    <section className={`${GLASS} rounded-3xl p-7`}>
      <h3 className="text-lg font-bold text-slate-900 mb-4">Write a review</h3>
      {err && <p className="bg-rose-50/90 text-rose-700 border border-rose-200 rounded-2xl px-4 py-3 text-sm font-semibold mb-4">{err}</p>}
      {msg && <p className="bg-emerald-50/90 text-emerald-700 border border-emerald-200 rounded-2xl px-4 py-3 text-sm font-semibold mb-4">{msg}</p>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={LBL}>Your rating</label>
          <div className="flex justify-center gap-2.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`Rate ${n} stars`} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 ${n <= rating ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg scale-105' : `${INSET} text-slate-300 hover:text-slate-400`}`}>
                <Star className="w-6 h-6" filled={n <= rating} />
              </button>
            ))}
          </div>
        </div>
        <div><div className="flex items-baseline justify-between mb-1.5"><label className={LBL}>Title (optional)</label><span className="text-[11px] font-semibold text-slate-400">{title.length}/50</span></div><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} placeholder="A short headline" className={FIELD} /></div>
        <div><div className="flex items-baseline justify-between mb-1.5"><label className={LBL}>Your review</label><span className="text-[11px] font-semibold text-slate-400">{text.length}/300</span></div><textarea required value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={300} placeholder="What was your experience like?" className={`${FIELD} resize-none`} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={LBL}>Photo (optional)</label><input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-500 file:mr-3 file:px-4 file:py-2.5 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-indigo-500 file:to-violet-500 file:text-white file:font-bold file:cursor-pointer file:shadow-md file:hover:brightness-110 file:transition" /></div>
          <div><label className={LBL}>Visit date (optional)</label><input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={FIELD_SM} /></div>
        </div>
        <button type="submit" disabled={busy} className={`${BTN_VIOLET} w-full py-3.5 rounded-2xl font-bold disabled:opacity-60`}><span className="relative">{busy ? 'Publishing…' : 'Publish review'}</span></button>
      </form>
    </section>
  );
}