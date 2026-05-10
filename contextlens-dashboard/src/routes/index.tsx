import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui/Spinner'
import { LoginPage } from '../pages/LoginPage'
import { HomePage } from '../pages/HomePage'
import { ProjectPage } from '../pages/ProjectPage'
import { EpisodeDetailPage } from '../pages/EpisodeDetailPage'
import { BranchPage } from '../pages/BranchPage'
import { SettingsPage } from '../pages/SettingsPage'
import { AppShell } from '../components/layout/AppShell'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <Spinner size="md" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <HomePage />,
          },
          {
            path: ':projectId',
            element: <ProjectPage />,
          },
          {
            path: ':projectId/episodes/:episodeId',
            element: <EpisodeDetailPage />,
          },
          {
            path: ':projectId/branch/:branchName',
            element: <BranchPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
