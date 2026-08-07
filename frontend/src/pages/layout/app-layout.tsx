import { Outlet } from 'react-router';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { LegacyFinanceNotice } from '@/components/layout/legacy-finance-notice';

export function AppLayout() {
  return (
    <div className='flex min-h-screen bg-background text-foreground'>
      <AppSidebar />
      <div className='flex min-w-0 flex-1 flex-col'>
        <AppTopbar />
        <main className='relative flex-1 px-6 py-6 md:px-8'>
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,184,0,0.04),transparent_35%)]' />
          <div className='relative w-full'>
            <LegacyFinanceNotice />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
