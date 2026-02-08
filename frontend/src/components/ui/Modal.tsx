import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

export interface ModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Modal content */
  children: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Hide close button */
  hideCloseButton?: boolean;
  /** Prevent closing on backdrop click */
  preventBackdropClose?: boolean;
}

/**
 * Modal component with smooth animations and accessibility
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Delete Content"
 *   size="md"
 * >
 *   <p>Are you sure you want to delete this?</p>
 * </Modal>
 * ```
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  hideCloseButton = false,
  preventBackdropClose = false,
}: ModalProps) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const handleClose = () => {
    if (!preventBackdropClose) {
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        {/* Backdrop with fade animation */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel
                className={`
                  w-full ${sizeClasses[size]}
                  transform overflow-hidden rounded-2xl
                  bg-white shadow-2xl
                  transition-all
                  border border-gray-100
                `}
              >
                {/* Header */}
                {(title || !hideCloseButton) && (
                  <div className="relative border-b border-gray-100 px-6 py-4">
                    {title && (
                      <div>
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                          {title}
                        </Dialog.Title>
                        {description && (
                          <Dialog.Description className="mt-1 text-sm text-gray-500">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>
                    )}

                    {!hideCloseButton && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="
                          absolute right-4 top-4
                          rounded-lg p-1.5
                          text-gray-400 hover:text-gray-600
                          hover:bg-gray-100
                          transition-all duration-200
                          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                        "
                        aria-label="Close modal"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="px-6 py-4">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
