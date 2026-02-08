import { NavLink } from 'react-router-dom';
import { X, Layers } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui';
import { navigationItems } from './navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Admin sidebar with navigation and user info
 */
export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useAuthStore();

  const filteredNavItems = navigationItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64
          bg-white border-r border-gray-200
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          md:translate-x-0 md:z-30
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-md">
              <Layers className="text-white" size={18} />
            </div>
            <h1 className="text-lg font-bold text-gray-900">CMS Admin</h1>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `
                  flex items-center gap-3 px-4 py-2.5 rounded-lg
                  text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `
              }
              onClick={() => {
                // Close mobile menu on navigation
                if (window.innerWidth < 768) {
                  onClose();
                }
              }}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        {user && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-sm">
                  {user.firstName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
                </p>
                <Badge status={user.role as any} className="mt-0.5" />
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
