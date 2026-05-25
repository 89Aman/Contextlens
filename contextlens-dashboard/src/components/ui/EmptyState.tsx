import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
}

export function EmptyState({ title, description, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fadeIn">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center mb-5">
        <Inbox className="w-6 h-6 text-primary/60" />
      </div>
      <h3 className="text-base font-semibold text-textPrimary mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-textMuted max-w-sm leading-relaxed">{description}</p>
      )}
      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center px-5 py-2.5 rounded-lg bg-primary text-black text-sm font-bold
                     hover:brightness-110 active:scale-[0.97]
                     transition-all duration-150 shadow-lg shadow-primary/20"
        >
          {ctaLabel}
        </a>
      )}
    </div>
  )
}
