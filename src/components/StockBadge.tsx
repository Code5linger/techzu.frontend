interface StockBadgeProps {
  available: number;
  total: number;
}

export function StockBadge({ available, total }: StockBadgeProps) {
  const ratio = total > 0 ? available / total : 0;
  const colorClass =
    available === 0
      ? 'bg-stock-low/20 text-stock-low border-stock-low/40'
      : ratio < 0.2
        ? 'bg-stock-mid/20 text-stock-mid border-stock-mid/40'
        : 'bg-stock-high/20 text-stock-high border-stock-high/40';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${colorClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {available === 0 ? 'Sold out' : `${available} / ${total} left`}
    </span>
  );
}
