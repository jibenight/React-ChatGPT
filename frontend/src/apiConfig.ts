// Central API base URL used by the frontend.
// In production, fallback to same-origin if VITE_API_URL is not provided.
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '');
