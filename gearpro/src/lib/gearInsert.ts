import { supabase } from '@/lib/supabase/client';
import { toGearRow } from '@/lib/sync/index';
import type { GearItem } from '@/store/useGearStore';

export const GEAR_INSERT_ERROR =
  "Couldn't save this gear to your account. Check your connection and try again.";

/** User-facing copy for a failed gear_items insert. Null when the insert succeeded. */
export function visibleGearInsertError(error: { message?: string } | null | undefined): string | null {
  if (!error) return null;
  return GEAR_INSERT_ERROR;
}

export async function insertGearItem(
  userId: string,
  gear: GearItem,
): Promise<{ error: { message: string } | null }> {
  try {
    const { error } = await supabase.from('gear_items').upsert([toGearRow(userId, gear)]);
    if (error) return { error: { message: error.message ?? 'Insert failed' } };
    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Insert failed';
    return { error: { message } };
  }
}
