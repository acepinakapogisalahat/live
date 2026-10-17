-- ============================================================
-- 02_trip_saved_signals.sql
-- Feature: "Trip Save Signals" — notify a business owner when a
-- traveler adds one of their listings to a trip itinerary.
--
-- Privacy by design: the notification NEVER contains the
-- traveler's identity or which trip it went into. The owner only
-- learns that "a traveler" saved their place (anonymous demand
-- signal). Trip data itself is untouched and remains private.
--
-- Run this in the Supabase SQL editor on the live project.
-- Safe to re-run (CREATE OR REPLACE / IF NOT EXISTS).
-- ============================================================

-- 1) RPC the client calls right after inserting a trip_item.
--    SECURITY DEFINER lets any signed-in user raise the signal for
--    the listing they just saved, without exposing writes to the
--    notifications table itself.
CREATE OR REPLACE FUNCTION notify_listing_owner(p_listing_id VARCHAR(20))
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner   VARCHAR(20);
  v_name    VARCHAR(200);
BEGIN
  SELECT uploaded_by, name INTO v_owner, v_name
  FROM listings
  WHERE listing_id = p_listing_id;

  -- unknown listing → no-op
  IF v_owner IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.notify_user(
    v_owner,
    'listing_saved',
    'A traveler is planning your place into their trip',
    COALESCE(v_name, 'One of your listings') || ' was just added to a traveler''s itinerary. More travelers are considering your business!',
    p_listing_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION notify_listing_owner(VARCHAR) TO authenticated;

-- 2) Belt-and-suspenders DB trigger: fires even if the client forgets
--    to call the RPC (e.g., future surfaces that add trip_items).
--    Deduped within 5 minutes so an explicit RPC + trigger pair can't
--    double-notify.
CREATE OR REPLACE FUNCTION trg_trip_item_saved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner VARCHAR(20);
  v_name  VARCHAR(200);
  v_dup   BOOLEAN;
BEGIN
  IF NEW.listing_id IS NULL THEN
    RETURN NEW; -- planner notes carry no listing
  END IF;

  SELECT uploaded_by, name INTO v_owner, v_name
  FROM listings
  WHERE listing_id = NEW.listing_id;

  IF v_owner IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = v_owner
      AND type = 'listing_saved'
      AND related_id = NEW.listing_id
      AND created_at > NOW() - INTERVAL '5 minutes'
  ) INTO v_dup;

  IF NOT v_dup THEN
    PERFORM public.notify_user(
      v_owner,
      'listing_saved',
      'A traveler is planning your place into their trip',
      COALESCE(v_name, 'One of your listings') || ' was just added to a traveler''s itinerary. More travelers are considering your business!',
      NEW.listing_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trip_item_saved_signal ON trip_items;
CREATE TRIGGER trip_item_saved_signal
  AFTER INSERT ON trip_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_trip_item_saved();

-- 3) SELF-HEAL: if the live notifications table has a NOT NULL "notification_id"
--    column WITHOUT a default (which breaks any insert that doesn't supply it),
--    give it an automatic uuid default. Safe no-op if the column already has a
--    default or does not exist.
DO $$
DECLARE c information_schema.columns%ROWTYPE;
BEGIN
  SELECT * INTO c FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'notification_id';
  IF FOUND THEN
    EXECUTE format('ALTER TABLE public.notifications ALTER COLUMN %I SET DEFAULT gen_random_uuid()', c.column_name);
  END IF;
END $$;
