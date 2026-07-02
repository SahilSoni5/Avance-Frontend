export const APP_LOCALE = 'en-IN';
export const APP_TIMEZONE = 'Asia/Kolkata';
export const APP_CURRENCY = 'INR';

export function formatCurrencyINR(value: number | string) {
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  return new Intl.NumberFormat(APP_LOCALE, {
    style: 'currency',
    currency: APP_CURRENCY,
  }).format(Number.isFinite(num) ? num : 0);
}

export function formatNumberIN(value: number | string) {
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  return new Intl.NumberFormat(APP_LOCALE).format(Number.isFinite(num) ? num : 0);
}

export function formatDateIST(value: string | Date) {
  return new Date(value).toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE });
}

export function formatDateTimeIST(value: string | Date) {
  return new Date(value).toLocaleString(APP_LOCALE, { timeZone: APP_TIMEZONE });
}

export function formatTimeIST(value: string | Date) {
  return new Date(value).toLocaleTimeString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
