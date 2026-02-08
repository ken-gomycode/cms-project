import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '@/api/hooks/useAuth';
import { toast } from '@/stores/toastStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAuthStore } from '@/stores/authStore';

// Validation Schema
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
      });

      toast.success('Welcome back! Redirecting to dashboard...');
      navigate('/admin');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Invalid email or password';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-primary-100 to-indigo-100">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>
      </div>

      {/* Glassmorphic Card */}
      <div className="relative w-full max-w-md">
        {/* Shadow Layers for Depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 rounded-3xl blur-xl transform translate-y-2" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/5 rounded-3xl blur-2xl transform translate-y-4" />

        {/* Main Card */}
        <div className="relative bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12">
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 shadow-lg shadow-primary-500/30">
              <svg
                className="w-9 h-9 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-2 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Password Field */}
            <div className="group">
              <Input
                {...register('password')}
                type="password"
                label="Password"
                placeholder="Enter your password"
                error={errors.password?.message}
                isRequired
                className="transition-all duration-300 group-hover:border-primary-300"
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <Checkbox {...register('rememberMe')} label="Remember me" />

              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={loginMutation.isPending}
              className="relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300/50" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/70 text-gray-500 font-medium">
                New to our platform?
              </span>
            </div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-all duration-200 group"
            >
              Create an account
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Floating Decorative Elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary-400/20 to-indigo-400/20 rounded-full blur-2xl animate-pulse" />
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-tr from-purple-400/20 to-primary-400/20 rounded-full blur-2xl animate-pulse animation-delay-2000" />
      </div>

      {/* Bottom Brand Text */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-sm text-gray-600/80 font-medium">
          Secured by enterprise-grade encryption
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
      `}</style>
    </div>
  );
};
