import 'server-only';
export function configuration() {
  return {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
    intent: Boolean(process.env.OPENAI_API_KEY),
    access: Boolean(process.env.ALLOWED_EMAILS?.trim()),
  };
}
