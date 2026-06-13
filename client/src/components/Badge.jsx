/**
 * Status badge. Variants map to the design-system badge classes.
 * Usage: <Badge variant="paid">Paid</Badge> or <Badge variant="paid" />
 */
const LABELS = {
  paid: 'Paid',
  partial: 'Partial',
  pending: 'Pending',
  active: 'Active',
  inactive: 'Inactive',
};

export default function Badge({ variant = 'pending', children, icon: Icon, className = '' }) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {Icon && <Icon size={12} />}
      {children || LABELS[variant] || variant}
    </span>
  );
}
