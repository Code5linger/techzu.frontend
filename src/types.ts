export interface DropActivity {
  username: string;
  type: 'reserved' | 'purchased';
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
}

export interface Drop {
  id: string;
  name: string;
  price: string;
  totalStock: number;
  availableStock: number;
  startsAt: string;
  recentActivities: DropActivity[];
}

export interface Reservation {
  id: string;
  dropId: string;
  userId: string;
  status: 'active' | 'purchased' | 'expired';
  expiresAt: string;
}

export interface StockUpdatedEvent {
  dropId: string;
}

export interface PurchaseCompletedEvent {
  dropId: string;
  username: string;
  purchasedAt: string;
}
