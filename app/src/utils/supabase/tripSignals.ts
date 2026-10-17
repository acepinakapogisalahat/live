// app/src/utils/supabase/tripSignals.ts
'use client';

import { createClient } from '@/utils/supabase/client';

const db = () => createClient();

export type TripSavedSignal = {
  trip_item_id: string;
  listing_id: string | null;
  trip_name: string;
  planned_date: string | null;
  start_time: string | null;
  created_at: string; // derived from trip_item_id timestamp (see SQL)
};

export type ListingDemandRow = {
  listing_id: string;
  name: string;
  saves: number;
  lastSaved: string | null;
};

// Best-effort signal for business owners: "someone added your place to their trip".
// Privacy-preserving by design — the traveler's identity is never exposed, only
// anonymous save events on the owner's own listings. Never throws.
export async function notifyListingOwner(listingId: string): Promise<void> {
  try {
    const sup = db();
    await sup.rpc('notify_listing_owner', { p_listing_id: listingId });
  } catch {
    // a signal hiccup must never fail a successful "add to trip"
  }
}

// Aggregate demand analytics for the owner dashboard (owner's own listings only).
export async function getMyListingSaves(ownerUserId: string): Promise<{
  totalSaves: number;
  perListing: ListingDemandRow[];
}> {
  const sup = db();
  const { data, error } = await sup
    .from('listings')
    .select('listing_id, name, trip_items(count)')
    .eq('uploaded_by', ownerUserId);
  if (error || !data) return { totalSaves: 0, perListing: [] };
  const perListing = ((data as any[]) ?? [])
    .map((l) => ({
      listing_id: l.listing_id as string,
      name: l.name as string,
      saves: Number(l.trip_items?.[0]?.count ?? 0),
      lastSaved: null as string | null,
    }))
    .sort((a, b) => b.saves - a.saves);
  const ids = perListing.map((p) => p.listing_id).filter(Boolean);
  if (ids.length) {
    const { data: items } = await sup
      .from('trip_items')
      .select('listing_id, trip_item_id, trips(trip_name)')
      .in('listing_id', ids);
    const latest: Record<string, number> = {};
    for (const it of (items ?? []) as any[]) {
      const ts = Date.parse(String(it.trip_item_id ?? '').replace(/^ITI-/, ''));
      if (!isNaN(ts)) latest[it.listing_id] = Math.max(latest[it.listing_id] ?? 0, ts);
    }
    for (const p of perListing) if (latest[p.listing_id]) p.lastSaved = new Date(latest[p.listing_id]).toISOString();
  }
  return { totalSaves: perListing.reduce((s, p) => s + p.saves, 0), perListing };
}

// Recent "saved to a trip" activity feed for the owner dashboard (anonymous).
export async function listTripSignalsForOwner(ownerUserId: string, limit = 20): Promise<TripSavedSignal[]> {
  const sup = db();
  const { data: mine } = await sup.from('listings').select('listing_id').eq('uploaded_by', ownerUserId);
  const ids = ((mine ?? []) as any[]).map((m) => m.listing_id);
  if (!ids.length) return [];
  const { data, error } = await sup
    .from('trip_items')
    .select('trip_item_id, listing_id, planned_date, start_time, trips(trip_name)')
    .in('listing_id', ids)
    .order('trip_item_id', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return ((data ?? []) as any[])
    .map((r) => {
      const ms = Date.parse(String(r.trip_item_id ?? '').replace(/^(ITI|NOTE)-/, ''));
      return {
        trip_item_id: r.trip_item_id,
        listing_id: r.listing_id,
        trip_name: r.trips?.trip_name ?? 'a trip',
        planned_date: r.planned_date ?? null,
        start_time: r.start_time ?? null,
        created_at: isNaN(ms) ? '' : new Date(ms).toISOString(),
      } as TripSavedSignal;
    })
    .filter((s) => !!s.created_at);
}
