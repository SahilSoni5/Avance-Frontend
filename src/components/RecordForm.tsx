'use client';

import { useMemo } from 'react';
import type React from 'react';
import { useForm, type DefaultValues, type FieldValues, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z, type ZodType, type ZodTypeDef } from 'zod';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Button, Input, Select, Textarea } from './ui';

export interface FormFieldConfig<T extends FieldValues> {
  name: Path<T>;
  label: string;
  render?: (props: {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    error?: string;
    disabled?: boolean;
  }) => ReactNode;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'number' | 'date' | 'datetime-local';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface RecordFormProps<T extends FieldValues> {
  schema?: ZodType<T, ZodTypeDef, T>;
  defaultValues?: DefaultValues<T>;
  fields: FormFieldConfig<T>[];
  onSubmit: (values: T) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  loading?: boolean;
  className?: string;
}

function buildSchemaFromFields<T extends FieldValues>(fields: FormFieldConfig<T>[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    const key = String(field.name);
    if (field.type === 'email') {
      shape[key] = field.required ? z.string().email() : z.string().email().optional().or(z.literal(''));
    } else if (field.type === 'number') {
      shape[key] = field.required ? z.coerce.number() : z.coerce.number().optional();
    } else if (field.type === 'date') {
      shape[key] = field.required ? z.string().min(1) : z.string().optional();
    } else if (field.type === 'textarea') {
      shape[key] = field.required ? z.string().min(1) : z.string().optional();
    } else if (field.type === 'select') {
      shape[key] = field.required ? z.string().min(1) : z.string().optional();
    } else {
      shape[key] = field.required ? z.string().min(1) : z.string().optional();
    }
  }
  return z.object(shape);
}

export function RecordForm<T extends FieldValues = FieldValues>({
  schema: schemaProp,
  defaultValues,
  fields,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  onCancel,
  isSubmitting = false,
  loading = false,
  className,
}: RecordFormProps<T>) {
  const schema = useMemo(
    () => schemaProp ?? buildSchemaFromFields(fields),
    [schemaProp, fields]
  );

  const {
    handleSubmit,
    setValue,
    watch,
    trigger,
    register,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<T>({
    // zod v3 + @hookform/resolvers v5 type mismatch
    resolver: zodResolver(schema as never),
    defaultValues,
    mode: 'onBlur',
  });

  const submitting = isSubmitting || loading || formSubmitting;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn('space-y-5', className)}
      noValidate
    >
      {fields.map((field) => {
        const error = errors[field.name]?.message as string | undefined;
        const value = watch(field.name);

        return (
          <div key={String(field.name)} className="space-y-1.5">
            <label
              htmlFor={String(field.name)}
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </label>

            {field.render ? (
              field.render({
                value,
                onChange: (next) => {
                  setValue(field.name, next as T[Path<T>], { shouldDirty: true, shouldValidate: true });
                },
                onBlur: () => {
                  void trigger(field.name);
                },
                error,
                disabled: submitting,
              })
            ) : field.type === 'select' ? (
              <Select
                id={String(field.name)}
                disabled={submitting}
                error={Boolean(error)}
                {...register(field.name)}
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            ) : field.type === 'textarea' ? (
              <Textarea
                id={String(field.name)}
                disabled={submitting}
                error={Boolean(error)}
                {...register(field.name)}
              />
            ) : (
              <Input
                id={String(field.name)}
                type={(['number', 'date', 'datetime-local', 'email', 'password'].includes(field.type ?? '') ? field.type : 'text') as React.HTMLInputTypeAttribute}
                placeholder={field.placeholder}
                disabled={submitting}
                error={error}
                {...register(field.name)}
              />
            )}

            {error && !field.render && typeof error === 'string' && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
