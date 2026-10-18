// app/src/app/apply/page.tsx — PUBLISH A PLACE / BECOME A BUSINESS OWNER (apply-1)
'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  CANVAS, GLASS, GLASS_SM, NEU_SM, INSET, GRAD, GRAD_TEXT, GLOSS, SHEEN, INPUT,
  BTN_PRIMARY, BTN_GHOST, FLOAT_SHADOW,
  Star, PlusIcon, MapIcon, RouteIcon, SparkleIcon, ChevronDown, GlassWellIcon, Link,
} from '@/components/dashboard/kit';
import { useApplicationStatus, normStatus } from '@/lib/useApplicationStatus';

if (typeof window !== 'undefined') console.log('[ApplyPage] build=apply-2');

type Dest = { destination_id: string; destination_name: string; region_country: string; [k: string]: any };
type Path = 'place' | 'business';

const PLACE_TYPES = ['Attraction', 'Restaurant', 'Hotel', 'Cafe / Bar', 'Activity / Tour', 'Shopping', 'Transport', 'Other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function destHay(d: Dest): string {
  return [d.destination_name, d.region_country, d.province, d.region, d.state, d.city, d.municipality, d.district, d.area]
    .filter((v) => typeof v === 'string' && v.trim()).join(' ').toLowerCase();
}
function destLabel(d: Dest): string {
  const sub = [d.province, d.region, d.state, d.city].find((v) => typeof v === 'string' && v.trim()) ?? '';
  return sub ? `${d.destination_name}, ${sub}` : `${d.destination_name}${d.region_country ? `, ${d.region_country}` : ''}`;
}

/* Field primitive — label + control + inline error, consistent across the form. */
function Field({ id, label, hint, error, children, counter }: { id: string; label: string; hint?: string; error?: string; counter?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={id} className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</label>
        {counter && <span className="text-[11px] text-slate-400 font-semibold tabular-nums">{counter}</span>}
      </div>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] font-semibold text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
}

function Section({ n, title, sub, children }: { n: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br ${GRAD} text-white text-xs font-black flex items-center justify-center shadow-md`}>{n}</span>
        <div className="min-w-0">
          <h3 className="text-base font-black tracking-tight text-slate-800 leading-tight">{title}</h3>
          {sub && <p className="text-[12px] font-semibold text-slate-500">{sub}</p>}
        </div>
      </div>
      <div className="pl-11 space-y-4">{children}</div>
    </section>
  );
}

export default function ApplyPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [dests, setDests] = useState<Dest[]>([]);

  const [path, setPath] = useState<Path>('business');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');

  const [placeName, setPlaceName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [dest, setDest] = useState<Dest | null>(null);
  const [locQuery, setLocQuery] = useState('');
  const [locOpen, setLocOpen] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [setupMissing, setSetupMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; name: string; email: string } | null>(null);
  const appStatus = useApplicationStatus();
  const canPublish = appStatus.isBusinessOwner; // place publishing is an OWNER capability
  useEffect(() => { if (!appStatus.loading && !appStatus.isBusinessOwner && path === 'place') setPath('business'); }, [appStatus.loading, appStatus.isBusinessOwner, path]);
  // ---- load session + profile + destinations (defensive * selects, no missing-column risk) ----
  useEffect(() => {
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const authId = session.session?.user?.id ?? null;
        if (authId) {
          setUid(authId);
          const [{ data: profile }, { data: d }] = await Promise.all([
            supabase.from('app_users').select('*').eq('auth_user_id', authId).maybeSingle(),
            supabase.from('destinations').select('*'),
          ]);
          if (profile) {
            setUserId((profile as any).user_id ?? null);
            setOwnerName(String((profile as any).full_name ?? (profile as any).name ?? (profile as any).first_name ?? ''));
            setEmail(String((profile as any).email ?? session.session?.user?.email ?? ''));
          } else {
            setEmail(String(session.session?.user?.email ?? ''));
          }
          setDests(((d ?? []) as Dest[]));
        }
      } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locResults = useMemo(() => {
    const q = locQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return dests.filter((d) => destHay(d).includes(q)).slice(0, 6);
  }, [locQuery, dests]);

  function resetForm() {
    setPath('place'); setPlaceName(''); setBusinessType(''); setDescription(''); setAddress('');
    setImageUrl(''); setNotes(''); setDest(null); setLocQuery(''); setLocOpen(false);
    setErrors({}); setBanner(null); setSetupMissing(false); setDone(null);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (ownerName.trim().length < 2) e.ownerName = 'Tell us who you are.';
    if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email — that’s where we’ll reply.';
    if (!businessType.trim()) e.businessType = 'Pick a category so reviewers know what this is.';
    const companyName = (path === 'business' ? businessName : placeName).trim();
    if (companyName.length < 2) e.companyName = path === 'business' ? 'Business name is required to apply as an owner.' : 'Give the place a name.';
    if (path === 'business') {
      if (website.trim() && !/^https?:\/\/.+\..+/i.test(website.trim())) e.website = 'Use a full URL (https://…).';
    } else {
      if (description.trim().length < 20) e.description = 'Describe it in at least 20 characters.';
      if (address.trim().length < 4 && !dest) e.address = 'Add an address or pick a destination below.';
    }
    setErrors(e);
    if (Object.keys(e).length) { setBanner('Please fix the highlighted fields.'); return false; }
    setBanner(null);
    return true;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy || !uid) return;
    if (!validate()) return;
    setBusy(true); setSetupMissing(false);
    if (!userId) { setBanner('We couldn’t link your account profile. Please sign out and back in, then retry.'); setBusy(false); return; }
    const id = `APP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const companyName = (path === 'business' ? businessName : placeName).trim() || ownerName.trim();
    const pitchLines: string[] = [];
    pitchLines.push(`Applicant: ${ownerName.trim()}${phone.trim() ? ` · ${phone.trim()}` : ''}`);
    if (path === 'business' && businessName.trim()) pitchLines.push(`Business: ${businessName.trim()}${website.trim() ? ` · ${website.trim()}` : ''}`);
    if (placeName.trim()) pitchLines.push(`Place: ${placeName.trim()}${businessType ? ` (${businessType})` : ''}`);
    if (description.trim()) pitchLines.push(`About: ${description.trim()}`);
    if (address.trim() || dest) pitchLines.push(`Location: ${[address.trim(), dest ? destLabel(dest) : ''].filter(Boolean).join(' — ')}`);
    if (imageUrl.trim()) pitchLines.push(`Cover photo: ${imageUrl.trim()}`);
    if (notes.trim()) pitchLines.push(`Notes for the team: ${notes.trim()}`);
    const pitch = pitchLines.join('\n');
    const row = {
      application_id: id,
      user_id: userId,
      company_name: companyName,
      business_type: businessType.trim(),
      contact_email: email.trim(),
      application_kind: path,
      pitch,
    };
    try {
      const { error } = await supabase.from('business_applications').insert(row);
      if (error) throw error;
      setDone({ id, name: companyName || 'your application', email: email.trim() });
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (/row-level security|policy|42501|permission denied/i.test(msg)) {
        setBanner('Your submission was blocked by security rules. Please refresh and retry, or contact support.');
      } else if (/does not exist|relation|42P01|Could not find the table/i.test(msg)) {
        setSetupMissing(true);
        setBanner('Submissions are paused: the business_applications table isn’t reachable.');
      } else {
        setBanner(msg || 'Could not send your application. Try again.');
      }
    }
    setBusy(false);
  }

  // ---- live preview values ----
  const pvTitle = placeName.trim() || (path === 'business' ? businessName.trim() : '') || 'Your place';
  const pvType = businessType || (path === 'business' ? 'Business' : 'Place');
  const pvRegion = path === 'place' ? (dest ? destLabel(dest) : (address.trim() || 'Add a location')) : (businessType.trim() || 'Business');
  const pvImg = imageUrl.trim();
  const pvValidImg = !!pvImg && /^https?:\/\//i.test(pvImg);

  return (
    <main className={`${CANVAS} page-enter relative min-h-[80vh]`}>
      <style>{`
        @keyframes tmRiseA { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .tm-rise-a { animation: tmRiseA .55s cubic-bezier(.22,.9,.32,1) both; }
      `}</style>
      <div className="pointer-events-none fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/25 blur-3xl z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-emerald-300/20 blur-3xl z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

        {/* HERO */}
        <div className="tm-rise-a max-w-3xl">
          <span className={`inline-flex items-center gap-2 rounded-full ${GLASS_SM} px-4 py-2 text-sm font-black text-violet-600`}>
            <SparkleIcon className="h-4 w-4" /> For business owners & hosts
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl font-black leading-[1.03] tracking-tight text-slate-800">
            {canPublish ? <>Put your place on the <span className={GRAD_TEXT}>map</span>.</> : <>Become a <span className={GRAD_TEXT}>business owner</span>.</>}
          </h1>
          <p className="mt-4 text-lg md:text-xl leading-relaxed text-slate-500">
            {canPublish ? 'Publish a place under your business profile. Submissions are reviewed by our team, then go live in Discover where travelers plan day by day.' : 'Place publishing is reserved for approved owners. Apply below, get reviewed in 2–3 days, and once you’re in you can list and manage your places from here.'}
          </p>
        </div>

        {loading ? (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
            <div className={`${GLASS} rounded-[2rem] h-[34rem] animate-pulse`} />
            <div className={`${GLASS} rounded-[2rem] h-[20rem] animate-pulse hidden lg:block`} />
          </div>
        ) : !uid ? (
          <div className={`mt-10 ${GLASS} rounded-[2rem] p-10 md:p-12 max-w-xl mx-auto text-center ${FLOAT_SHADOW} tm-rise-a`}>
            <GlassWellIcon gradient="from-indigo-500 to-violet-500" size="lg"><RouteIcon className="w-7 h-7" /></GlassWellIcon>
            <h2 className="text-2xl font-black text-slate-800 mt-5 mb-2">Sign in to apply</h2>
            <p className="text-sm text-slate-500 mb-7 max-w-md mx-auto">We tie each application to your account so you can track its review status and, once approved, manage your listings.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/login" className={`${BTN_PRIMARY} px-7 py-3.5 text-base`}><span className="relative">Sign in</span></Link>
              <Link href="/signup" className={`${BTN_GHOST} px-7 py-3.5 text-base`}>Create a free account</Link>
            </div>
          </div>
        ) : done ? (
          /* SUCCESS */
          <div className={`mt-10 ${GLASS} rounded-[2rem] p-10 md:p-14 max-w-2xl mx-auto text-center ${FLOAT_SHADOW} tm-rise-a`}>
            <GlassWellIcon gradient="from-emerald-400 to-teal-500" size="lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-7 h-7"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </GlassWellIcon>
            <h2 className="text-3xl font-black text-slate-800 mt-6 mb-2">Application received</h2>
            <p className="text-base text-slate-500 max-w-md mx-auto mb-7">
              Thanks — <span className="font-black text-slate-700">{done.name}</span> is in the queue. We review submissions within <span className="font-black text-violet-600">2–3 business days</span> and email you at <span className="font-black text-slate-700">{done.email}</span>.
            </p>
            <div className={`${INSET} rounded-2xl px-5 py-4 max-w-sm mx-auto mb-8`}>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Reference</p>
              <p className="text-lg font-black text-slate-700 tabular-nums mt-0.5">{done.id}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={resetForm} className={`${BTN_PRIMARY} px-6 py-3 text-sm`}><span className="relative flex items-center gap-1.5"><PlusIcon className="w-4 h-4" />Submit another</span></button>
              <Link href="/my-trips" className={`${BTN_GHOST} px-6 py-3 text-sm`}>Back to my trips</Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">

            {/* FORM */}
            <form onSubmit={submit} className={`${GLASS} rounded-[2rem] p-6 md:p-8 space-y-8 ${FLOAT_SHADOW} tm-rise-a`} noValidate>
              {/* path toggle — owners only; travelers apply to become owners */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600 mb-2">{canPublish ? 'What are you applying for?' : 'Application type'}</p>
                {canPublish ? (
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl ${INSET} p-1.5`}>
                  {([['place', 'Publish a place', 'One flagship listing', <MapIcon key="m" className="w-5 h-5" />], ['business', 'Become a business owner', 'Manage many places', <RouteIcon key="r" className="w-5 h-5" />]] as const).map(([val, t, s, ic]) => (
                    <button key={val} type="button" onClick={() => { setPath(val); setErrors({}); }}
                      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-left transition active:scale-[.99] ${path === val ? `bg-white shadow-[0_8px_22px_-8px_rgba(124,58,237,0.5)] ring-2 ring-violet-400/70` : 'hover:bg-white/50'}`}>
                      <span className={`mt-0.5 w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${path === val ? `bg-gradient-to-br ${GRAD} text-white` : `${NEU_SM} text-slate-500`}`}>{ic}</span>
                      <span className="min-w-0"><span className="block font-black text-slate-800 text-sm leading-tight">{t}</span><span className="block text-[11px] font-semibold text-slate-500 mt-0.5">{s}</span></span>
                    </button>
                  ))}
                </div>
                ) : (
                <div className={`flex items-start gap-3 rounded-2xl ${INSET} px-4 py-3.5`}>
                  <span className={`mt-0.5 w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${GRAD} text-white flex items-center justify-center`}><RouteIcon className="w-5 h-5" /></span>
                  <span className="min-w-0"><span className="block font-black text-slate-800 text-sm leading-tight">Business owner application</span><span className="block text-[11px] font-semibold text-slate-500 mt-0.5">Publishing places unlocks once you’re an approved owner — you’ll list them from here and your owner dashboard.</span></span>
                </div>
                )}
              </div>

              {banner && <p className={`bg-rose-50/80 border border-rose-200/70 text-rose-700 rounded-2xl px-4 py-3 text-sm font-bold ${setupMissing ? '' : ''}`}>{banner}{setupMissing && <span className="block mt-1 text-[12px] font-semibold text-rose-600/90">Run the <code className="font-black">place_applications</code> migration in Supabase SQL Editor to enable submissions.</span>}</p>}

              <Section n="1" title="You & contact" sub="How we reach you about the review.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="ownerName" label="Full name" error={errors.ownerName}>
                    <input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} maxLength={100} placeholder="e.g., Ace Lagasca" className={INPUT} aria-invalid={!!errors.ownerName} />
                  </Field>
                  <Field id="email" label="Email" error={errors.email}>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} placeholder="you@example.com" className={INPUT} aria-invalid={!!errors.email} />
                  </Field>
                  <Field id="phone" label="Phone" hint="Optional — for fast clarifications.">
                    <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} placeholder="+63 …" className={INPUT} />
                  </Field>
                  <Field id="businessType" label="Business / place category" error={errors.businessType}>
                    <div className="relative">
                      <select id="businessType" value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={`${INPUT} appearance-none pr-10`} aria-invalid={!!errors.businessType}>
                        <option value="">Choose a category…</option>
                        {PLACE_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </Field>
                  {path === 'business' && (
                    <Field id="businessName" label="Business name" error={errors.companyName}>
                      <input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={140} placeholder="e.g., Seaside Hospitality Co." className={INPUT} aria-invalid={!!errors.businessName} />
                    </Field>
                  )}
                  {path === 'business' && (
                    <Field id="website" label="Website" error={errors.website}>
                      <input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} placeholder="https://…" className={INPUT} aria-invalid={!!errors.website} />
                    </Field>
                  )}
                </div>
              </Section>

              {path === 'place' ? (
              <Section n="2" title="The place" sub="What travelers will see in Discover once you’re approved.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="placeName" label={path === ('business' as Path) ? 'Flagship place name (optional)' : 'Place name'} error={path === 'place' ? errors.companyName : undefined}>
                    <input id="placeName" value={placeName} onChange={(e) => setPlaceName(e.target.value)} maxLength={120} placeholder="e.g., Sunset Ridge Viewpoint" className={INPUT} aria-invalid={path === 'place' && !!errors.companyName} />
                  </Field>
                </div>
                <Field id="description" label="Description" error={errors.description} counter={`${description.length}/500`}>
                  <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={500} placeholder="What makes it worth a stop? Vibe, highlights, best time to visit…" className={`${INPUT} resize-none`} aria-invalid={!!errors.description} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="address" label="Address" error={errors.address} hint="Street / area. Or pick a destination to the right.">
                    <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="e.g., Burgos, Ilocos Norte" className={INPUT} aria-invalid={!!errors.address} />
                  </Field>
                  {/* destination combobox */}
                  <Field id="loc" label="Link to a destination" hint={dest ? 'Connected to the catalog.' : 'Search the catalog, or leave empty.'}>
                    <div className="relative">
                      {dest ? (
                        <div className={`flex items-center gap-2 rounded-2xl ${NEU_SM} px-3 py-2.5`}>
                          <MapIcon className="w-4 h-4 shrink-0 text-violet-500" />
                          <span className="flex-1 min-w-0 font-black text-slate-800 text-sm truncate">{destLabel(dest)}</span>
                          <button type="button" onClick={() => { setDest(null); setLocQuery(''); }} aria-label="Clear destination" className="w-7 h-7 shrink-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 transition flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          <input id="loc" value={locQuery} onChange={(e) => { setLocQuery(e.target.value); setLocOpen(true); }} onFocus={() => setLocOpen(true)}
                            placeholder="Search province, city, country…" className={INPUT} autoComplete="off" />
                          {locOpen && locQuery.trim().length >= 2 && (
                            <div className={`absolute z-30 mt-1.5 w-full ${GLASS} rounded-2xl p-1.5 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 max-h-64 overflow-y-auto`}>
                              {locResults.length === 0 ? (
                                <p className="px-3 py-3 text-[12px] font-semibold text-slate-500">No catalog match — you can still submit with the address above.</p>
                              ) : locResults.map((d) => (
                                <button key={d.destination_id} type="button"
                                  onClick={() => { setDest(d); setLocQuery(''); setLocOpen(false); }}
                                  className="w-full text-left flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-violet-50/70 transition group">
                                  <MapIcon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-violet-500 transition" />
                                  <span className="min-w-0"><span className="block font-black text-slate-800 text-sm truncate">{d.destination_name}</span><span className="block text-[11px] font-semibold text-slate-500 truncate">{d.region_country ?? ''}</span></span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Field>
                </div>
                <Field id="imageUrl" label="Cover photo URL" hint="Paste a direct image link (https://…). A live preview updates on the right.">
                  <input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} maxLength={400} placeholder="https://images.example.com/place.jpg" className={INPUT} />
                </Field>
              </Section>
              ) : (
              <div className={`rounded-2xl ${INSET} px-4 py-3.5 text-[12px] font-semibold text-slate-500`}>Place publishing unlocks after your owner application is approved — you’ll list places from your owner dashboard.</div>
              )}

              <Section n="3" title="Anything else?" sub="Hours, facilities, licensing, or context for the reviewer.">
                <Field id="notes" label="Notes for our team" counter={`${notes.length}/600`}>
                  <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={600} placeholder="e.g., DTLI-accredited, open 9–6, parking for 20 cars…" className={`${INPUT} resize-none`} />
                </Field>
              </Section>

              <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-4">
                <button type="submit" disabled={busy || setupMissing} className={`${BTN_PRIMARY} px-7 py-3.5 text-base disabled:opacity-60`}>
                  <span className="relative flex items-center gap-2"><SparkleIcon className="w-5 h-5" />{busy ? 'Sending…' : path === 'business' ? 'Apply as business owner' : 'Submit place application'}</span>
                </button>
                <p className="text-[12px] font-semibold text-slate-400 max-w-xs">By submitting you confirm you’re authorized to list this place and agree to our listing guidelines.</p>
              </div>
            </form>

            {/* MY APPLICATIONS — live status (pending / approved / rejected), independent of the bell */}
            {!appStatus.loading && appStatus.rows.length > 0 && (
              <div className="lg:col-span-2">
                <div className={`${GLASS} rounded-[2rem] p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">My applications</p>
                    <span className="text-[11px] font-bold text-slate-400">{appStatus.pending.length} pending · {appStatus.approved.length} approved · {appStatus.rejected.length} rejected</span>
                  </div>
                  <div className="space-y-2.5">
                    {appStatus.rows.map((r) => {
                      const pill = r.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        : r.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                        : 'bg-amber-50 text-amber-700 border-amber-200/80';
                      return (
                        <div key={r.application_id} className={`flex items-center gap-3 rounded-2xl ${NEU_SM} px-4 py-3`}>
                          <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white ${r.kind === 'business' ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : `bg-gradient-to-br ${GRAD}`}`}>{r.kind === 'business' ? <RouteIcon className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-800 text-sm truncate">{r.company_name}</p>
                            <p className="text-[11px] font-semibold text-slate-500 truncate">{r.business_type || 'Place'} · {r.kind === 'business' ? 'Business owner' : 'Single place'}{r.submitted_at ? ` · ${r.submitted_at}` : ''}</p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${pill}`}>{r.status}</span>
                        </div>
                      );
                    })}
                  </div>
                  {appStatus.isBusinessOwner && (
                    <p className="mt-4 flex items-center gap-2 text-[12px] font-bold text-emerald-700"><RouteIcon className="w-4 h-4" /> You’re listed as a business owner — owner tools are rolling out next.</p>
                  )}
                </div>
              </div>
            )}

            {/* PREVIEW + HOW IT WORKS (sticky on desktop, below form on mobile) */}
            <div className="space-y-5 lg:sticky lg:top-24 order-first lg:order-none">
              <div className={`${GLASS} rounded-[2rem] p-5 ${FLOAT_SHADOW} tm-rise-a`} style={{ animationDelay: '80ms' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-3 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-violet-500" /> Live preview</p>
                <div className="overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-22px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10">
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100">
                    {pvValidImg ? (<img src={pvImg} alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />) : (
                      <div className="flex h-full items-center justify-center text-4xl font-black text-violet-300">{(pvTitle.charAt(0) || 'P').toUpperCase()}</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-950 backdrop-blur-sm">Pending review</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="truncate text-sm font-black text-slate-800">{pvTitle}</p>
                    <p className="truncate text-[11px] font-semibold text-slate-500">{pvType} · {pvRegion}</p>
                    {description.trim() && <p className="mt-1.5 text-[11px] font-medium text-slate-500 line-clamp-2 leading-snug">{description.trim()}</p>}
                  </div>
                </div>
                <p className="mt-3 text-[11px] font-semibold text-slate-400">This is roughly how your card will look in Discover once approved.</p>
              </div>

              <div className={`${GLASS} rounded-[2rem] p-5 tm-rise-a`} style={{ animationDelay: '140ms' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-3">How it works</p>
                <ol className="space-y-3">
                  {[
                    ['You submit', 'One form, tied to your account.'],
                    ['We review', '2–3 business days; we may email for photos or permits.'],
                    ['It goes live', canPublish ? 'Approved places appear in Discover and become bookable stops in itineraries.' : 'Approved owners can publish places that appear in Discover and become bookable stops.'],
                  ].map(([t, s], i) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className={`mt-0.5 w-7 h-7 shrink-0 rounded-full bg-gradient-to-br ${GRAD} text-xs font-black text-white flex items-center justify-center`}>{i + 1}</span>
                      <span className="min-w-0"><span className="block font-black text-slate-800 text-sm leading-tight">{t}</span><span className="block text-[12px] font-semibold text-slate-500 mt-0.5">{s}</span></span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}