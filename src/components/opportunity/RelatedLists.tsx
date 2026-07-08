'use client';

import { FileText, Loader2, Paperclip } from 'lucide-react';
import { LightningSection } from './LightningCard';

export function QuotesList({ loading }: { loading?: boolean }) {
  return (
    <LightningSection title="Quotes (0)" defaultOpen={false}>
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-[#706e6b] justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading quotes…
        </div>
      ) : (
        <p className="text-sm text-[#706e6b] py-4 text-center">No quotes linked to this opportunity.</p>
      )}
    </LightningSection>
  );
}

export function FilesList({ loading }: { loading?: boolean }) {
  return (
    <LightningSection title="Files (0)" defaultOpen={false}>
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-[#706e6b] justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading files…
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-[#706e6b]">
          <Paperclip className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No files attached.</p>
        </div>
      )}
    </LightningSection>
  );
}

export function NotesList() {
  return (
    <LightningSection title="Notes (0)" defaultOpen={false}>
      <div className="flex flex-col items-center py-6 text-[#706e6b]">
        <FileText className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No notes yet.</p>
      </div>
    </LightningSection>
  );
}
