'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users2, Crown, Mail, Phone, Edit3, UserPlus, UserMinus, Loader2, Shield } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { Button, Dialog } from '../components/ui';
import { Sheet } from '../components/ui/Sheet';
import { RecordForm } from '../components/RecordForm';
import { cn } from '../lib/utils';

interface TeamMemberUser { id: string; firstName: string; lastName: string; role: string; email: string; phone?: string | null }
interface TeamMember { id: string; userId: string; user: TeamMemberUser }
interface Team {
  id: string;
  name: string;
  manager: TeamMemberUser;
  members: TeamMember[];
  _count: { members: number };
}

const ROLE_STYLES: Record<string, string> = {
  BOSS: 'bg-amber-100 text-amber-700',
  MANAGER: 'bg-indigo-100 text-indigo-700',
  EMPLOYEE: 'bg-slate-100 text-slate-700',
  INTERN: 'bg-gray-100 text-gray-600',
  ADMIN: 'bg-rose-100 text-rose-700',
};

function TeamCard({ team, onClick }: { team: Team; onClick: () => void }) {
  const internCount = team.members.filter(m => m.user.role === 'INTERN').length;
  const employeeCount = team.members.filter(m => m.user.role !== 'INTERN').length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{team.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Crown className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-muted-foreground">{team.manager.firstName} {team.manager.lastName}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-muted/40 rounded-xl py-2">
          <p className="text-lg font-extrabold text-foreground">{employeeCount}</p>
          <p className="text-xs text-muted-foreground">Employees</p>
        </div>
        <div className="bg-muted/40 rounded-xl py-2">
          <p className="text-lg font-extrabold text-foreground">{internCount}</p>
          <p className="text-xs text-muted-foreground">Interns</p>
        </div>
      </div>
    </button>
  );
}

function TeamPanel({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['team-detail', teamId],
    queryFn: () => apiFetch<{ data: Team }>(`/teams/${teamId}`),
  });

  const { data: allUsers, refetch: refetchUsers, isFetching: usersFetching } = useQuery({
    queryKey: ['all-users', user?.role],
    queryFn: () =>
      apiFetch<{ data: TeamMemberUser[] }>(
        user?.role === 'ADMIN' || user?.role === 'BOSS' || user?.role === 'MANAGER'
          ? '/users?limit=200&manage=true'
          : '/users?limit=200'
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch(`/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => { refetch(); setEditMode(false); queryClient.invalidateQueries({ queryKey: ['teams'] }); },
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      refetch();
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setAddMemberOpen(false);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => apiFetch(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => refetch(),
  });

  const team = data?.data;
  const eligibleAddRoles = user?.role === 'ADMIN'
    ? ['ADMIN', 'BOSS', 'MANAGER', 'EMPLOYEE', 'INTERN']
    : user?.role === 'BOSS' || user?.role === 'MANAGER'
      ? ['EMPLOYEE', 'INTERN']
      : [];
  const canEdit = user && (
    user.role === 'BOSS' || user.role === 'ADMIN' ||
    (user.role === 'MANAGER' && team?.manager.id === user.id)
  );

  return (
    <Sheet open onClose={onClose} title={team?.name ?? 'Team'}>
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : team ? (
        <div className="px-6 py-4 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">{team.name}</h3>
                <p className="text-xs text-muted-foreground">{team._count.members} members</p>
              </div>
            </div>
            {canEdit && !editMode && (
              <Button size="sm" variant="ghost" onClick={() => setEditMode(true)}>
                <Edit3 className="w-4 h-4 mr-1.5" /> Edit
              </Button>
            )}
          </div>

          {editMode && canEdit && (
            <div className="bg-muted/30 rounded-xl p-4">
              <RecordForm
                fields={[
                  { name: 'name', label: 'Team Name' },
                ]}
                defaultValues={{ name: team.name }}
                loading={updateMutation.isPending}
                submitLabel="Save Changes"
                onSubmit={values => updateMutation.mutate(values as unknown as Record<string, string>)}
              />
              <button type="button" onClick={() => setEditMode(false)} className="text-sm text-muted-foreground hover:text-foreground mt-2">Cancel</button>
            </div>
          )}

          {/* Manager */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Manager</h4>
            <MemberRow member={team.manager} isManager canRemove={false} onRemove={() => {}} />
          </section>

          {/* Members */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Members</h4>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    void refetchUsers();
                    setAddMemberOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Member
                </button>
              )}
            </div>
            <div className="space-y-1">
              {team.members.length === 0 && <p className="text-sm text-muted-foreground">No members yet</p>}
              {team.members.map(m => (
                <MemberRow
                  key={m.id}
                  member={m.user}
                  isManager={false}
                  canRemove={!!canEdit}
                  onRemove={() => removeMemberMutation.mutate(m.userId)}
                />
              ))}
            </div>
          </section>

          {/* Add member dialog */}
          {addMemberOpen && (
            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Add Member</p>
              {addMemberMutation.error && (
                <p className="text-sm text-red-600 mb-3">
                  {addMemberMutation.error instanceof Error
                    ? addMemberMutation.error.message
                    : 'Failed to add member'}
                </p>
              )}
              {usersFetching ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
                </div>
              ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(allUsers?.data ?? [])
                  .filter(u =>
                    u.id !== team.manager.id &&
                    !team.members.some(m => m.userId === u.id) &&
                    eligibleAddRoles.includes(u.role)
                  )
                  .map(u => (
                    <button
                      key={u.id}
                      type="button"
                      disabled={addMemberMutation.isPending}
                      onClick={() => addMemberMutation.mutate(u.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted transition-colors text-sm text-foreground disabled:opacity-50"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <span>{u.firstName} {u.lastName}</span>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full ml-auto', ROLE_STYLES[u.role] ?? 'bg-muted')}>{u.role}</span>
                    </button>
                  ))}
                {(allUsers?.data ?? []).filter(u =>
                  u.id !== team.manager.id &&
                  !team.members.some(m => m.userId === u.id) &&
                  eligibleAddRoles.includes(u.role)
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">
                    No eligible users to add. Create users on the Users page first (Employee or Intern roles work best for teams).
                  </p>
                )}
              </div>
              )}
              <button type="button" onClick={() => setAddMemberOpen(false)} className="text-sm text-muted-foreground hover:text-foreground mt-2">Cancel</button>
            </div>
          )}
        </div>
      ) : null}
    </Sheet>
  );
}

function MemberRow({ member, isManager, canRemove, onRemove }: {
  member: TeamMemberUser; isManager: boolean; canRemove: boolean; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {member.firstName[0]}{member.lastName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">{member.firstName} {member.lastName}</p>
          {isManager && <Crown className="w-3 h-3 text-amber-500" />}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" /> {member.email}</span>
          {member.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" /> {member.phone}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_STYLES[member.role] ?? 'bg-muted text-muted-foreground')}>
          {member.role}
        </span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors ml-1">
            <UserMinus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function TeamsPage() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiFetch<{ data: Team[] }>('/teams'),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['all-users', user?.role],
    queryFn: () =>
      apiFetch<{ data: TeamMemberUser[] }>(
        user?.role === 'ADMIN' || user?.role === 'BOSS'
          ? '/users?limit=200&manage=true'
          : '/users?limit=200'
      ),
    enabled: user?.role === 'BOSS' || user?.role === 'ADMIN',
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/teams', {
        method: 'POST',
        body: JSON.stringify({ name: body.name, managerId: body.managerId || undefined }),
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); setCreateOpen(false); },
  });

  const teams = data?.data ?? [];
  const canCreate = user?.role === 'BOSS' || user?.role === 'ADMIN';
  const managers = (allUsers?.data ?? []).filter(u => u.role === 'MANAGER');

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New Team
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{teams.length} team{teams.length !== 1 ? 's' : ''} in your organisation</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length: 4}).map((_, i) => <div key={i} className="h-40 bg-card border border-border/40 rounded-2xl animate-pulse" />)}
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Users2 className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-medium">No teams yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(t => (
              <TeamCard key={t.id} team={t} onClick={() => setSelectedTeamId(t.id)} />
            ))}
          </div>
        )}
      </div>

      {selectedTeamId && <TeamPanel teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New Team">
        <RecordForm
          fields={[
            { name: 'name', label: 'Team Name', required: true },
            {
              name: 'managerId', label: 'Manager', type: 'select',
              options: managers.map(m => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
            },
          ]}
          loading={createMutation.isPending}
          submitLabel="Create Team"
          onSubmit={values => createMutation.mutate(values as unknown as Record<string, string>)}
        />
      </Dialog>
    </div>
  );
}
