import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Calendar, Shield, Mail } from 'lucide-react';
import { useProfile, useUpdateProfile } from '@/api/hooks/useUsers';
import { useAuthStore } from '@/stores/authStore';
import { Button, Input, Spinner } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/stores/toastStore';
import { formatDate, formatRelative } from '@/lib/dateUtils';
import { UpdateProfileRequest } from '@/types';

/**
 * Profile form validation schema
 */
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  avatar: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Profile Page - User profile management
 * Allows users to view and update their profile information
 */
export const Profile = () => {
  const { user: authUser, setUser } = useAuthStore();
  const { data: profileData, isLoading, error } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  // Use profile data from API if available, fallback to auth store
  const user = profileData || authUser;

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      avatar: user?.avatar || '',
    },
  });

  // Handle profile update
  const onSubmit = async (formData: ProfileFormData) => {
    try {
      const payload: UpdateProfileRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        avatar: formData.avatar || undefined,
      };

      const updatedUser = await updateProfileMutation.mutateAsync(payload);

      // Update auth store with new user data
      setUser(updatedUser);

      toast.success('Profile updated successfully');
      reset(formData);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="space-y-6 animate-in-slide">
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          Failed to load profile. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in-slide">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-4 border-primary-100 shadow-lg">
                  <span className="text-white font-bold text-3xl">
                    {user.firstName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{user.email}</p>

              <div className="mt-3">
                <Badge status={user.role as any} />
              </div>
            </div>

            {/* User Metadata */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-gray-400" />
                <div>
                  <p className="text-gray-600">Member since</p>
                  <p className="font-medium text-gray-900">{formatDate(user.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Shield size={16} className="text-gray-400" />
                <div>
                  <p className="text-gray-600">Account Status</p>
                  <p
                    className={`font-medium ${user.isActive ? 'text-success-600' : 'text-gray-600'}`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <User size={16} className="text-gray-400" />
                <div>
                  <p className="text-gray-600">Last updated</p>
                  <p className="font-medium text-gray-900">{formatRelative(user.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Edit Profile</h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
                >
                  First Name *
                </label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  placeholder="Enter your first name"
                  error={errors.firstName?.message}
                />
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
                >
                  Last Name *
                </label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  placeholder="Enter your last name"
                  error={errors.lastName?.message}
                />
              </div>

              {/* Avatar URL */}
              <div>
                <label
                  htmlFor="avatar"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
                >
                  Avatar URL
                </label>
                <Input
                  id="avatar"
                  {...register('avatar')}
                  placeholder="https://example.com/avatar.jpg"
                  error={errors.avatar?.message}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a URL to an image for your profile avatar
                </p>
              </div>

              {/* Email (read-only) */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="pl-10 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed. Contact an administrator if you need to update your email
                  address.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => reset()}
                  disabled={!isDirty || updateProfileMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updateProfileMutation.isPending}
                  disabled={!isDirty}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Password Change Section (Informational) */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mt-6">
            <div className="flex items-start gap-3">
              <Shield size={20} className="text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-primary-900 mb-1">Password Management</h4>
                <p className="text-sm text-primary-700">
                  To change your password, please contact an administrator. For security reasons,
                  password changes must be handled through the admin user management interface.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
