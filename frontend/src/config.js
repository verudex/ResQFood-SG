// Vite exposes only VITE_-prefixed variables to client code. The fallback keeps
// local development working with no .env file. Trailing slashes are stripped
// so paths join cleanly.
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');
