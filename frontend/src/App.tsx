import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ToastProvider, useToast } from '@/context/toast-context';
import { LangProvider } from '@/context/lang-context';
import { AuthPage } from '@/pages/auth';
import { CalendarPage, DashboardPage, EventDetailPage, EventsPage, NotFoundPage, ProfilePage } from '@/pages/app-pages';
import { AppShell } from '@/components/layout';
import { EventFormModal } from '@/components/event-form-modal';
import { createEvent } from '@/services/events';

function AppLayout() {
  const [formOpen, setFormOpen] = useState(false);
  const { pushToast } = useToast();

  return (
    <AppShell onCreateEvent={() => setFormOpen(true)}>
      <Outlet />
      <EventFormModal
        open={formOpen}
        mode="create"
        initialValue={null}
        onClose={() => setFormOpen(false)}
        onSubmit={async (payload) => {
          await createEvent(payload);
          pushToast({ title: 'Tạo sự kiện thành công', description: payload.title, variant: 'success' });
          setFormOpen(false);
          window.dispatchEvent(new Event('calendar:event-created'));
        }}
      />
    </AppShell>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />

              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="events/:id" element={<EventDetailPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </LangProvider>
  );
}
