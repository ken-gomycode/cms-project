import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { ProtectedRoute } from '@/components/guards';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { ToastContainer } from '@/components/ui';
import { UserRole } from '@/types';

// Admin pages
import {
  Dashboard,
  ContentList,
  ContentEditor,
  MediaLibrary,
  CommentModeration,
  Categories,
  Tags,
  SeoManagement,
  Users,
  Analytics,
  Profile,
} from '@/pages/admin';

// Public pages
import { Home, ContentDetail, Login, Register } from '@/pages/public';

function App() {
  const { initialize } = useAuthStore();

  // Initialize auth store from localStorage on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/content/:slug" element={<ContentDetail />} />
          </Route>

          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="content" element={<ContentList />} />
            <Route path="content/new" element={<ContentEditor />} />
            <Route path="content/:id/edit" element={<ContentEditor />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="comments" element={<CommentModeration />} />
            <Route path="categories" element={<Categories />} />
            <Route path="tags" element={<Tags />} />
            <Route path="seo" element={<SeoManagement />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="profile" element={<Profile />} />

            {/* Admin-only routes */}
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <Users />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* React Query DevTools (development only) */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}

      {/* Toast notifications */}
      <ToastContainer />
    </QueryClientProvider>
  );
}

export default App;
