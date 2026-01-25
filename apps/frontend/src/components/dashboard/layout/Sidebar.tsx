import { Link, useLocation } from 'react-router-dom';
import { BarChart3, MessageSquare, Plug, Settings, LogOut } from 'lucide-react';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { cn } from '@easyrate/ui/lib';
import { useAuth } from '../../../contexts/AuthContext';

const navItems = [
  { path: '/dashboard', label: DASHBOARD_TEXT.nav.overview, icon: BarChart3 },
  { path: '/dashboard/reviews', label: DASHBOARD_TEXT.nav.reviews, icon: MessageSquare },
  { path: '/dashboard/integrations', label: DASHBOARD_TEXT.nav.integrations, icon: Plug },
  { path: '/dashboard/settings', label: DASHBOARD_TEXT.nav.settings, icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { user, business, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-lg font-bold">
          E
        </div>
        <span className="text-xl font-semibold">easyrate</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-700 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user?.name || 'Bruger'}</p>
            <p className="truncate text-xs text-slate-400">{business?.name}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          {DASHBOARD_TEXT.nav.logout}
        </button>
      </div>
    </aside>
  );
}
