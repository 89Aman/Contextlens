import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
}

export function EmptyState({ title, description, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-800/60 flex items-center justify-center mb-4">
        <Inbox className="w-6 h-6 text-textMuted" />
      </div>
      <h3 className="text-base font-semibold text-textPrimary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-textMuted max-w-xs">{description}</p>
      )}
      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          className="mt-4 inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primaryLight transition-colors"
        >
          {ctaLabel}
        </a>
      )}
    </div>
  )
}
