import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Users,
  ShoppingBag,
  Package,
  BarChart2,
  LogOut,
  Menu,
  X,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';
import { useRole } from '@/auth/useRole';
import { useUIStore } from '@/app/store/uiStore';
import { supabase } from '@/lib/supabase';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: () => number;
}

export function Layout() {
  const { user } = useAuth();
  const roles = useRole();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pendingCount = useUIStore((s) => s.pendingQueueCount);

  const navItems: NavItem[] = [
    {
      to: '/patients',
      label: 'Patients',
      icon: <Users className="h-5 w-5" />,
      roles: ['Doctor', 'Admin'],
    },
    {
      to: '/store',
      label: 'Medical Store',
      icon: <ShoppingBag className="h-5 w-5" />,
      roles: ['Pharmacist', 'Admin'],
      badge: () => pendingCount,
    },
    {
      to: '/inventory',
      label: 'Inventory',
      icon: <Package className="h-5 w-5" />,
      roles: ['Pharmacist', 'Admin'],
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: <BarChart2 className="h-5 w-5" />,
      roles: ['Admin'],
    },
  ];

  const visibleItems = navItems.filter((item) =>
    item.roles.some((r) => roles.includes(r)),
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    void navigate('/login');
  }

  const displayName =
    (user?.user_metadata?.['full_name'] as string | undefined) ??
    user?.email?.split('@')[0] ??
    'User';

  const roleLabel = roles.length > 0 ? roles[0] : '';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r bg-card md:flex">
        <SidebarContent
          items={visibleItems}
          displayName={displayName}
          roleLabel={roleLabel}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex-col border-r bg-card transition-transform duration-200 md:hidden ${
          mobileOpen ? 'flex translate-x-0' : 'flex -translate-x-full'
        }`}
      >
        <SidebarContent
          items={visibleItems}
          displayName={displayName}
          roleLabel={roleLabel}
          onLogout={handleLogout}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-semibold">MediCare</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  items: NavItem[];
  displayName: string;
  roleLabel: string;
  onLogout: () => Promise<void>;
  onNavClick?: () => void;
}

function SidebarContent({
  items,
  displayName,
  roleLabel,
  onLogout,
  onNavClick,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Activity className="h-5 w-5 text-primary" />
        <span className="font-bold tracking-tight">MediCare</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const badgeCount = item.badge?.() ?? 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavClick}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                ].join(' ')
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t p-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}