import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, Toast as ToastType } from '@/stores/toastStore';

/**
 * Individual toast notification
 */
const ToastItem = ({ toast }: { toast: ToastType }) => {
  const { removeToast } = useToastStore();
  const [progress, setProgress] = useState(100);

  const duration = toast.duration || 5000;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - (100 / duration) * 100));
    }, 100);

    return () => clearInterval(interval);
  }, [duration]);

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
      iconColor: 'text-success-600',
      progressColor: 'bg-success-500',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-error-50',
      borderColor: 'border-error-200',
      iconColor: 'text-error-600',
      progressColor: 'bg-error-500',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-200',
      iconColor: 'text-warning-600',
      progressColor: 'bg-warning-500',
    },
    info: {
      icon: Info,
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
      iconColor: 'text-primary-600',
      progressColor: 'bg-primary-500',
    },
  };

  const { icon: Icon, bgColor, borderColor, iconColor, progressColor } = config[toast.type];

  return (
    <div
      className={`
        relative w-80 rounded-lg border shadow-lg overflow-hidden
        ${bgColor} ${borderColor}
        animate-in-slide
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
        <p className="flex-1 text-sm text-gray-900 font-medium">{toast.message}</p>
        <button
          onClick={() => removeToast(toast.id)}
          className="
            flex-shrink-0 rounded p-1
            text-gray-400 hover:text-gray-600
            hover:bg-white/50
            transition-colors duration-200
          "
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200/30">
        <div
          className={`h-full ${progressColor} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Toast container - renders all active toasts
 *
 * Add this component to your app root:
 * ```tsx
 * <ToastContainer />
 * ```
 *
 * Then use the toast helper:
 * ```tsx
 * import { toast } from '@/stores/toastStore';
 *
 * toast.success('Saved successfully!');
 * toast.error('Failed to save');
 * ```
 */
export const ToastContainer = () => {
  const { toasts } = useToastStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  );
};
