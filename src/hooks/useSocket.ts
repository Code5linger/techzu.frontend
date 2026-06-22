import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { StockUpdatedEvent, PurchaseCompletedEvent } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

interface UseSocketOptions {
  dropIds: string[];
  onStockUpdated: (event: StockUpdatedEvent) => void;
  onPurchaseCompleted: (event: PurchaseCompletedEvent) => void;
}

export function useSocket({
  dropIds,
  onStockUpdated,
  onPurchaseCompleted,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('stock:updated', onStockUpdated);
    socket.on('purchase:completed', onPurchaseCompleted);

    return () => {
      socket.off('stock:updated', onStockUpdated);
      socket.off('purchase:completed', onPurchaseCompleted);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    dropIds.forEach((id) => socket.emit('joinDrop', id));

    return () => {
      dropIds.forEach((id) => socket.emit('leaveDrop', id));
    };
  }, [dropIds]);
}
