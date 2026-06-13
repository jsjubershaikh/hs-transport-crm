/** Page title + subtitle on the left, actions on the right. */
export default function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5 text-primary">
            <Icon size={22} />
          </div>
        )}
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
