type BadgeVariant =
  | 'branch'
  | 'file'
  | 'intent'
  | 'status-active'
  | 'status-closed'
  | 'redacted'
  | 'default'

const variantStyles: Record<BadgeVariant, string> = {
  branch:
    'bg-teal-500/10 text-teal-300/80 border border-teal-500/20',
  file:
    'bg-gray-500/10 text-gray-300/70 border border-gray-500/15 font-mono',
  intent:
    'bg-purple-500/10 text-purple-300/80 border border-purple-500/20',
  'status-active':
    'bg-emerald-500/10 text-emerald-300/80 border border-emerald-500/20',
  'status-closed':
    'bg-gray-500/10 text-gray-400/60 border border-gray-500/15',
  redacted:
    'bg-red-500/10 text-red-300/80 border border-red-500/20',
  default:
    'bg-gray-500/10 text-gray-300/60 border border-gray-500/15',
}

interface BadgeProps {
  text: string
  variant?: BadgeVariant
  className?: string
}

export function Badge({ text, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide ${variantStyles[variant]} ${className}`}
    >
      {text}
    </span>
  )
}
