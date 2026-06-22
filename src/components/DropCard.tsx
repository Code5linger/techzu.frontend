import { useState } from 'react';
import type { Drop } from '../types';
import { reserveDrop, purchaseReservation, ApiError } from '../api';
import { StockBadge } from './StockBadge';
import { PurchaseFeed } from './PurchaseFeed';
import { useCountdown } from '../hooks/useCountdown';

interface DropCardProps {
  drop: Drop;
  userId: string;
}

type CardState =
  | 'idle'
  | 'reserving'
  | 'reserved'
  | 'purchasing'
  | 'purchased'
  | 'expired';

export function DropCard({ drop, userId }: DropCardProps) {
  const [state, setState] = useState<CardState>('idle');
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const secondsLeft = useCountdown(state === 'reserved' ? expiresAt : null);

  if (state === 'reserved' && secondsLeft === 0 && expiresAt) {
    setState('expired');
  }

  async function handleReserve() {
    setError(null);
    setState('reserving');
    try {
      const reservation = await reserveDrop(drop.id, userId);
      setReservationId(reservation.id);
      setExpiresAt(reservation.expiresAt);
      setState('reserved');
    } catch (err) {
      setState('idle');
      if (err instanceof ApiError && err.status === 409) {
        setError('Just missed it — sold out.');
      } else {
        setError('Could not reserve. Try again.');
      }
    }
  }

  async function handlePurchase() {
    if (!reservationId) return;
    setError(null);
    setState('purchasing');
    try {
      await purchaseReservation(reservationId, userId);
      setState('purchased');
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        setState('expired');
        setError('Reservation expired before purchase completed.');
      } else {
        setState('reserved');
        setError('Purchase failed. Try again.');
      }
    }
  }

  function handleReset() {
    setState('idle');
    setReservationId(null);
    setExpiresAt(null);
    setError(null);
  }

  const soldOut = drop.availableStock === 0 && state === 'idle';

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-100">
            {drop.name}
          </h3>
          <p className="mt-1 text-2xl font-bold text-neutral-50">
            ${drop.price}
          </p>
        </div>
        <StockBadge available={drop.availableStock} total={drop.totalStock} />
      </div>

      <div className="mt-5">
        {state === 'idle' && (
          <button
            onClick={handleReserve}
            disabled={soldOut}
            className="w-full rounded-xl bg-neutral-50 px-4 py-2.5 font-medium text-neutral-900 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            {soldOut ? 'Sold out' : 'Reserve'}
          </button>
        )}

        {state === 'reserving' && (
          <button
            disabled
            className="w-full rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-neutral-400"
          >
            Reserving…
          </button>
        )}

        {state === 'reserved' && (
          <div className="space-y-2">
            <p className="text-center text-sm text-amber-400">
              Reserved! Complete purchase in {secondsLeft}s
            </p>
            <button
              onClick={handlePurchase}
              className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-neutral-950 transition hover:bg-emerald-400"
            >
              Complete purchase
            </button>
          </div>
        )}

        {state === 'purchasing' && (
          <button
            disabled
            className="w-full rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-neutral-400"
          >
            Completing purchase…
          </button>
        )}

        {state === 'purchased' && (
          <div className="rounded-xl bg-emerald-500/15 px-4 py-2.5 text-center font-medium text-emerald-400">
            Purchased
          </div>
        )}

        {state === 'expired' && (
          <div className="space-y-2">
            <p className="text-center text-sm text-red-400">
              Reservation expired.
            </p>
            <button
              onClick={handleReset}
              className="w-full rounded-xl border border-neutral-700 px-4 py-2.5 font-medium text-neutral-300 transition hover:bg-neutral-800"
            >
              Try again
            </button>
          </div>
        )}

        {error && (
          <p className="mt-2 text-center text-sm text-red-400">{error}</p>
        )}
      </div>

      <div className="mt-5 border-t border-neutral-800 pt-4">
        <PurchaseFeed activities={drop.recentActivities} />
      </div>
    </div>
  );
}
