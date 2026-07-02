'use client';

import { useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { getAuthHeaders } from '../stores/auth.store';
import { cn } from '../lib/utils';
import { API_BASE } from '../lib/config';
import { Button } from './ui';

export type ImportExportModule = 'contacts' | 'accounts';

const MODULE_ENDPOINTS: Record<
  ImportExportModule,
  { export: string; import?: string; exportFilename: string }
> = {
  contacts: {
    export: '/contacts/export/csv',
    import: '/contacts/import/csv',
    exportFilename: 'contacts.csv',
  },
  accounts: {
    export: '/accounts/export/csv',
    exportFilename: 'accounts.csv',
  },
};

function resolveApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const suffix = path.startsWith('/api') ? path.slice('/api'.length) : path;
  return `${API_BASE}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
}

export interface ImportExportButtonsProps {
  module?: ImportExportModule;
  exportUrl?: string;
  exportFilename?: string;
  importUrl?: string;
  onImportComplete?: (result: unknown) => void;
  onImportSuccess?: () => void;
  className?: string;
}

async function downloadCsv(url: string, filename: string) {
  const res = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message ?? 'Export failed');
  }
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function ImportExportButtons({
  module,
  exportUrl,
  exportFilename,
  importUrl,
  onImportComplete,
  onImportSuccess,
  className,
}: ImportExportButtonsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const moduleConfig = module ? MODULE_ENDPOINTS[module] : null;
  const resolvedExportUrl = exportUrl ?? moduleConfig?.export;
  const resolvedImportUrl = importUrl ?? moduleConfig?.import;
  const resolvedFilename = exportFilename ?? moduleConfig?.exportFilename ?? 'export.csv';

  const handleExport = async () => {
    if (!resolvedExportUrl) return;
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      const url = resolveApiUrl(resolvedExportUrl);
      await downloadCsv(url, resolvedFilename);
      setMessage('Export downloaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    if (!resolvedImportUrl) {
      setError('Import is not available for this module yet');
      return;
    }

    setImporting(true);
    setError(null);
    setMessage(null);

    try {
      const csv = await file.text();
      const url = resolveApiUrl(resolvedImportUrl);
      const res = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message ?? 'Import failed');
      }
      setMessage(`Imported ${data.data?.created ?? 0} record(s)`);
      onImportComplete?.(data.data);
      onImportSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {resolvedExportUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export CSV
        </Button>
      )}

      {resolvedImportUrl && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import CSV
          </Button>
        </>
      )}

      {message && <span className="text-xs text-emerald-600">{message}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
