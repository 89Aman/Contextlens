import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface text-center px-4 page-enter">
      {/* Glowing 404 */}
      <div className="relative mb-6">
        <span className="text-8xl font-bold text-primary/20 select-none">404</span>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-bold text-textPrimary">404</span>
        </div>
      </div>

      <h1 className="text-xl font-bold text-textPrimary mb-2">Page not found</h1>
      <p className="text-sm text-textMuted/50 max-w-xs mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <Link
        to="/dashboard"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black text-sm font-bold
                   hover:brightness-110 active:scale-[0.97]
                   transition-all duration-150 shadow-lg shadow-primary/20"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  )
}
