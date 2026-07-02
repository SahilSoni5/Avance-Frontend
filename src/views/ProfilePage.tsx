'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, Globe, Camera, Key, ChevronRight,
  Crown, Shield, UserCircle, GraduationCap, KeyRound, Loader2, ChevronDown,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { uploadFile } from '../lib/upload';
import { useAuthStore } from '../stores/auth.store';
import { Button, Dialog } from '../components/ui';
import { RecordForm } from '../components/RecordForm';
import { cn } from '../lib/utils';

interface UserProfile {
  id: string; firstName: string; lastName: string; email: string;
  phone: string | null; timezone: string | null; avatar: string | null;
  role: string; hierarchyLevel: number; isActive: boolean;
  reportsTo: { id: string; firstName: string; lastName: string; role: string } | null;
  directReports: { id: string; firstName: string; lastName: string; role: string }[];
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; style: string }> = {
  BOSS: { label: 'Boss', icon: Crown, style: 'bg-amber-100 text-amber-700 border border-amber-200' },
  MANAGER: { label: 'Manager', icon: Shield, style: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
  EMPLOYEE: { label: 'Employee', icon: UserCircle, style: 'bg-slate-100 text-slate-700 border border-slate-200' },
  INTERN: { label: 'Intern', icon: GraduationCap, style: 'bg-gray-100 text-gray-600 border border-gray-200' },
  ADMIN: { label: 'Admin', icon: KeyRound, style: 'bg-rose-100 text-rose-700 border border-rose-200' },
};

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role] ?? { label: role, icon: User, style: 'bg-muted text-muted-foreground' };
  const { icon: Icon } = config;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold', config.style)}>
      <Icon className="w-3.5 h-3.5" /> {config.label}
    </span>
  );
}

export function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => apiFetch<{ data: UserProfile }>('/auth/me'),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch(`/users/${user?.id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-profile'] }); setEditOpen(false); },
  });

  const changePwdMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => setPwdOpen(false),
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await uploadFile(file);
      return apiFetch('/users/profile', { method: 'PATCH', body: JSON.stringify({ avatar: uploaded.fileUrl }) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });

  const profile = data?.data as UserProfile | undefined;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 max-w-3xl">
        {/* Avatar + Name */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 mb-4">
          <div className="flex items-start gap-5">
            <div className="relative">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.firstName} className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg">
                  {initials}
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) avatarMutation.mutate(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={avatarMutation.isPending}
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md disabled:opacity-50"
              >
                {avatarMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{profile.firstName} {profile.lastName}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <RoleBadge role={profile.role} />
                <span className={cn('text-xs px-2 py-1 rounded-full border', profile.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200')}>
                  {profile.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>Edit Profile</Button>
          </div>
        </div>

        {/* Contact info */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 mb-4">
          <h3 className="font-semibold text-foreground mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Mail, label: 'Email', value: profile.email },
              { icon: Phone, label: 'Phone', value: profile.phone ?? '—' },
              { icon: Globe, label: 'Timezone', value: profile.timezone ?? '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hierarchy */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 mb-4">
          <h3 className="font-semibold text-foreground mb-4">Hierarchy</h3>
          {profile.reportsTo && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Reports To</p>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                  {profile.reportsTo.firstName[0]}{profile.reportsTo.lastName[0]}
                </div>
                <span className="text-sm text-foreground">{profile.reportsTo.firstName} {profile.reportsTo.lastName}</span>
                <RoleBadge role={profile.reportsTo.role} />
              </div>
            </div>
          )}
          {profile.directReports.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Direct Reports ({profile.directReports.length})</p>
              <div className="space-y-1.5">
                {profile.directReports.map(r => (
                  <div key={r.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                      {r.firstName[0]}{r.lastName[0]}
                    </div>
                    <span className="text-sm text-foreground">{r.firstName} {r.lastName}</span>
                    <RoleBadge role={r.role} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {!profile.reportsTo && profile.directReports.length === 0 && (
            <p className="text-sm text-muted-foreground">No hierarchy information available</p>
          )}
        </div>

        {/* Security */}
        <div className="bg-card border border-border/60 rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Security</h3>
          <button
            type="button"
            onClick={() => setPwdOpen(true)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Change Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        <RecordForm
          fields={[
            { name: 'firstName', label: 'First Name', required: true },
            { name: 'lastName', label: 'Last Name', required: true },
            { name: 'phone', label: 'Phone' },
            { name: 'timezone', label: 'Timezone (e.g. Asia/Kolkata)' },
          ]}
          defaultValues={{ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone ?? '', timezone: profile.timezone ?? '' }}
          loading={updateMutation.isPending}
          submitLabel="Save Changes"
          onSubmit={values => updateMutation.mutate(values as unknown as Record<string, string>)}
        />
      </Dialog>

      <Dialog open={pwdOpen} onClose={() => setPwdOpen(false)} title="Change Password">
        <RecordForm
          fields={[
            { name: 'currentPassword', label: 'Current Password', type: 'password', required: true },
            { name: 'newPassword', label: 'New Password', type: 'password', required: true },
          ]}
          loading={changePwdMutation.isPending}
          submitLabel="Change Password"
          onSubmit={values => changePwdMutation.mutate(values as unknown as Record<string, string>)}
        />
      </Dialog>
    </div>
  );
}
