-- Run this in the Supabase SQL Editor after schema.sql
--
-- cancel_booking atomically deletes the booking and restores slot availability.
-- SECURITY DEFINER lets it UPDATE slots on behalf of the caller without needing
-- an UPDATE RLS policy on the slots table. The explicit ownership check inside
-- the function provides defence-in-depth on top of the bookings DELETE RLS policy.

CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id UUID;
BEGIN
  -- Verify ownership and retrieve the slot id in one step
  SELECT slot_id INTO v_slot_id
  FROM bookings
  WHERE id = p_booking_id AND customer_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or does not belong to the current user';
  END IF;

  DELETE FROM bookings WHERE id = p_booking_id;

  UPDATE slots SET is_available = true WHERE id = v_slot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_booking(UUID) TO authenticated;
