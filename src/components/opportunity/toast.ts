'use client';

type ToastKind = 'success' | 'error';

let toastHost: HTMLDivElement | null = null;

function ensureHost() {
  if (typeof document === 'undefined') return null;
  if (toastHost && document.body.contains(toastHost)) return toastHost;
  toastHost = document.createElement('div');
  toastHost.id = 'sf-toast-host';
  toastHost.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
  document.body.appendChild(toastHost);
  return toastHost;
}

export function showToast(message: string, kind: ToastKind = 'success') {
  const host = ensureHost();
  if (!host) return;

  const el = document.createElement('div');
  const bg = kind === 'success' ? '#2e844a' : '#ba0517';
  el.style.cssText = [
    'pointer-events:auto',
    'min-width:240px',
    'max-width:360px',
    'padding:12px 16px',
    'border-radius:4px',
    'color:#fff',
    `background:${bg}`,
    'box-shadow:0 2px 8px rgba(0,0,0,0.2)',
    'font-family:Salesforce Sans,-apple-system,Segoe UI,Roboto,sans-serif',
    'font-size:13px',
    'font-weight:600',
    'opacity:0',
    'transform:translateY(-6px)',
    'transition:opacity 160ms ease, transform 160ms ease',
  ].join(';');
  el.textContent = message;
  host.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  window.setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    window.setTimeout(() => el.remove(), 180);
  }, 2800);
}
