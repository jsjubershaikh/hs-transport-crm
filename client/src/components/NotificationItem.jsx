import { Wallet, UserPlus, IndianRupee, Route as RouteIcon, Bell, Check } from 'lucide-react';
import { timeAgo } from '../utils/format.js';

const TYPE_META = {
  fee_pending: { icon: Wallet, color: 'bg-danger/10 text-danger' },
  payment_received: { icon: IndianRupee, color: 'bg-success/10 text-success' },
  student_added: { icon: UserPlus, color: 'bg-blue-500/10 text-blue-600' },
  route_change: { icon: RouteIcon, color: 'bg-accent/10 text-accent' },
  system: { icon: Bell, color: 'bg-primary/10 text-primary' },
};

/** Single notification row with a color-coded type icon and "time ago". */
export default function NotificationItem({ notification, onMarkRead }) {
  const meta = TYPE_META[notification.type] || TYPE_META.system;
  const Icon = meta.icon;
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
        notification.isRead ? 'border-border bg-white' : 'border-accent/30 bg-accent/[0.04]'
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary">{notification.message}</p>
        <p className="mt-0.5 text-xs text-text-secondary">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.isRead && (
        <button
          onClick={() => onMarkRead?.(notification._id)}
          className="btn btn-ghost btn-sm shrink-0 text-xs"
          title="Mark as read"
        >
          <Check size={14} /> Mark read
        </button>
      )}
    </div>
  );
}
