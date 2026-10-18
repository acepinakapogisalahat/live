// app/src/components/AuthBootstrap.tsx
'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

const FLAG = 'tm-profile-bootstrap';

export default function AuthBootstrap() {
  const supabase = typeof window !== 'undefined' ? createClient() : null;

  useEffect(() => {
    let cancelled = false;

    async function run(attempt = 0) {
       if (!supabase) return;
      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      // Token may still be exchanging right after an OAuth redirect — retry briefly
      if (!session && attempt < 6) {
        setTimeout(() => run(attempt + 1), 300);
        return;
      }
      if (!session?.user?.id) return; // logged out, nothing to do

      const authId = session.user.id;

      const { data: profile } = await supabase
        .from('app_users')
        .select('user_id')
        .eq('auth_user_id', authId)
        .maybeSingle();

      if (profile) return; // already a full user

      // Only attempt create+reload once per browser session (prevents loops)
      if (sessionStorage.getItem(FLAG)) return;

      const userId = `USR-${Math.random().toString(16).slice(2, 10)}`;
      const name =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split('@')[0] ||
        'TravelMate User';

      const { error } = await supabase.from('app_users').insert({
        user_id: userId,
        name,
        password_hash: 'MANAGED_BY_SUPABASE_AUTH',
        email: session.user.email || '',
        sex: 'Other',
        current_location: null,
        auth_user_id: authId,
      });

      sessionStorage.setItem(FLAG, '1');
      if (error) {
        console.error('[AuthBootstrap] profile create failed:', error.message);
        return;
      }

      // Reload once so useRole / ReviewForm / trip+booking all re-resolve
      window.location.reload();
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}