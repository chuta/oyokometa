/** Supabase transaction pooler (port 6543) does not support prepared statements. */
export function postgresClientOptions(url: string) {
  const isSupabase = /supabase\.(co|com)/i.test(url) || /pooler\.supabase/i.test(url);
  const isPooler = /:6543\b/.test(url) || /pooler/i.test(url);
  return {
    max: isPooler ? 5 : 10,
    prepare: !isPooler,
    ssl: isSupabase ? ("require" as const) : undefined,
  };
}
