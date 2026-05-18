import { Clock, AlertTriangle } from 'lucide-react';
import { useInventoryItems } from './queries';
import { isExpired, isExpiringSoon, formatDate } from '@/lib/date';

export function ExpiryWidget() {
  const { data: items = [] } = useInventoryItems();

  const expiringSoon = items.filter(
    (i) => !isExpired(i.expiry_date) && isExpiringSoon(i.expiry_date),
  );
  const expired = items.filter((i) => isExpired(i.expiry_date) && !i.deleted_at);

  function daysLeft(dateStr: string | null): number {
    if (!dateStr) return 9999;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  if (expiringSoon.length === 0 && expired.length === 0) return null;

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Expiry Alerts</h3>
      </div>

      {expired.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3 w-3" />
            Expired ({expired.length})
          </p>
          <ul className="space-y-0.5">
            {expired.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between text-sm text-red-600"
              >
                <span>{i.name}</span>
                <span className="text-xs">{formatDate(i.expiry_date ?? '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-amber-700">
            Expiring Within 90 Days ({expiringSoon.length})
          </p>
          <ul className="space-y-0.5">
            {expiringSoon
              .sort((a, b) => daysLeft(a.expiry_date) - daysLeft(b.expiry_date))
              .map((i) => {
                const days = daysLeft(i.expiry_date);
                return (
                  <li
                    key={i.id}
                    className="flex items-center justify-between text-sm text-amber-800"
                  >
                    <span>{i.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        days <= 30
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {days}d left
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}