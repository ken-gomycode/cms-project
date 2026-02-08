import { UserRole } from '@/types';
import { AuthGuard } from './AuthGuard';
import { RoleGuard } from './RoleGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * ProtectedRoute - Combine AuthGuard and optional RoleGuard for route protection
 *
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
 *   <UserManagement />
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  return (
    <AuthGuard>
      {allowedRoles ? <RoleGuard allowedRoles={allowedRoles}>{children}</RoleGuard> : children}
    </AuthGuard>
  );
};
