import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, User, LogOut } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { useAuthStore } from '@/stores/authStore';
import { useLogout } from '@/api/hooks';
import { toast } from '@/stores/toastStore';

interface HeaderProps {
  onMenuClick: () => void;
}

/**
 * Admin header with mobile menu and user dropdown
 */
export const Header = ({ onMenuClick }: HeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast.success('Logged out successfully');
        navigate('/login');
      },
    });
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <MenuIcon size={24} />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User dropdown */}
        {user && (
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-sm">
                  {user.firstName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user.firstName ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="p-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/admin/profile')}
                        className={`
                          ${active ? 'bg-gray-50' : ''}
                          group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-900
                        `}
                      >
                        <User size={16} />
                        Profile
                      </button>
                    )}
                  </Menu.Item>
                  <div className="my-1 h-px bg-gray-200" />
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`
                          ${active ? 'bg-error-50 text-error-700' : 'text-gray-900'}
                          group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm
                        `}
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        )}
      </div>
    </header>
  );
};
