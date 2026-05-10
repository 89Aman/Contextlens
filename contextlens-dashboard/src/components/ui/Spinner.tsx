interface SpinnerProps {
  size?: 'sm' | 'md'
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  const dim = size === 'sm' ? 'w-4 h-4 border-2' : 'w-8 h-8 border-2'
  return (
    <div
      className={`${dim} rounded-full border-primary border-t-transparent animate-spin`}
      role="status"
      aria-label="Loading"
    />
  )
}
