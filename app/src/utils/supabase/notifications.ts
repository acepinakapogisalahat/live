// app/src/utils/supabase/notifications.ts
'use client';

import { createClient } from '@/utils/supabase/client';

const db = () => createClient();

export type Notif = {
  notification_id: string; user_id: string; type: string;
  title: string; message: string; related_id: string | null;
  is_read: boolean; created_at: string;
};
export type NotifMeta = { grad: string; label: string; tone: 'rose' | 'amber' | 'emerald' | 'sky' | 'violet' | 'slate' };

export const NOTIF_META: Record<string, NotifMeta> = {
  review_flagged:      { grad: 'from-amber-400 to-orange-500',  label: 'Review flagged',     tone: 'amber' },
  review_unflag:       { grad: 'from-emerald-400 to-teal-500',  label: 'Review cleared',     tone: 'emerald' },
  review_removed:      { grad: 'from-rose-500 to-red-500',      label: 'Review removed',     tone: 'rose' },
  listing_saved:       { grad: 'from-fuchsia-400 to-pink-500',  label: 'Saved to a trip',    tone: 'violet' },
  listing_hidden:      { grad: 'from-sky-400 to-indigo-500',    label: 'Listing hidden',     tone: 'sky' },
  listing_removed:     { grad: 'from-rose-500 to-red-500',      label: 'Listing removed',    tone: 'rose' },
  account_suspended:   { grad: 'from-amber-400 to-orange-500',  label: 'Account suspended',  tone: 'amber' },
  account_banned:      { grad: 'from-rose-500 to-red-500',      label: 'Account banned',     tone: 'rose' },
  account_reinstated:  { grad: 'from-emerald-400 to-teal-500',  label: 'Account restored',   tone: 'emerald' },
  application_approved:{ grad: 'from-emerald-400 to-teal-500',  label: 'Application approved', tone: 'emerald' },
  application_rejected:{ grad: 'from-rose-500 to-red-500',      label: 'Application declined', tone: 'rose' },
};
export const NOTIF_DEFAULT: NotifMeta = { grad: 'from-slate-400 to-slate-500', label: 'Update', tone: 'slate' };
export function metaFor(type: string): NotifMeta { return NOTIF_META[type] ?? NOTIF_DEFAULT; }

export function notifHref(n: Notif): string {
  if (n.type === 'listing_saved') return n.related_id ? `/listing/${n.related_id}` : '/owner';
  if (n.type.startsWith('review_') || n.type.startsWith('listing_')) return n.related_id ? `/listing/${n.related_id}` : '/profile';
  if (n.type.startsWith('application_')) return '/business';
  if (n.type.startsWith('account_')) return '/profile';
  return '/profile';
}

// auth uid -> app_users.user_id (same resolution the homepage/navbar already use)
export async function getCurrentUid(): Promise<string | null> {
  const sup = db();
  const { data: s } = await sup.auth.getSession();
  const auth = s?.session?.user?.id ?? null;
  if (!auth) return null;
  const { data: p } = await sup.from('app_users').select('user_id').eq('auth_user_id', auth).maybeSingle();
  return p?.user_id ?? null;
}

export async function listNotifications(limit = 30): Promise<Notif[]> {
  const sup = db(); const uid = await getCurrentUid(); if (!uid) return [];
  const { data, error } = await sup.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Notif[];
}
export async function unreadCount(): Promise<number> {
  const sup = db(); const uid = await getCurrentUid(); if (!uid) return 0;
  const { count, error } = await sup.from('notifications').select('notification_id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}
export async function markRead(id: string) {
  const sup = db(); await sup.from('notifications').update({ is_read: true }).eq('notification_id', id); // RLS scopes to owner
}
export async function markAllRead() {
  const sup = db(); const uid = await getCurrentUid(); if (!uid) return;
  await sup.from('notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false);
}