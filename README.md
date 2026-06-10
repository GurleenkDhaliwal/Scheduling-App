# Booking App

**Live:** https://monumental-mochi-7b38c6.netlify.app

**Test credentials:**
- Email: *(fill in)*
- Password: *(fill in)*

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript (Vite), Tailwind CSS |
| Auth & Database | Supabase (Postgres + Auth) |
| Serverless | Netlify Functions |
| AI Confirmation | Anthropic Claude API (`claude-sonnet-4-6`) |

## How double-booking is prevented

The `bookings` table has a `UNIQUE` constraint on `slot_id`. When a user clicks Book, the app calls a `SECURITY DEFINER` Postgres function (`book_slot`) that runs the `INSERT` and `UPDATE slots SET is_available = false` in a single transaction. If two users race to book the same slot, Postgres serialises the two inserts and the second one raises error `23505`, which surfaces to the user as "Sorry, that slot was just taken." The `is_available` flag is a display optimisation only — the constraint is the true race guard.

## Row Level Security

RLS is enabled on `slots` and `bookings`. Policies ensure authenticated users can only read and write their own bookings; slots are publicly readable. Table-level `GRANT` statements are also required — RLS controls *which rows* a role can see, but Postgres still checks `GRANT` first to decide whether the role can touch the table at all.

## Why the Claude API key is server-side only

`VITE_`-prefixed variables are bundled into the browser JavaScript by Vite and are readable in DevTools by anyone. The `CLAUDE_API_KEY` is instead injected at deploy time into the Netlify Function environment, so it never leaves the server. The browser only receives the finished confirmation message.

## Tradeoffs made under time pressure

- No email confirmation flow — Supabase email confirmation is disabled so signup redirects immediately to the dashboard.
- No protected route wrapper — auth is checked inside each page rather than in a shared guard component.
- `is_available` is not re-checked client-side before calling `book_slot`; stale UI slots are handled gracefully by the unique-constraint error path.

## What I'd build next

- Admin view to create and manage services and slots
- Cancellation flow with slot availability restored on cancel
- Email notifications via Supabase Edge Functions
- Protected route wrapper and persistent auth state via `onAuthStateChange`
