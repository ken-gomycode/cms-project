import { Outlet, Link } from 'react-router-dom';
import { Layers, Home, FileText, Mail, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

/**
 * Public-facing layout with header and footer
 */
export const PublicLayout = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-900 hover:text-primary-600 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-md">
                <Layers className="text-white" size={18} />
              </div>
              <span className="font-bold text-lg">CMS</span>
            </Link>

            {/* Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                <Home size={16} />
                Home
              </Link>
              <Link
                to="/content"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                <FileText size={16} />
                Blog
              </Link>
              <Link
                to="/contact"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                <Mail size={16} />
                Contact
              </Link>
            </div>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link
                  to="/admin"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <LogIn size={16} />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                  >
                    <UserPlus size={16} />
                    <span className="hidden sm:inline">Sign Up</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-md">
                  <Layers className="text-white" size={18} />
                </div>
                <span className="font-bold text-lg text-gray-900">CMS</span>
              </div>
              <p className="text-sm text-gray-600 max-w-md">
                A modern content management system built with the latest technologies for
                exceptional performance and user experience.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/"
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/content"
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/privacy"
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              © {new Date().getFullYear()} CMS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
