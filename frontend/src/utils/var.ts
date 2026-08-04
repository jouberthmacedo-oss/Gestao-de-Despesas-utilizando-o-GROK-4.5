export const API_URL =
  typeof import.meta.env === 'object'
    ? import.meta.env.VITE_API_URL
    : undefined;
