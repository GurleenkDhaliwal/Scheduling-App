-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE services (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  duration_minutes INTEGER     NOT NULL
);

CREATE TABLE slots (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id   UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE bookings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id     UUID        NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
  customer_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status      TEXT        NOT NULL DEFAULT 'confirmed'
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can read slots
CREATE POLICY "slots: public read"
  ON slots
  FOR SELECT
  USING (true);

-- Authenticated users can only read their own bookings
CREATE POLICY "bookings: owner read"
  ON bookings
  FOR SELECT
  USING (auth.uid() = customer_id);

-- Authenticated users can only insert bookings for themselves
CREATE POLICY "bookings: owner insert"
  ON bookings
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Authenticated users can only update their own bookings
CREATE POLICY "bookings: owner update"
  ON bookings
  FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Authenticated users can only delete their own bookings
CREATE POLICY "bookings: owner delete"
  ON bookings
  FOR DELETE
  USING (auth.uid() = customer_id);

-- ============================================================
-- GRANTS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT ON public.slots   TO anon, authenticated;
GRANT UPDATE ON public.slots   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- 1. Insert the Pet Grooming service
INSERT INTO services (name, duration_minutes)
VALUES ('Pet Grooming', 60);

-- 2. Insert 5 available slots for tomorrow at different times
--    Slots are at 09:00, 10:00, 11:00, 13:00, 14:00
INSERT INTO slots (service_id, start_time, end_time, is_available)
SELECT
  s.id,
  (CURRENT_DATE + 1 + slot_time)          AS start_time,
  (CURRENT_DATE + 1 + slot_time + '1 hour'::INTERVAL) AS end_time,
  TRUE
FROM services s,
  UNNEST(ARRAY[
    '09:00'::TIME,
    '10:00'::TIME,
    '11:00'::TIME,
    '13:00'::TIME,
    '14:00'::TIME
  ]) AS slot_time
WHERE s.name = 'Pet Grooming';
