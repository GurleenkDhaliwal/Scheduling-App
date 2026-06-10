-- Table-level privileges required in addition to RLS policies.
-- RLS controls which rows a role sees; GRANT controls whether the
-- role can touch the table at all. Without GRANT, queries fail with
-- 42501 "permission denied" before RLS even runs.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- services: readable by everyone (no RLS, no sensitive data)
GRANT SELECT ON public.services TO anon, authenticated;

-- slots: readable by everyone (backed by RLS "public read" policy)
GRANT SELECT ON public.slots TO anon, authenticated;

-- slots: UPDATE needed by the book_slot function's SECURITY DEFINER context
-- (runs as postgres, but explicit grant is good practice)
GRANT UPDATE ON public.slots TO authenticated;

-- bookings: full DML for authenticated users (RLS restricts to own rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
