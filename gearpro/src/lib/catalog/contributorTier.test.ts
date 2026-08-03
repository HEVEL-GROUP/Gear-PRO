import { getContributorTier } from './contributorTier';

describe('getContributorTier', () => {
  it('returns null below the first tier', () => {
    expect(getContributorTier(0)).toBeNull();
  });

  it('reaches Scout at exactly the threshold', () => {
    expect(getContributorTier(1)).toEqual({ name: 'Scout', threshold: 1, nextThreshold: 10 });
  });

  it('stays at Scout right up to the next threshold', () => {
    expect(getContributorTier(9)?.name).toBe('Scout');
  });

  it('advances through Basecamp and Timberline', () => {
    expect(getContributorTier(10)?.name).toBe('Basecamp');
    expect(getContributorTier(50)?.name).toBe('Timberline');
  });

  it('caps at Bighorn with no next threshold', () => {
    expect(getContributorTier(150)).toEqual({ name: 'Bighorn', threshold: 150, nextThreshold: null });
    expect(getContributorTier(10000)?.name).toBe('Bighorn');
  });
});
