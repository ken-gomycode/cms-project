import {
  LayoutDashboard,
  FileText,
  Image,
  MessageSquare,
  Folder,
  Tag,
  BarChart3,
  Users,
  User,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '@/types';

export interface NavigationItem {
  name: string;
  path: string;
  icon: LucideIcon;
  /** Roles that can see this nav item */
  roles?: UserRole[];
}

export const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    path: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Content',
    path: '/admin/content',
    icon: FileText,
  },
  {
    name: 'Media',
    path: '/admin/media',
    icon: Image,
  },
  {
    name: 'Comments',
    path: '/admin/comments',
    icon: MessageSquare,
  },
  {
    name: 'Categories',
    path: '/admin/categories',
    icon: Folder,
  },
  {
    name: 'Tags',
    path: '/admin/tags',
    icon: Tag,
  },
  {
    name: 'Analytics',
    path: '/admin/analytics',
    icon: BarChart3,
  },
  {
    name: 'Users',
    path: '/admin/users',
    icon: Users,
    roles: [UserRole.ADMIN],
  },
  {
    name: 'Profile',
    path: '/admin/profile',
    icon: User,
  },
];
