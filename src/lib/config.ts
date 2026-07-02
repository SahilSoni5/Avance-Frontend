// API origin is configurable for split deployments (e.g. frontend on Vercel,
// API on a separate host). Set NEXT_PUBLIC_API_URL to the API origin WITHOUT a
// trailing slash and WITHOUT /api, e.g. https://api.yourdomain.com.
// When unset, requests go to the same origin under /api (Next.js rewrites in
// local dev, and same-host production deployments).
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export const API_ORIGIN = apiOrigin;
export const API_BASE = `${apiOrigin}/api`;
