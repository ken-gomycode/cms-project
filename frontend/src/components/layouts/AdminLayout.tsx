import { Outlet } from 'react-router-dom';

/**
 * AdminLayout - Placeholder for admin dashboard layout
 * Will be implemented in Phase 18
 */
export const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <Outlet />
      </div>
    </div>
  );
};
