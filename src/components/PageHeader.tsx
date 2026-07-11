export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="px-4 pt-6 pb-2">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
    </header>
  )
}
