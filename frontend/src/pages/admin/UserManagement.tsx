import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/api/hooks';
import { Button, Modal, ConfirmDialog, Input, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { User, CreateUserRequest, UpdateUserRequest, UserRole } from '@/types';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/lib/dateUtils';

/**
 * User form validation schema for creating new users
 */
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  role: z.nativeEnum(UserRole),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

/**
 * User form validation schema for editing users
 */
const editUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional()
    .or(z.literal('')),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

/**
 * Role filter options
 */
const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: UserRole.ADMIN, label: 'Admin' },
  { value: UserRole.EDITOR, label: 'Editor' },
  { value: UserRole.AUTHOR, label: 'Author' },
  { value: UserRole.SUBSCRIBER, label: 'Subscriber' },
];

/**
 * UserManagement Page - User management page
 * Displays a list of all users with CRUD operations
 */
export const UserManagement = () => {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Build filter params
  const filters = useMemo(
    () => ({
      page,
      limit: 10,
      search: searchQuery || undefined,
      role: (roleFilter as UserRole) || undefined,
    }),
    [page, searchQuery, roleFilter],
  );

  // Data fetching
  const { data, isLoading, error } = useUsers(filters);
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Form setup for create
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: UserRole.SUBSCRIBER,
    },
  });

  // Form setup for edit
  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: UserRole.SUBSCRIBER,
      isActive: true,
      password: '',
    },
  });

  // Table columns configuration
  const columns: Column<User>[] = [
    {
      header: 'Name',
      accessor: (row) => `${row.firstName} ${row.lastName}`,
      sortable: true,
      cell: (name: string, row: User) => (
        <div>
          <div className="font-medium text-gray-900">{name}</div>
          <div className="text-xs text-gray-500 mt-0.5">{row.email}</div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: 'role',
      sortable: true,
      cell: (role: UserRole) => <Badge status={role} />,
    },
    {
      header: 'Status',
      accessor: 'isActive',
      sortable: true,
      cell: (isActive: boolean) => (
        <span
          className={`
            inline-flex items-center gap-1.5
            px-2.5 py-1
            rounded-full
            text-xs font-medium
            border
            ${
              isActive
                ? 'text-success-700 bg-success-50 border-success-200'
                : 'text-gray-700 bg-gray-100 border-gray-300'
            }
          `}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-success-500' : 'bg-gray-500'}`}
            aria-hidden="true"
          />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Created',
      accessor: 'createdAt',
      sortable: true,
      cell: (date: string) => <span className="text-sm text-gray-600">{formatDate(date)}</span>,
    },
    {
      header: 'Actions',
      accessor: (row) => row.id,
      width: 'w-32',
      cell: (_id: string, row: User) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(row);
            }}
            aria-label="Edit user"
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(row);
            }}
            aria-label="Delete user"
            className="text-error-600 hover:text-error-700 hover:bg-error-50"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  // Handlers
  const handleEditClick = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleCreateSubmit = async (formData: CreateUserFormData) => {
    try {
      const payload: CreateUserRequest = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
      };

      await createUserMutation.mutateAsync(payload);
      toast.success('User created successfully');
      setIsCreateModalOpen(false);
      createForm.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleEditSubmit = async (formData: EditUserFormData) => {
    if (!editingUser) return;

    try {
      const payload: UpdateUserRequest = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        isActive: formData.isActive,
        password: formData.password || undefined,
      };

      await updateUserMutation.mutateAsync({
        id: editingUser.id,
        data: payload,
      });
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      setEditingUser(null);
      editForm.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in-slide">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage user accounts and permissions</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus size={20} />
          New User
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={handleRoleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              {ROLE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          Failed to load users. Please try again.
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          emptyMessage="No users found. Create your first user to get started."
          pagination={
            data?.meta
              ? {
                  page: data.meta.page,
                  totalPages: data.meta.totalPages,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          createForm.reset();
        }}
        title="Create User"
        description="Add a new user account"
        size="lg"
      >
        <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
          {/* Email Input */}
          <div>
            <label
              htmlFor="create-email"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Email *
            </label>
            <Input
              id="create-email"
              type="email"
              {...createForm.register('email')}
              placeholder="user@example.com"
              error={createForm.formState.errors.email?.message}
            />
          </div>

          {/* First Name Input */}
          <div>
            <label
              htmlFor="create-firstName"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              First Name *
            </label>
            <Input
              id="create-firstName"
              {...createForm.register('firstName')}
              placeholder="Enter first name"
              error={createForm.formState.errors.firstName?.message}
            />
          </div>

          {/* Last Name Input */}
          <div>
            <label
              htmlFor="create-lastName"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Last Name *
            </label>
            <Input
              id="create-lastName"
              {...createForm.register('lastName')}
              placeholder="Enter last name"
              error={createForm.formState.errors.lastName?.message}
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="create-password"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Password *
            </label>
            <Input
              id="create-password"
              type="password"
              {...createForm.register('password')}
              placeholder="Minimum 8 characters"
              error={createForm.formState.errors.password?.message}
            />
          </div>

          {/* Role Select */}
          <div>
            <label
              htmlFor="create-role"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Role *
            </label>
            <select
              id="create-role"
              {...createForm.register('role')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value={UserRole.SUBSCRIBER}>Subscriber</option>
              <option value={UserRole.AUTHOR}>Author</option>
              <option value={UserRole.EDITOR}>Editor</option>
              <option value={UserRole.ADMIN}>Admin</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                createForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createUserMutation.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
          editForm.reset();
        }}
        title="Edit User"
        description="Update user information and permissions"
        size="lg"
      >
        <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
          {/* Email Input */}
          <div>
            <label
              htmlFor="edit-email"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Email *
            </label>
            <Input
              id="edit-email"
              type="email"
              {...editForm.register('email')}
              placeholder="user@example.com"
              error={editForm.formState.errors.email?.message}
            />
          </div>

          {/* First Name Input */}
          <div>
            <label
              htmlFor="edit-firstName"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              First Name *
            </label>
            <Input
              id="edit-firstName"
              {...editForm.register('firstName')}
              placeholder="Enter first name"
              error={editForm.formState.errors.firstName?.message}
            />
          </div>

          {/* Last Name Input */}
          <div>
            <label
              htmlFor="edit-lastName"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Last Name *
            </label>
            <Input
              id="edit-lastName"
              {...editForm.register('lastName')}
              placeholder="Enter last name"
              error={editForm.formState.errors.lastName?.message}
            />
          </div>

          {/* Role Select */}
          <div>
            <label
              htmlFor="edit-role"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Role *
            </label>
            <select
              id="edit-role"
              {...editForm.register('role')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value={UserRole.SUBSCRIBER}>Subscriber</option>
              <option value={UserRole.AUTHOR}>Author</option>
              <option value={UserRole.EDITOR}>Editor</option>
              <option value={UserRole.ADMIN}>Admin</option>
            </select>
          </div>

          {/* Active Status Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-isActive"
              {...editForm.register('isActive')}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
            />
            <label htmlFor="edit-isActive" className="text-sm font-medium text-gray-700">
              Active Account
            </label>
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="edit-password"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              New Password
            </label>
            <Input
              id="edit-password"
              type="password"
              {...editForm.register('password')}
              placeholder="Leave blank to keep current password"
              error={editForm.formState.errors.password?.message}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to keep the current password. Minimum 8 characters if changing.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUser(null);
                editForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateUserMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
        variant="danger"
        title="Delete User"
        message={
          userToDelete
            ? `Are you sure you want to delete "${userToDelete.firstName} ${userToDelete.lastName}"? This action cannot be undone and will remove all associated data.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteUserMutation.isPending}
      />
    </div>
  );
};
