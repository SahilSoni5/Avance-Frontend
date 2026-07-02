'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@crm/shared';
import { apiFetch } from '../lib/api';
import { formatDateIST } from '../lib/locale';
import { useAuthStore } from '../stores/auth.store';
import { ModulePage, LoadingRows, ErrorMessage, formatCurrency, OwnerCell, StatusBadge } from '../components/ModulePage';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Badge, SectionCard } from '../components/ui';

interface DealDetail {
  id: string;
  name: string;
  value: string;
  currency: string;
  closeDate: string | null;
  approvalRequired: boolean;
  approvalStatus: string | null;
  owner: { firstName: string; lastName: string };
  stage: { name: string; color: string | null } | null;
  account: { id: string; name: string } | null;
  approvals: Array<{
    managerApprovalStatus: string | null;
    bossApprovalStatus: string | null;
    rejectionReason: string | null;
  }>;
}

interface LineItem {
  id: string;
  quantity: number;
  unitPrice: string;
  product: { name: string; sku: string };
}

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => apiFetch<{ data: DealDetail }>(`/deals/${id}`),
    enabled: !!id,
  });

  const { data: lineItems } = useQuery({
    queryKey: ['deal-line-items', id],
    queryFn: () => apiFetch<{ data: LineItem[] }>(`/deals/${id}/line-items`),
    enabled: !!id,
  });

  const deal = data?.data;
  const approval = deal?.approvals?.[0];

  if (isLoading) return <ModulePage title="Deal"><LoadingRows /></ModulePage>;
  if (error || !deal) return <ModulePage title="Deal"><ErrorMessage error={error ?? 'Not found'} /></ModulePage>;

  return (
    <ModulePage title={deal.name} description={deal.stage?.name ?? undefined}>
      <Breadcrumbs items={[{ label: 'Deals', href: '/deals' }, { label: deal.name }]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Line Items">
            <table className="w-full text-sm -mt-2">
              <thead>
                <tr className="text-left text-slate-500 border-b dark:border-slate-800">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems?.data?.length ? lineItems.data.map((item) => (
                  <tr key={item.id} className="border-b dark:border-slate-800">
                    <td className="py-2 font-medium">{item.product.name}</td>
                    <td className="py-2 text-slate-500">{item.product.sku}</td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right">{formatCurrency(Number(item.unitPrice) * item.quantity)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-4 text-slate-500 text-center">No line items</td></tr>
                )}
              </tbody>
            </table>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Summary">
            <dl className="space-y-3 text-sm -mt-2">
              <div><dt className="text-slate-500">Value</dt><dd className="text-xl font-bold">{formatCurrency(deal.value, deal.currency)}</dd></div>
              <div><dt className="text-slate-500">Stage</dt><dd>{deal.stage ? <Badge>{deal.stage.name}</Badge> : '—'}</dd></div>
              <div><dt className="text-slate-500">Owner</dt><dd><OwnerCell owner={deal.owner} /></dd></div>
              <div><dt className="text-slate-500">Close Date</dt><dd>{deal.closeDate ? formatDateIST(deal.closeDate) : '—'}</dd></div>
              {deal.account && <div><dt className="text-slate-500">Account</dt><dd>{deal.account.name}</dd></div>}
            </dl>
          </SectionCard>

          {deal.approvalRequired && (
            <SectionCard title="Approval Status">
              <div className="space-y-3 -mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overall</span>
                  <StatusBadge status={deal.approvalStatus ?? 'PENDING'} />
                </div>
                {approval && (
                  <>
                    {(user?.role === Role.MANAGER || user?.role === Role.BOSS || user?.role === Role.ADMIN) && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Manager</span>
                        <Badge variant={approval.managerApprovalStatus === 'APPROVED' ? 'success' : 'warning'}>
                          {approval.managerApprovalStatus ?? 'Pending'}
                        </Badge>
                      </div>
                    )}
                    {(user?.role === Role.BOSS || user?.role === Role.ADMIN) && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Boss</span>
                        <Badge variant={approval.bossApprovalStatus === 'APPROVED' ? 'success' : 'warning'}>
                          {approval.bossApprovalStatus ?? 'Pending'}
                        </Badge>
                      </div>
                    )}
                    {approval.rejectionReason && (
                      <p className="text-sm text-red-600">{approval.rejectionReason}</p>
                    )}
                  </>
                )}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </ModulePage>
  );
}
