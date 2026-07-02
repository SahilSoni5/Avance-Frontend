'use client';

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('Dialog components must be used within Dialog');
  return ctx;
}

export interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Convenience alias for onOpenChange(false) */
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

function SimpleDialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: Required<Pick<DialogProps, 'open' | 'onClose' | 'title' | 'children'>> &
  Pick<DialogProps, 'footer' | 'className'>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-50 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl',
          'dark:border-slate-700 dark:bg-slate-900',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function CompoundDialog({
  open,
  onOpenChange,
  onClose,
  children,
}: Pick<DialogProps, 'open' | 'onOpenChange' | 'onClose' | 'children'>) {
  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!next) onClose?.();
    },
    [onOpenChange, onClose]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, handleOpenChange]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => handleOpenChange(false)}
          aria-hidden
        />
        {children}
      </div>
    </DialogContext.Provider>
  );
}

export function Dialog({
  open,
  onOpenChange,
  onClose,
  title,
  children,
  footer,
  className,
}: DialogProps) {
  if (title !== undefined && onClose) {
    return (
      <SimpleDialog
        open={open}
        onClose={onClose}
        title={title}
        footer={footer}
        className={className}
      >
        {children}
      </SimpleDialog>
    );
  }

  return (
    <CompoundDialog open={open} onOpenChange={onOpenChange} onClose={onClose}>
      {children}
    </CompoundDialog>
  );
}

export function DialogContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { onOpenChange } = useDialogContext();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        'relative z-50 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl',
        'dark:border-slate-700 dark:bg-slate-900',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

export function DialogHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5 pr-8', className)}>
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h2 className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100', className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={cn('text-sm text-slate-500 dark:text-slate-400', className)}>
      {children}
    </p>
  );
}

export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}>
      {children}
    </div>
  );
}

export function DialogTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { onOpenChange } = useDialogContext();
  const open = useCallback(() => onOpenChange(true), [onOpenChange]);

  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
