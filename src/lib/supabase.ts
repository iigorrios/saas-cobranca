import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Fica claro no console do dev caso o .env.local não esteja configurado.
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local"
  );
}

export const supabase = createClient(url ?? "", anon ?? "");

// Invoca uma Edge Function do projeto (lógica de negócio).
export async function invokeFn<T = unknown>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data as T;
}
