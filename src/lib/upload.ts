import { API_BASE } from './config';

export interface UploadedFile {
  fileUrl: string;
  mimeType: string;
  size: number;
  name: string;
}

/** Upload a file to the AVANCE storage API (org-scoped, auth required). */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const { getAuthHeaders } = await import('../stores/auth.store');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/files/upload`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    credentials: 'include',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message ?? 'Upload failed');
  }
  return data.data as UploadedFile;
}
