import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import NotificationItem from '../components/NotificationItem.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import { useUI } from '../context/UIContext.jsx';
import { NOTIFICATION_FILTERS } from '../utils/constants.js';

export default function Notifications() {
  const { toast } = useUI();
  const [filter, setFilter] = useState('all');

  const params = filter === 'all' ? { limit: 50 } : filter === 'unread' ? { status: 'unread', limit: 50 } : { type: filter, limit: 50 };
  const { data, loading, unreadCount, markRead, markAllRead } = useNotifications(params);

  const onMarkAll = async () => {
    await markAllRead();
    toast.success('All notifications marked read');
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount ? `${unreadCount} unread` : 'You are all caught up'}
        icon={Bell}
        actions={unreadCount > 0 && <button className="btn btn-outline btn-md" onClick={onMarkAll}><CheckCheck size={16} /> Mark All Read</button>}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {NOTIFICATION_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${filter === f.key ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-slate-100'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : data.length ? (
        <div className="space-y-2.5">
          {data.map((n) => <NotificationItem key={n._id} notification={n} onMarkRead={markRead} />)}
        </div>
      ) : (
        <div className="card"><EmptyState icon={Bell} title="No notifications" message="New activity will show up here in real time." /></div>
      )}
    </div>
  );
}
