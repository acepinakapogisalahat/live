// app/src/utils/supabase/admin.ts
'use client';

import { createClient } from '@/utils/supabase/client';

const db = () => createClient();

async function assertSuper(sup: ReturnType<typeof createClient>) {
  const { data: sess } = await sup.auth.getSession();
  const uid = sess?.session?.user?.id ?? null;
  if (!uid) throw new Error('Not signed in.');
  const { data } = await sup.from('administrators').select('admin_id').eq('auth_user_id', uid).maybeSingle();
  if (!data) throw new Error('Superuser access required.');
  return data.admin_id as string;
}

async function audit(sup: ReturnType<typeof createClient>, action: string, table: string | null, id: string | null, detail?: any) {
  try { await sup.from('admin_audit_logs').insert({ action, target_table: table, target_id: id, detail: detail ?? null }); } catch {}
}

// best-effort user notification; never throws, so a notify hiccup can't fail a successful admin action
async function notify(sup: ReturnType<typeof createClient>, userId: string | null | undefined, type: string, title: string, message: string, related?: string | null) {
  if (!userId) return;
  try { await sup.rpc('notify_user', { p_user_id: userId, p_type: type, p_title: title, p_message: message, p_related: related ?? null }); } catch {}
}

/* ─────────────── Users ─────────────── */
// LIVE schema: app_users has name / email / sex / current_location / status (NOT first_name/last_name/home_city/location).
// We alias current_location -> location so the rest of the layer + UI stay stable.
export type AdminUser = {
  user_id: string; name: string | null; email: string | null;
  sex: string | null; location: string | null; status: string;
  listings: number; reviews: number;
};

export async function listUsers(search = ''): Promise<AdminUser[]> {
  const sup = db(); await assertSuper(sup);
  const [{ data: users }, { data: listings }, { data: reviews }] = await Promise.all([
    sup.from('app_users').select('user_id, name, email, sex, location:current_location, status'),
    sup.from('listings').select('uploaded_by'),
    sup.from('reviews').select('user_id'),
  ]);
  const lc: Record<string, number> = {}; (listings ?? []).forEach((l: any) => { lc[l.uploaded_by] = (lc[l.uploaded_by] ?? 0) + 1; });
  const rc: Record<string, number> = {}; (reviews ?? []).forEach((r: any) => { rc[r.user_id] = (rc[r.user_id] ?? 0) + 1; });
  const q = search.trim().toLowerCase();
  return ((users ?? []) as any[])
    .filter(u => !q || `${u.name ?? ''} ${u.email ?? ''} ${u.user_id}`.toLowerCase().includes(q))
    .map(u => ({ ...u, status: u.status ?? 'active', listings: lc[u.user_id] ?? 0, reviews: rc[u.user_id] ?? 0 }))
    .sort((a, b) => (a.status !== 'active' ? -1 : 0) - (b.status !== 'active' ? -1 : 0) || String(a.name).localeCompare(String(b.name)));
}

export async function setUserStatus(userId: string, status: 'active' | 'suspended' | 'banned', reason = '') {
  const sup = db(); await assertSuper(sup);
  const { error } = await sup.from('app_users').update({ status }).eq('user_id', userId);
  if (error) throw error;
  await audit(sup, `user.${status}`, 'app_users', userId, { reason });
  const meta = status === 'banned'
    ? { t: 'account_banned', title: 'Your account has been banned', msg: `Your TravelMate account was banned.${reason ? ` Reason: ${reason}` : ''} Contact support if you believe this is a mistake.` }
    : status === 'suspended'
    ? { t: 'account_suspended', title: 'Your account has been suspended', msg: `Your TravelMate account was suspended.${reason ? ` Reason: ${reason}` : ''} Some features are paused until it is restored.` }
    : { t: 'account_reinstated', title: 'Your account is active again', msg: 'Your TravelMate account has been reinstated. Welcome back!' };
  await notify(sup, userId, meta.t, meta.title, meta.msg, null);
}

/* ─────────────── Listings ─────────────── */
export type AdminListing = {
  listing_id: string; name: string; listing_type: string;
  is_visible: boolean; moderation_status: string; average_rating: number | null;
  owner_name: string | null; destination: string | null; uploaded_by: string | null;
  image_url: string | null;
};

export async function listListings(search = '', type = 'All'): Promise<AdminListing[]> {
  const sup = db(); await assertSuper(sup);
  const [{ data: rows }, { data: dests }, { data: owners }] = await Promise.all([
    sup.from('listings').select('listing_id, name, listing_type, is_visible, moderation_status, average_rating, uploaded_by, destination_id, image_url'),
    sup.from('destinations').select('destination_id, destination_name, region_country'),
    sup.from('app_users').select('user_id, name'),
  ]);
  const dMap: Record<string, string> = {}; (dests ?? []).forEach((d: any) => { dMap[d.destination_id] = `${d.destination_name}, ${d.region_country}`; });
  const oMap: Record<string, string> = {}; (owners ?? []).forEach((o: any) => { oMap[o.user_id] = o.name; });
  const q = search.trim().toLowerCase();
  return ((rows ?? []) as any[])
    .filter(r => (type === 'All' || r.listing_type === type))
    .filter(r => !q || `${r.name} ${r.listing_id}`.toLowerCase().includes(q))
    .map(r => ({
      listing_id: r.listing_id, name: r.name, listing_type: r.listing_type,
      is_visible: r.is_visible ?? true, moderation_status: r.moderation_status ?? 'approved',
      average_rating: r.average_rating, owner_name: oMap[r.uploaded_by] ?? null,
      destination: dMap[r.destination_id] ?? null, uploaded_by: r.uploaded_by, image_url: r.image_url ?? null,
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export async function setListingModeration(id: string, patch: { is_visible?: boolean; moderation_status?: string }) {
  const sup = db(); await assertSuper(sup);
  const { error } = await sup.from('listings').update(patch).eq('listing_id', id);
  if (error) throw error;
  await audit(sup, 'listing.moderate', 'listings', id, patch);
}

// Soft remove = unpublish + mark removed (reversible, keeps data + FK integrity)
export async function softRemoveListing(id: string, reason = '') {
  const sup = db(); await assertSuper(sup);
  const { data: l } = await sup.from('listings').select('uploaded_by, name').eq('listing_id', id).maybeSingle();
  const { error } = await sup.from('listings').update({ is_visible: false, moderation_status: 'removed' }).eq('listing_id', id);
  if (error) throw error;
  await audit(sup, 'listing.remove_soft', 'listings', id, { reason });
  await notify(sup, l?.uploaded_by, 'listing_hidden', 'One of your listings was taken offline',
    `“${l?.name ?? 'A listing'}” was hidden from search by a moderator.${reason ? ` Reason: ${reason}` : ''} It is not deleted — contact the platform to restore it.`, id);
}

// Hard delete = admin power; clears EVERY dependent first so no FK can block the parent delete.
// Children of listings (verified via pg_constraint): photos, trip_items, reviews, recommendations, bookings.
// attractions/hotels/restaurants subtypes join on their own id (= listing_id) and CASCADE automatically,
// so they need no explicit delete here. If query B ever reveals another NON-cascade child, add its step.
export async function hardDeleteListing(id: string) {
  const sup = db(); await assertSuper(sup);
  const { data: l } = await sup.from('listings').select('uploaded_by, name').eq('listing_id', id).maybeSingle();

  // Count reviews BEFORE wiping them (audit trail + notify copy).
  const { count: revCount } = await sup.from('reviews').select('review_id', { count: 'exact', head: true }).eq('listing_id', id);

  // Each child delete is checked, so a future missing dependent fails with an actionable
  // message naming the table instead of the cryptic generic FK banner.
  const step = async (table: string, q: any) => {
    const { error } = await q;
    if (error) throw new Error(`Could not clear ${table} for listing ${id}: ${error.message}`);
  };
  await step('photos',          sup.from('photos').delete().eq('listing_id', id));
  await step('trip_items',      sup.from('trip_items').delete().eq('listing_id', id));
  await step('reviews',         sup.from('reviews').delete().eq('listing_id', id));
  await step('recommendations', sup.from('recommendations').delete().eq('listing_id', id));
  await step('bookings',        sup.from('bookings').delete().eq('listing_id', id));

  const { error } = await sup.from('listings').delete().eq('listing_id', id);
  if (error) throw error;

  await audit(sup, 'listing.delete_hard', 'listings', id, { reviews_removed: revCount ?? 0 });
  await notify(sup, l?.uploaded_by, 'listing_removed', 'One of your listings was permanently removed',
    `“${l?.name ?? 'A listing'}” and all its photos, reviews, recommendations, bookings and trip-items were deleted by a moderator. This action cannot be undone.`, null);
}

/* ─────────────── Reviews / moderation ─────────────── */
export type AdminReview = {
  review_id: string; rating: number; title: string | null; review_text: string | null;
  flagged: boolean; flagged_reason: string | null; submission_date: string | null;
  user_name: string | null; listing_name: string | null; listing_id: string;
};

export async function listReviews(filter: 'all' | 'flagged' | 'critical' = 'all', search = ''): Promise<AdminReview[]> {
  const sup = db(); await assertSuper(sup);
  const [{ data: rows }, { data: users }, { data: listings }] = await Promise.all([
    sup.from('reviews').select('review_id, rating, title, review_text, flagged, flagged_reason, submission_date, user_id, listing_id'),
    sup.from('app_users').select('user_id, name'),
    sup.from('listings').select('listing_id, name'),
  ]);
  const uMap: Record<string, string> = {}; (users ?? []).forEach((u: any) => { uMap[u.user_id] = u.name; });
  const lMap: Record<string, string> = {}; (listings ?? []).forEach((l: any) => { lMap[l.listing_id] = l.name; });
  const q = search.trim().toLowerCase();
  return ((rows ?? []) as any[])
    .filter(r => filter === 'all' ? true : filter === 'flagged' ? !!r.flagged : r.rating <= 2)
    .filter(r => !q || `${r.title ?? ''} ${r.review_text ?? ''}`.toLowerCase().includes(q))
    .map(r => ({ ...r, flagged: !!r.flagged, user_name: uMap[r.user_id] ?? 'Unknown', listing_name: lMap[r.listing_id] ?? r.listing_id }))
    .sort((a, b) => String(b.submission_date).localeCompare(String(a.submission_date)));
}

export async function flagReview(id: string, flagged: boolean, reason = '') {
  const sup = db(); await assertSuper(sup);
  const { data: rv } = await sup.from('reviews').select('user_id, listing_id').eq('review_id', id).maybeSingle();
  let ln: string | null = null;
  if (rv?.listing_id) { const { data: l } = await sup.from('listings').select('name').eq('listing_id', rv.listing_id).maybeSingle(); ln = l?.name ?? null; }
  const { error } = await sup.from('reviews').update({ flagged, flagged_reason: flagged ? reason : null, flagged_at: flagged ? new Date().toISOString() : null }).eq('review_id', id);
  if (error) throw error;
  await audit(sup, flagged ? 'review.flag' : 'review.unflag', 'reviews', id, { reason });
  await notify(sup, rv?.user_id, flagged ? 'review_flagged' : 'review_unflag',
    flagged ? 'Your review was flagged for review' : 'Your review flag was cleared',
    flagged ? `A moderator flagged your review on “${ln ?? 'a listing'}”.${reason ? ` Reason: ${reason}` : ''}` : `Your review on “${ln ?? 'a listing'}” is no longer flagged.`,
    rv?.listing_id ?? null);
}

export async function deleteReview(id: string, listingId: string) {
  const sup = db(); await assertSuper(sup);
  const { error } = await sup.from('reviews').delete().eq('review_id', id);
  if (error) throw error;
  try { await sup.rpc('recalc_listing_rating', { p_listing_id: listingId }); } catch {}
  await audit(sup, 'review.delete', 'reviews', id, { listing_id: listingId });
}

/* ─────────────── Business applications ─────────────── */
// LIVE schema: business_applications has submitted_at / reviewed_by(FK->administrators) / reviewed_at(DATE).
// There is NO review_note column — the optional note is stored in the audit log detail instead.
export type AdminApplication = {
  application_id: string; user_id: string; status: string | null;
  user_name: string | null; company_name: string | null; business_type: string | null;
  contact_email: string | null; pitch: string | null; submitted_at: string | null; raw: any;
};

export async function listApplications(filter: 'all' | 'pending' | 'approved' | 'rejected' = 'pending'): Promise<AdminApplication[]> {
  const sup = db(); await assertSuper(sup);
  const [{ data: rows }, { data: users }] = await Promise.all([
    sup.from('business_applications').select('*'),
    sup.from('app_users').select('user_id, name'),
  ]);
  const uMap: Record<string, string> = {}; (users ?? []).forEach((u: any) => { uMap[u.user_id] = u.name; });
  return ((rows ?? []) as any[])
    .filter(a => filter === 'all' ? true : (a.status ?? 'pending') === filter)
    .map(a => ({
      application_id: a.application_id, user_id: a.user_id, status: a.status ?? 'pending',
      user_name: uMap[a.user_id] ?? 'Unknown', company_name: a.company_name ?? null,
      business_type: a.business_type ?? null, contact_email: a.contact_email ?? null,
      pitch: a.pitch ?? null, submitted_at: a.submitted_at ?? null, raw: a,
    }))
    .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
}

// Move-4 ready: stamps the reviewing admin (reviewed_by FK) + date, flips status, logs the note.
export async function decideApplication(id: string, decision: 'approved' | 'rejected', note = '') {
  const sup = db(); const adminId = await assertSuper(sup);
  const { data: app } = await sup.from('business_applications').select('user_id, company_name').eq('application_id', id).maybeSingle();
  const today = new Date().toISOString().slice(0, 10); // reviewed_at is DATE
  const { error } = await sup.from('business_applications')
    .update({ status: decision, reviewed_by: adminId, reviewed_at: today })
    .eq('application_id', id);
  if (error) throw error;
  await audit(sup, `application.${decision}`, 'business_applications', id, { note: note || null });
  await notify(sup, app?.user_id, `application_${decision}`,
    decision === 'approved' ? 'Your publisher application was approved' : 'Your publisher application was not approved',
    decision === 'approved'
      ? `Great news — your application for “${app?.company_name ?? 'your business'}” was approved.${note ? ` Note: ${note}` : ''}`
      : `Your application for “${app?.company_name ?? 'your business'}” was not approved at this time.${note ? ` Reason: ${note}` : ''}`,
    id);
}

/* ─────────────── Destinations ─────────────── */
export async function listDestinations(search = '') {
  const sup = db(); await assertSuper(sup);
  const { data } = await sup.from('destinations').select('*');
  const q = search.trim().toLowerCase();
  return ((data ?? []) as any[]).filter(d => !q || `${d.destination_name} ${d.region_country} ${d.destination_id}`.toLowerCase().includes(q));
}

export async function createDestination(name: string, region: string) {
  const sup = db(); await assertSuper(sup);
  const { data: all } = await sup.from('destinations').select('destination_id');
  const nums = ((all ?? []) as any[]).map(r => parseInt(String(r.destination_id).replace('DEST-', ''), 10)).filter(n => !isNaN(n));
  const id = 'DEST-' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
  const { error } = await sup.from('destinations').insert({ destination_id: id, destination_name: name.trim(), region_country: region.trim() });
  if (error) throw error;
  await audit(sup, 'destination.create', 'destinations', id, { name, region });
  return id;
}

export async function updateDestination(id: string, name: string, region: string) {
  const sup = db(); await assertSuper(sup);
  const { error } = await sup.from('destinations').update({ destination_name: name.trim(), region_country: region.trim() }).eq('destination_id', id);
  if (error) throw error;
  await audit(sup, 'destination.update', 'destinations', id, { name, region });
}

export async function deleteDestination(id: string) {
  const sup = db(); await assertSuper(sup);
  const { count } = await sup.from('listings').select('listing_id', { count: 'exact', head: true }).eq('destination_id', id);
  if ((count ?? 0) > 0) throw new Error(`Cannot delete: ${count} listing(s) still reference ${id}. Reassign or remove them first.`);
  const { error } = await sup.from('destinations').delete().eq('destination_id', id);
  if (error) throw error;
  await audit(sup, 'destination.delete', 'destinations', id);
}

/* ─────────────── Audit trail ─────────────── */
export async function getAuditLogs(limit = 100) {
  const sup = db(); await assertSuper(sup);
  const [{ data: logs }, { data: admins }] = await Promise.all([
    sup.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(limit),
    sup.from('administrators').select('admin_id, full_name, email'),
  ]);
  const aMap: Record<string, string> = {}; (admins ?? []).forEach((a: any) => { aMap[a.admin_id] = a.full_name || a.email || a.admin_id; });
  return ((logs ?? []) as any[]).map(l => ({ ...l, admin_name: l.admin_id ? (aMap[l.admin_id] ?? l.admin_id) : 'System' }));
}