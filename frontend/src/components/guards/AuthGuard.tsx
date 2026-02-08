import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { PageSpinner } from '@/components/ui';
import { useEffect, useState } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard - Check authentication and redirect to login if not authenticated
 * Shows loading spinner while initializing auth state
 */
export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated, initialize } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth from localStorage
    initialize();
    setIsLoading(false);
  }, [initialize]);

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
