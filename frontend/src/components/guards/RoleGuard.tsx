import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { UserRole } from '@/types';
import { useEffect } from 'react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/**
 * RoleGuard - Check user role and redirect with error toast if unauthorized
 */
export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !allowedRoles.includes(user.role)) {
      toast.error('You do not have permission to access this page');
    }
  }, [user, allowedRoles]);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
