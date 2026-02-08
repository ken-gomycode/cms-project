import { Outlet } from 'react-router-dom';

/**
 * PublicLayout - Placeholder for public-facing layout
 * Will be implemented in Phase 18
 */
export const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">CMS Public Site</h1>
        <Outlet />
      </div>
    </div>
  );
};
