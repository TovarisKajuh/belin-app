import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Browser client on the publishable key. RLS is deny-all for this key, so it
// cannot read or write tables. Its only job is storage.uploadToSignedUrl,
// which is authorized by a per-file signed token minted on the server, not by RLS.
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public environment variables are missing.");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
