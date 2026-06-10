-- Run this in the Supabase SQL Editor after schema.sql
--
-- book_slot atomically inserts a booking and marks the slot unavailable
-- in a single transaction. SECURITY DEFINER lets it UPDATE slots on behalf
-- of the caller without needing an UPDATE RLS policy on the slots table.
-- auth.uid() still resolves to the calling user's ID because it reads the
-- JWT context of the incoming request, not the function's execution role.

CREATE OR REPLACE FUNCTION book_slot(p_slot_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- The UNIQUE constraint on bookings.slot_id is the race-condition guard.
  -- If two users call this at the same instant, Postgres serialises the two
  -- INSERTs and the second one raises error 23505, which propagates back to
  -- the caller as an RPC error.
  INSERT INTO bookings (slot_id, customer_id)
  VALUES (p_slot_id, auth.uid());

  -- Only reached if the INSERT succeeded (i.e. this user won the race).
  UPDATE slots
  SET is_available = false
  WHERE id = p_slot_id;
END;
$$;

-- Grant call permission to every logged-in user
GRANT EXECUTE ON FUNCTION book_slot(UUID) TO authenticated;
