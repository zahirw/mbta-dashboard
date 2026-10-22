import { NavLink, Outlet } from 'react-router'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-secondary text-primary' : 'text-secondary hover:bg-primary-600'
  }`

export default function Layout() {
  return (
    <div className="min-h-screen bg-secondary text-primary">
      <header className="border-b border-primary-900 bg-primary text-secondary">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 p-4">
          <span className="mr-4 text-lg font-bold">MBTA</span>
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
