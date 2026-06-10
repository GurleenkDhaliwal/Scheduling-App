# 🐾 Pet Grooming Booking App

A scheduling app for booking pet grooming appointments, with AI-generated confirmation messages powered by Claude.

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

The `bookings` table has a `UNIQUE` constraint on `slot_id`. When a customer books a grooming slot, the app calls a `SECURITY DEFINER` Postgres function (`book_slot`) that runs the `INSERT` and `UPDATE slots SET is_available = false` in a single transaction. If two owners race to book the same slot for their pet, Postgres serialises the inserts and the second one raises error `23505`, surfacing to the user as "Sorry, that slot was just taken." The `is_available` flag is a display optimisation only — the constraint is the true race guard.

## Row Level Security

RLS is enabled on `slots` and `bookings`. Policies ensure customers can only read and write their own bookings; available slots are publicly readable. Table-level `GRANT` statements are also required — RLS controls *which rows* a role can see, but Postgres checks `GRANT` first to decide whether the role can touch the table at all.

## Why the Claude API key is server-side only

`VITE_`-prefixed variables are bundled into the browser JavaScript by Vite and visible in DevTools to anyone. The `CLAUDE_API_KEY` is instead injected at deploy time into the Netlify Function environment, so it never reaches the browser. The customer only receives the finished confirmation message.

## Tradeoffs made under time pressure

- No email confirmation flow — Supabase email confirmation is disabled so signup redirects immediately to the dashboard.
- No protected route wrapper — auth is checked inside each page rather than in a shared guard component.
- `is_available` is not re-checked client-side before calling `book_slot`; stale UI slots are handled gracefully by the unique-constraint error path.

## What I'd build next

- Admin view to manage groomers, services, and available slots
- Cancellation flow that restores slot availability when a pet owner cancels
- Pet profile (name, breed, notes) attached to each booking
- Email reminders via Supabase Edge Functions
- Protected route wrapper and persistent auth state via `onAuthStateChange`
