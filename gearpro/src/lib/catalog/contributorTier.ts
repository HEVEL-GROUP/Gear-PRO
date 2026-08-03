// Terrain-themed contributor ladder -- named after this app's own hero copy
// ("Elk Season · Bighorns") rather than generic bronze/silver/gold, since
// that's the language the target audience (Rokslide/Hunt Talk regulars)
// already reads as aspirational.
//
// Credits PARTICIPATION (user_profiles.weight_contributions_count: any
// distinct product a user has ever submitted a weight for), not whether
// their specific number was accepted into consensus -- simpler to explain,
// and avoids a real user asking "why didn't mine count."

export type ContributorTier = {
  name: string;
  threshold: number;
  /** Points needed for the next tier, or null if this is the top tier. */
  nextThreshold: number | null;
};

const TIERS: readonly { name: string; threshold: number }[] = [
  { name: 'Scout', threshold: 1 },
  { name: 'Basecamp', threshold: 10 },
  { name: 'Timberline', threshold: 50 },
  { name: 'Bighorn', threshold: 150 },
];

// Returns null below the first tier's threshold (no badge yet) rather than
// a "tier zero" -- someone with 0 contributions hasn't earned a rank, they
// just haven't started.
export function getContributorTier(contributionCount: number): ContributorTier | null {
  let current: ContributorTier | null = null;
  for (let i = 0; i < TIERS.length; i++) {
    if (contributionCount < TIERS[i].threshold) break;
    const next = TIERS[i + 1];
    current = { name: TIERS[i].name, threshold: TIERS[i].threshold, nextThreshold: next ? next.threshold : null };
  }
  return current;
}
