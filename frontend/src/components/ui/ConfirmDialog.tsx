import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Dialog variant */
  variant?: 'danger' | 'warning' | 'info';
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Callback when confirm is clicked */
  onConfirm: () => void | Promise<void>;
  /** Loading state for confirm button */
  isLoading?: boolean;
}

/**
 * Confirmation dialog with variants and loading states
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   variant="danger"
 *   title="Delete Content"
 *   message="This action cannot be undone. Are you sure?"
 *   onConfirm={handleDelete}
 *   isLoading={isDeleting}
 * />
 * ```
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  variant = 'info',
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) => {
  const config = {
    danger: {
      icon: AlertCircle,
      iconColor: 'text-error-600',
      iconBg: 'bg-error-100',
      buttonVariant: 'danger' as const,
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-warning-600',
      iconBg: 'bg-warning-100',
      buttonVariant: 'secondary' as const,
    },
    info: {
      icon: Info,
      iconColor: 'text-primary-600',
      iconBg: 'bg-primary-100',
      buttonVariant: 'primary' as const,
    },
  };

  const { icon: Icon, iconColor, iconBg, buttonVariant } = config[variant];

  const handleConfirm = async () => {
    await onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" hideCloseButton>
      <div className="text-center">
        {/* Icon */}
        <div
          className={`mx-auto w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mb-4`}
        >
          <Icon className={iconColor} size={24} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

        {/* Message */}
        <p className="text-sm text-gray-600 mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isLoading} fullWidth>
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            fullWidth
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
