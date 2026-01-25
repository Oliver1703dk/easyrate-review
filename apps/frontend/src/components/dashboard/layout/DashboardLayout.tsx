import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-muted/40">
      <Sidebar />
      <main className="pl-64">
        <Outlet />
      </main>
    </div>
  );
}
