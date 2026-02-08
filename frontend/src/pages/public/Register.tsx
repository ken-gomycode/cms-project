import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '@/api/hooks/useAuth';
import { toast } from '@/stores/toastStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

// Validation Schema
const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must not exceed 50 characters'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must not exceed 50 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const Register = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  const password = watch('password');

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (!pwd) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 15;
    if (/[A-Z]/.test(pwd)) strength += 20;
    if (/[0-9]/.test(pwd)) strength += 20;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 20;

    if (strength <= 25) return { strength, label: 'Weak', color: 'bg-error-500' };
    if (strength <= 60) return { strength, label: 'Fair', color: 'bg-warning-500' };
    if (strength <= 80) return { strength, label: 'Good', color: 'bg-primary-500' };
    return { strength, label: 'Strong', color: 'bg-success-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerMutation.mutateAsync({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      toast.success('Account created successfully! Welcome aboard.');
      navigate('/admin');
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || 'Unable to create account. Please try again.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 py-12">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-100 to-primary-100">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>
      </div>

      {/* Glassmorphic Card */}
      <div className="relative w-full max-w-2xl">
        {/* Shadow Layers for Depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 rounded-3xl blur-xl transform translate-y-2" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/5 rounded-3xl blur-2xl transform translate-y-4" />

        {/* Main Card */}
        <div className="relative bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12">
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
              <svg
                className="w-9 h-9 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>

            <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-2 tracking-tight">
              Create Account
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              Join us and start managing your content today
            </p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Fields - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group">
                <Input
                  {...register('firstName')}
                  type="text"
                  label="First Name"
                  placeholder="John"
                  error={errors.firstName?.message}
                  isRequired
                  className="transition-all duration-300 group-hover:border-primary-300"
                />
              </div>

              <div className="group">
                <Input
                  {...register('lastName')}
                  type="text"
                  label="Last Name"
                  placeholder="Doe"
                  error={errors.lastName?.message}
                  isRequired
                  className="transition-all duration-300 group-hover:border-primary-300"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="group">
              <Input
                {...register('email')}
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                error={errors.email?.message}
                isRequired
                className="transition-all duration-300 group-hover:border-primary-300"
              />
            </div>

            {/* Password Field with Strength Indicator */}
            <div className="group space-y-2">
              <Input
                {...register('password')}
                type="password"
                label="Password"
                placeholder="Create a strong password"
                error={errors.password?.message}
                isRequired
                className="transition-all duration-300 group-hover:border-primary-300"
              />

              {password && (
                <div className="space-y-2 animate-in-slide">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-medium">Password Strength</span>
                    <span
                      className={`font-semibold ${
                        passwordStrength.strength <= 25
                          ? 'text-error-600'
                          : passwordStrength.strength <= 60
                            ? 'text-warning-600'
                            : passwordStrength.strength <= 80
                              ? 'text-primary-600'
                              : 'text-success-600'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="group">
              <Input
                {...register('confirmPassword')}
                type="password"
                label="Confirm Password"
                placeholder="Re-enter your password"
                error={errors.confirmPassword?.message}
                isRequired
                className="transition-all duration-300 group-hover:border-primary-300"
              />
            </div>

            {/* Password Requirements */}
            <div className="bg-primary-50/50 backdrop-blur-sm rounded-xl p-4 border border-primary-100">
              <p className="text-xs font-semibold text-primary-900 mb-2">Password Requirements:</p>
              <ul className="text-xs text-primary-800 space-y-1">
                <li className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${password?.length >= 8 ? 'bg-success-500' : 'bg-gray-300'}`}
                  />
                  At least 8 characters
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password || '') ? 'bg-success-500' : 'bg-gray-300'}`}
                  />
                  One uppercase letter
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password || '') ? 'bg-success-500' : 'bg-gray-300'}`}
                  />
                  One number
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${/[^A-Za-z0-9]/.test(password || '') ? 'bg-success-500' : 'bg-gray-300'}`}
                  />
                  One special character
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={registerMutation.isPending}
              className="relative overflow-hidden group"
            >
              <span className="relative z-10">
                {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300/50" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/70 text-gray-500 font-medium">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-all duration-200 group"
            >
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16l-4-4m0 0l4-4m-4 4h18"
                />
              </svg>
              Sign in instead
            </Link>
          </div>
        </div>

        {/* Floating Decorative Elements */}
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-2xl animate-pulse" />
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-tr from-primary-400/20 to-indigo-400/20 rounded-full blur-2xl animate-pulse animation-delay-2000" />
      </div>

      {/* Bottom Brand Text */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-sm text-gray-600/80 font-medium">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 10px) scale(1.05); }
        }

        .animate-blob {
          animation: blob 20s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in-slide {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
