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
    'bg-teal-900/40 text-teal-300 border border-teal-700/50',
  file:
    'bg-gray-700/50 text-gray-300 border border-gray-600/50',
  intent:
    'bg-purple-900/40 text-purple-300 border border-purple-700/50',
  'status-active':
    'bg-green-900/40 text-green-300 border border-green-700/50',
  'status-closed':
    'bg-gray-700/40 text-gray-400 border border-gray-600/50',
  redacted:
    'bg-red-900/40 text-red-300 border border-red-700/50',
  default:
    'bg-gray-700/40 text-gray-300 border border-gray-600/50',
}

interface BadgeProps {
  text: string
  variant?: BadgeVariant
  className?: string
}

export function Badge({ text, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {text}
    </span>
  )
}
