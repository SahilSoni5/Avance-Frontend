'use client';

import { Input, Select } from './ui';

interface IndustrySelectFieldProps {
  industries: string[];
  value: string;
  customValue: string;
  onChange: (industry: string) => void;
  onCustomChange: (custom: string) => void;
  label?: string;
  required?: boolean;
}

/** Resolved industry string for API — custom text when "Other" is selected. */
export function resolveIndustryValue(industry: string, customIndustry: string): string {
  if (industry === 'Other') return customIndustry.trim();
  return industry;
}

export function IndustrySelectField({
  industries,
  value,
  customValue,
  onChange,
  onCustomChange,
  label = 'Industry',
  required,
}: IndustrySelectFieldProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        <Select
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next);
            if (next !== 'Other') onCustomChange('');
          }}
        >
          <option value="">Select...</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </Select>
      </div>
      {value === 'Other' && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Specify industry <span className="text-red-500">*</span>
          </label>
          <Input
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="e.g. Automotive, Pharma, SaaS..."
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
