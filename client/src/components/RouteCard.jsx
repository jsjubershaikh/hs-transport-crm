import { Phone, Bus, Users, IndianRupee, Pencil, Trash2, Eye } from 'lucide-react';
import { formatCurrency } from '../utils/format.js';

/** Route summary card for the Route Management grid. */
export default function RouteCard({ route, onEdit, onDelete, onView }) {
  return (
    <div className="card card-hover flex flex-col p-5 animate-fade-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-heading text-lg font-bold text-text-primary">{route.routeName}</h3>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {route.routeNumber}
          </span>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Bus size={22} />
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="font-medium text-text-primary">{route.driverName}</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <Phone size={14} /> {route.driverContact}
        </div>
        {route.busId?.busNumber && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Bus size={14} /> {route.busId.busNumber}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          <div>
            <p className="text-xs text-text-secondary">Students</p>
            <p className="font-heading font-bold text-text-primary">{route.studentCount ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IndianRupee size={16} className="text-success" />
          <div>
            <p className="text-xs text-text-secondary">Monthly</p>
            <p className="font-heading font-bold text-text-primary">{formatCurrency(route.totalMonthlyCollection ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="btn btn-outline btn-sm flex-1" onClick={() => onView?.(route)}>
          <Eye size={14} /> Students
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit?.(route)} title="Edit">
          <Pencil size={15} />
        </button>
        <button className="btn btn-ghost btn-sm text-danger" onClick={() => onDelete?.(route)} title="Delete">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
