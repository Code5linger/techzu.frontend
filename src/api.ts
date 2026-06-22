import type { Drop, Reservation, User } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(body.message ?? 'Request failed', res.status);
  }
  return res.json() as Promise<T>;
}

export async function fetchDrops(): Promise<Drop[]> {
  const res = await fetch(`${API_URL}/api/drops`);
  return handleResponse<Drop[]>(res);
}

export async function reserveDrop(
  dropId: string,
  userId: string,
): Promise<Reservation> {
  const res = await fetch(`${API_URL}/api/drops/${dropId}/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await handleResponse<{ reservationId: string; dropId: string; expiresAt: string }>(res);
  return {
    id: data.reservationId,
    dropId: data.dropId,
    userId,
    status: 'active',
    expiresAt: data.expiresAt,
  };
}

export async function purchaseReservation(
  reservationId: string,
  userId: string,
): Promise<unknown> {
  const res = await fetch(
    `${API_URL}/api/reservations/${reservationId}/purchase`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    },
  );
  return handleResponse(res);
}

export async function registerUser(username: string): Promise<User> {
  const res = await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return handleResponse<User>(res);
}
