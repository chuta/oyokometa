/** Public project URL. Never put the service role key in the browser. */
export const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://vpvhshoxwaorrwtaxvdb.supabase.co";
