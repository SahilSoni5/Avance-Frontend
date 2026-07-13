'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, FileText, File, Sheet as SheetIcon, Image,
  ExternalLink, Download, Trash2, X, FolderOpen, Loader2, User, Building2,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatDateIST } from '../lib/locale';
import { useAuthStore } from '../stores/auth.store';
import { Button, Dialog, Input } from '../components/ui';
import { Sheet } from '../components/ui/Sheet';
import { uploadFile } from '../lib/upload';
import { cn } from '../lib/utils';

interface DocOwner { id: string; firstName: string; lastName: string; role: string }
interface DocumentRecord {
  id: string;
  name: string;
  purpose: string | null;
  googleDriveLink: string | null;
  fileUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
  owner: DocOwner;
  contact?: { id: string; firstName: string; lastName: string } | null;
  account?: { id: string; name: string } | null;
}

function fileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50' };
  if (mimeType.includes('word') || mimeType.includes('document')) return { Icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' };
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return { Icon: SheetIcon, color: 'text-green-500', bg: 'bg-green-50' };
  if (mimeType.includes('image')) return { Icon: Image, color: 'text-purple-500', bg: 'bg-purple-50' };
  return { Icon: File, color: 'text-slate-400', bg: 'bg-slate-50' };
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function DocumentCard({ doc, onClick }: { doc: DocumentRecord; onClick: () => void }) {
  const { Icon, color, bg } = fileIcon(doc.mimeType);
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full bg-card border border-border/60 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', bg)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        {doc.googleDriveLink && (
          <a
            href={doc.googleDriveLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
      <p className="font-semibold text-sm text-foreground truncate">{doc.name}</p>
      {doc.purpose && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.purpose}</p>
      )}
      {(doc.contact || doc.account) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {doc.contact && (
            <Link
              href={`/contacts/${doc.contact.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <User className="w-3 h-3" /> {doc.contact.firstName} {doc.contact.lastName}
            </Link>
          )}
          {doc.account && (
            <Link
              href={`/brands/${doc.account.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Building2 className="w-3 h-3" /> {doc.account.name}
            </Link>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>{formatBytes(doc.size)}</span>
        <span>{formatDateIST(doc.createdAt)}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{doc.owner.firstName} {doc.owner.lastName}</p>
    </button>
  );
}

function DocumentPanel({ docId, onClose, onDelete }: { docId: string; onClose: () => void; onDelete: (id: string) => void }) {
  const user = useAuthStore(s => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['document-detail', docId],
    queryFn: () => apiFetch<{ data: DocumentRecord }>(`/documents/${docId}`),
  });
  const doc = data?.data;
  const { Icon, color, bg } = doc ? fileIcon(doc.mimeType) : { Icon: File, color: 'text-slate-400', bg: 'bg-slate-50' };

  const canDelete = doc && user && (
    doc.owner.id === user.id || ['BOSS', 'ADMIN', 'MANAGER'].includes(user.role)
  );

  return (
    <Sheet open onClose={onClose} title={doc?.name ?? 'Document'}>
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : doc ? (
        <div className="px-6 py-4 space-y-5">
          <div className="flex items-start gap-4">
            <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', bg)}>
              <Icon className={cn('w-7 h-7', color)} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground">{doc.name}</h3>
              {doc.purpose && <p className="text-sm text-muted-foreground mt-0.5">{doc.purpose}</p>}
            </div>
          </div>
          {doc.googleDriveLink && (
            <a
              href={doc.googleDriveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors w-full"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Drive
            </a>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">File Type</p>
              <p className="font-medium text-foreground">{doc.mimeType.split('/')[1]?.toUpperCase() ?? doc.mimeType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Size</p>
              <p className="font-medium text-foreground">{formatBytes(doc.size)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Uploaded</p>
              <p className="font-medium text-foreground">{formatDateIST(doc.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Uploaded by</p>
              <p className="font-medium text-foreground">{doc.owner.firstName} {doc.owner.lastName}</p>
            </div>
            {doc.contact && (
              <div>
                <p className="text-xs text-muted-foreground">Contact</p>
                <Link href={`/contacts/${doc.contact.id}`} className="font-medium text-primary hover:underline">
                  {doc.contact.firstName} {doc.contact.lastName}
                </Link>
              </div>
            )}
            {doc.account && (
              <div>
                <p className="text-xs text-muted-foreground">Brand</p>
                <Link href={`/brands/${doc.account.id}`} className="font-medium text-primary hover:underline">
                  {doc.account.name}
                </Link>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-muted rounded-xl text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
            >
              <Download className="w-4 h-4" /> Download
            </a>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

export function DocumentsPage() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadPurpose, setUploadPurpose] = useState('');
  const [uploadDriveLink, setUploadDriveLink] = useState('');
  const [uploadFile_, setUploadFile_] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['documents', debouncedSearch],
    queryFn: () => {
      const p = new URLSearchParams();
      if (debouncedSearch) p.set('search', debouncedSearch);
      return apiFetch<{ data: DocumentRecord[]; scope: string }>(`/documents?${p}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelectedDocId(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile_) throw new Error('Please choose a file to upload');
      if (!uploadName.trim()) throw new Error('File name is required');
      const uploaded = await uploadFile(uploadFile_);
      return apiFetch('/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: uploadName.trim(),
          purpose: uploadPurpose.trim() || undefined,
          googleDriveLink: uploadDriveLink.trim() || undefined,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setUploadOpen(false);
      setUploadName('');
      setUploadPurpose('');
      setUploadDriveLink('');
      setUploadFile_(null);
      setUploadError('');
    },
    onError: (err: Error) => setUploadError(err.message),
  });

  function openUploadDialog() {
    setUploadError('');
    setUploadName('');
    setUploadPurpose('');
    setUploadDriveLink('');
    setUploadFile_(null);
    setUploadOpen(true);
  }

  function handleFilePick(file: File | null) {
    setUploadFile_(file);
    if (file && !uploadName.trim()) {
      setUploadName(file.name.replace(/\.[^.]+$/, ''));
    }
  }

  let searchTimeout: ReturnType<typeof setTimeout>;
  function handleSearch(v: string) {
    setSearch(v);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => setDebouncedSearch(v), 300);
  }

  const documents = data?.data ?? [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.scope && `Viewing: ${data.scope === 'self' ? 'My Files' : data.scope === 'team' ? 'My Team' : 'Org-Wide'}`}
            </p>
          </div>
          <Button size="sm" onClick={openUploadDialog}>
            <Plus className="w-4 h-4 mr-1.5" /> Upload Document
          </Button>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or purpose..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); setDebouncedSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({length: 8}).map((_, i) => <div key={i} className="h-40 bg-card border border-border/40 rounded-2xl animate-pulse" />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-medium">{search ? 'No documents match your search' : 'No documents yet'}</p>
            <p className="text-sm mt-1">Upload files using the button above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {documents.map(doc => (
              <DocumentCard key={doc.id} doc={doc} onClick={() => setSelectedDocId(doc.id)} />
            ))}
          </div>
        )}
      </div>

      {selectedDocId && (
        <DocumentPanel
          docId={selectedDocId}
          onClose={() => setSelectedDocId(null)}
          onDelete={id => deleteMutation.mutate(id)}
        />
      )}

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Document">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setUploadError('');
            createMutation.mutate();
          }}
        >
          {uploadError && (
            <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{uploadError}</p>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">File <span className="text-red-500">*</span></label>
            <input
              type="file"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground"
              onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <Input label="Display name" value={uploadName} onChange={(e) => setUploadName(e.target.value)} required />
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Purpose</label>
            <textarea
              value={uploadPurpose}
              onChange={(e) => setUploadPurpose(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm"
              placeholder="Why is this file being uploaded?"
            />
          </div>
          <Input label="Google Drive link (optional)" value={uploadDriveLink} onChange={(e) => setUploadDriveLink(e.target.value)} />
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading…</> : 'Upload Document'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
