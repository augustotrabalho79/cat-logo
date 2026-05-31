import { createClient } from "@supabase/supabase-js";

// Config pública do Supabase
// A anon key é segura no frontend — autorização é feita por RLS no banco.
// Nunca colocar SERVICE_ROLE aqui.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) ??
  "https://xlsujjgfvklthdwrafrx.supabase.co";

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsc3VqamdmdmtsdGhkd3JhZnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODgzOTMsImV4cCI6MjA5NTc2NDM5M30.2N2sFOhnmXNK_UDIyH1M1R1KMan23ho-5WBGmx94Uno";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
