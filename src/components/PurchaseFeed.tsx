import type { DropActivity } from '../types';

interface PurchaseFeedProps {
  activities: DropActivity[];
}

export function PurchaseFeed({ activities }: PurchaseFeedProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No activity yet — be the first.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {activities.map((act, i) => (
        <li
          key={`${act.username}-${act.type}-${act.timestamp}-${i}`}
          className="text-sm text-neutral-400 flex items-center justify-between gap-2"
        >
          <div>
            <span className="font-semibold text-neutral-200">{act.username}</span>{' '}
            {act.type === 'reserved' ? (
              <span className="text-amber-400/90">reserved one</span>
            ) : (
              <span className="text-emerald-400">purchased one</span>
            )}
          </div>
          <span className="text-[10px] text-neutral-500">just now</span>
        </li>
      ))}
    </ul>
  );
}
