import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Slot = {
  id: string
  start_time: string
  end_time: string
  services: { name: string }
}

type Booking = {
  id: string
  created_at: string
  status: string
  slots: {
    start_time: string
    end_time: string
    services: { name: string }
  }
}

function formatSlot(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const date = s.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = `${s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  return { date, time }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const confirmationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/login')
      } else {
        setUserEmail(data.session.user.email ?? null)
      }
    })
  }, [navigate])

  // Clean up the auto-dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (confirmationTimer.current) clearTimeout(confirmationTimer.current)
    }
  }, [])

  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true)
    const { data } = await supabase
      .from('slots')
      .select('id, start_time, end_time, services(name)')
      .eq('is_available', true)
      .order('start_time')
    setSlots((data as unknown as Slot[]) ?? [])
    setLoadingSlots(false)
  }, [])

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true)
    // RLS automatically filters to the current user's bookings — no .eq() needed
    const { data } = await supabase
      .from('bookings')
      .select('id, created_at, status, slots(start_time, end_time, services(name))')
      .order('created_at', { ascending: false })
    setBookings((data as unknown as Booking[]) ?? [])
    setLoadingBookings(false)
  }, [])

  useEffect(() => {
    fetchSlots()
    fetchBookings()
  }, [fetchSlots, fetchBookings])

  async function handleBook(slotId: string) {
    setError(null)
    setBookingSlotId(slotId)

    try {
      const { error: rpcError } = await supabase.rpc('book_slot', { p_slot_id: slotId })

      if (rpcError) {
        setError(
          rpcError.code === '23505'
            ? 'Sorry, that slot was just taken.'
            : rpcError.message,
        )
        return
      }

      // Snapshot the slot before it disappears from the list after refresh
      const slot = slots.find((s) => s.id === slotId)
      const { date, time } = slot ? formatSlot(slot.start_time, slot.end_time) : { date: '', time: '' }

      // Refresh lists and fetch AI confirmation in parallel
      const [, confirmResult] = await Promise.all([
        Promise.all([fetchSlots(), fetchBookings()]),
        slot
          ? fetch('/.netlify/functions/confirm-booking', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerName: userEmail?.split('@')[0] ?? 'Valued Customer',
                service: slot.services.name,
                time: `${date} at ${time}`,
              }),
            })
              .then((r) => r.json())
              .catch(() => null)
          : Promise.resolve(null),
      ])

      if (confirmResult?.message) {
        setConfirmation(confirmResult.message.replace(/\*\*/g, ''))
        if (confirmationTimer.current) clearTimeout(confirmationTimer.current)
        confirmationTimer.current = setTimeout(() => setConfirmation(null), 5000)
      }
    } finally {
      setBookingSlotId(null)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Sign out
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {error}
          </div>
        )}

        {confirmation && (
          <div role="status" className="mb-6 flex items-start justify-between bg-green-50 border border-green-200 rounded-md px-4 py-3">
            <p className="text-sm text-green-800">{confirmation}</p>
            <button
              onClick={() => {
                if (confirmationTimer.current) clearTimeout(confirmationTimer.current)
                setConfirmation(null)
              }}
              className="ml-4 flex-shrink-0 text-green-500 hover:text-green-700 text-xl leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Section 1: Available Slots ────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Available Slots</h2>

          {loadingSlots ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-400">No available slots right now.</p>
          ) : (
            <ul className="space-y-3">
              {slots.map((slot) => {
                const { date, time } = formatSlot(slot.start_time, slot.end_time)
                return (
                  <li
                    key={slot.id}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{slot.services.name}</p>
                      <p className="text-xs text-gray-500">{date} · {time}</p>
                    </div>
                    <button
                      onClick={() => handleBook(slot.id)}
                      disabled={bookingSlotId === slot.id}
                      className="text-sm bg-blue-600 text-white rounded-md px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {bookingSlotId === slot.id ? 'Booking…' : 'Book'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── Section 2: My Bookings ────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">My Bookings</h2>

          {loadingBookings ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-gray-400">You have no bookings yet.</p>
          ) : (
            <ul className="space-y-3">
              {bookings.map((booking) => {
                const { date, time } = formatSlot(
                  booking.slots.start_time,
                  booking.slots.end_time,
                )
                return (
                  <li
                    key={booking.id}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-3"
                  >
                    <p className="text-sm font-medium text-gray-900">{booking.slots.services.name}</p>
                    <p className="text-xs text-gray-500">{date} · {time}</p>
                    <span className="mt-1.5 inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full capitalize">
                      {booking.status}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

      </div>
    </main>
  )
}
