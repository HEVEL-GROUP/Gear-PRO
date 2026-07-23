import { supabase } from '@/lib/supabase/client';

export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
    'delete-account',
  );
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? 'Account deletion did not complete');
}
