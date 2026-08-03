import { supabase } from '@/lib/supabase/client';

// Records the weight the user already had to enter for a gear item matched
// to a catalog product (see gear_items.catalog_product_id and
// GearFormModal's applySuggestion) as a submission -- upserted on
// (product_id, user_id), so re-saving the same item with a different weight
// later corrects the submission instead of creating a second one. The
// Postgres side (recompute_catalog_weight trigger, catalog_weight_
// crowdsourcing migration) does the actual median/confidence aggregation;
// this is purely "send the row."
//
// Fire-and-forget: this app is offline-first and used in the backcountry, so
// a failed submission (no signal at a trailhead) is a routine, expected
// outcome -- silently dropped, exactly like a failed catalog search, never
// surfaced as an error on top of an otherwise-successful gear save.
export async function submitCatalogWeight(userId: string, productId: string, weightLb: number): Promise<void> {
  if (!(weightLb > 0)) return;
  try {
    await supabase
      .from('catalog_weight_submissions')
      .upsert({ product_id: productId, user_id: userId, weight_lb: weightLb }, { onConflict: 'product_id,user_id' });
  } catch {
    // best-effort -- see module comment
  }
}
