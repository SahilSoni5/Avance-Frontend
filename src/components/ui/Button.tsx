'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const variants = {
  default:
    'bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground hover:from-primary/90 hover:to-indigo-600/90 shadow-glow-sm',
  primary:
    'bg-gradient-to-r from-primary to-indigo-600 text-white hover:from-primary/90 hover:to-indigo-600/90 shadow-glow-sm',
  secondary:
    'bg-muted text-foreground hover:bg-muted/80 border border-border',
  outline:
    'border border-border bg-card hover:bg-muted/50 text-foreground',
  ghost: 'hover:bg-muted text-foreground',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  link: 'text-primary underline-offset-4 hover:underline',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-xl',
  lg: 'h-11 px-6 text-sm rounded-xl',
  icon: 'h-9 w-9 rounded-xl',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = 'Button';
