import { createBrowserRouter } from 'react-router';

import { DashboardPage } from '@/pages/dashboard-page';
import { ExpensesPage } from '@/pages/expenses-page';
import { IncomePage } from '@/pages/income-page';
import { AppLayout } from '@/pages/layout/app-layout';
import { AuthGuard } from '@/pages/layout/auth-guard';
import { LoginPage } from '@/pages/login-page';
import { PlanningPage } from '@/pages/planning-page';
import { ProfilePage } from '@/pages/profile-page';
import { RegisterPage } from '@/pages/register-page';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'perfil', element: <ProfilePage /> },
          { path: 'despesas', element: <ExpensesPage /> },
          { path: 'entradas', element: <IncomePage /> },
          { path: 'planejamento', element: <PlanningPage /> },
        ],
      },
    ],
  },
]);
