'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { listProducts } from '@/api/opportunities';
import type { LineItem, LineItemInput } from '@/api/opportunities.types';
import { formatOpportunityCurrency, lineItemTotal } from './utils';
import { LightningSection } from './LightningCard';

interface ProductsListProps {
  items: LineItem[];
  loading?: boolean;
  currency?: string;
  onAdd: (input: LineItemInput) => void;
  onUpdate: (id: string, input: Partial<LineItemInput>) => void;
  onRemove: (id: string) => void;
  saving?: boolean;
  readOnly?: boolean;
}

export function ProductsList({
  items,
  loading,
  currency = 'USD',
  onAdd,
  onUpdate,
  onRemove,
  saving,
  readOnly,
}: ProductsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ productId: '', quantity: 1, unitPrice: 0, discountPct: 0 });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products-picker'],
    queryFn: listProducts,
    enabled: showForm,
  });

  function onProductChange(productId: string) {
    const product = products.find((p) => p.id === productId);
    setForm((f) => ({
      ...f,
      productId,
      unitPrice: product ? Number(product.price) : 0,
    }));
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productId) return;
    onAdd({
      productId: form.productId,
      quantity: form.quantity,
      unitPrice: form.unitPrice,
      discountPct: form.discountPct,
    });
    setForm({ productId: '', quantity: 1, unitPrice: 0, discountPct: 0 });
    setShowForm(false);
  }

  return (
    <LightningSection title={`Products (${items.length})`}>
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[#706e6b] justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading line items…
        </div>
      ) : items.length === 0 && !showForm ? (
        <p className="text-sm text-[#706e6b] py-4 text-center">No products on this opportunity.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#706e6b] border-b border-[#e5e5e5]">
                <th className="pb-2 font-semibold">Product</th>
                <th className="pb-2 font-semibold text-right">Qty</th>
                <th className="pb-2 font-semibold text-right">Unit Price</th>
                <th className="pb-2 font-semibold text-right">Discount %</th>
                <th className="pb-2 font-semibold text-right">Total</th>
                <th className="pb-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[#f3f3f3]">
                  <td className="py-2 font-medium">{item.productName}</td>
                  <td className="py-2 text-right tabular-nums">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        min={1}
                        defaultValue={item.quantity}
                        className="w-16 text-right border rounded px-1"
                        onBlur={(e) => {
                          onUpdate(item.id, { quantity: Number(e.target.value) });
                          setEditingId(null);
                        }}
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatOpportunityCurrency(item.unitPrice, currency)}
                  </td>
                  <td className="py-2 text-right tabular-nums">{item.discount}%</td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {formatOpportunityCurrency(item.total ?? lineItemTotal(item.quantity, item.unitPrice, item.discount), currency)}
                  </td>
                  <td className="py-2 text-right">
                    {!readOnly && (
                      <>
                        <button type="button" onClick={() => setEditingId(item.id)} className="p-1 text-[#0176D3]">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => onRemove(item.id)} className="p-1 text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <form onSubmit={submitAdd} className="mt-3 grid grid-cols-2 gap-2 p-3 bg-[#f3f3f3] rounded text-sm">
          <label className="col-span-2">
            <span className="text-xs text-[#706e6b] font-semibold">Product</span>
            <select
              value={form.productId}
              onChange={(e) => onProductChange(e.target.value)}
              className="mt-1 w-full border rounded px-2 py-1.5 bg-white"
              required
              disabled={productsLoading}
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </label>
          <input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
            placeholder="Qty"
            className="border rounded px-2 py-1.5 text-right"
          />
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.unitPrice}
            onChange={(e) => setForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))}
            placeholder="Unit price"
            className="border rounded px-2 py-1.5 text-right"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={form.discountPct}
            onChange={(e) => setForm((f) => ({ ...f, discountPct: Number(e.target.value) }))}
            placeholder="Discount %"
            className="col-span-2 border rounded px-2 py-1.5 text-right"
          />
          <div className="col-span-2 flex gap-2">
            <button type="submit" disabled={saving || !form.productId} className="text-xs px-3 py-1.5 bg-[#0176D3] text-white rounded disabled:opacity-60">
              Add Product
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 border rounded">
              Cancel
            </button>
          </div>
        </form>
      ) : !readOnly ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-3 inline-flex items-center gap-1 text-xs text-[#0176D3] font-medium hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add Product
        </button>
      ) : null}
    </LightningSection>
  );
}
