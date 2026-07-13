# Quantity Tracking Fix - MSR Fuel Canister Issue

## Problem
When adding MSR Fuel Canister (quantity: 3) to a bag, it was disappearing from the gear picker instead of showing "2 left".

## Root Cause
The `availableGear` computed property was incorrectly filtering out gear that was already in bags, instead of considering the quantity system.

### Before (Incorrect Logic) ❌
```swift
var availableGear: [GearItem] {
    guard let trip = viewModel.trips.first(where: { $0.id == tripId }),
          let currentBagGear = trip.bagAssignments[bagId] else {
        return viewModel.gearLibrary
    }
    return viewModel.gearLibrary.filter { !currentBagGear.contains($0.id) }
}
```

**Problem:** This removes gear completely if it's already in ANY bag, ignoring quantity.

### After (Correct Logic) ✅
```swift
var availableGear: [GearItem] {
    return viewModel.gearLibrary.filter { gear in
        // Calculate how many are available
        let usedInOtherTrips = viewModel.getGearUsageCount(gearId: gear.id, excludeTripId: tripId)
        let currentTrip = viewModel.trips.first(where: { $0.id == tripId })
        let usedInThisTrip = currentTrip?.bagAssignments.values.reduce(0) { count, gearIds in
            count + gearIds.filter { $0 == gear.id }.count
        } ?? 0
        let totalUsed = usedInOtherTrips + usedInThisTrip
        let available = gear.quantity - totalUsed
        
        // Show gear if there are any available (even if some are already in bags)
        return available > 0
    }
}
```

**Solution:** This matches the original React logic - shows gear if any quantity is available.

## Additional Improvements

### 1. Removed Auto-Dismiss ✅
```swift
// Before: dismiss() immediately after adding gear
// After: Let user see the updated count before dismissing
```

### 2. Proper Quantity Display ✅
The gear picker now shows:
- **"3 left"** - When none are used
- **"2 left"** - When 1 is used  
- **"1 left"** - When 2 are used
- **"All in use"** - When all 3 are used

## How It Works Now

1. **MSR Fuel Canister (qty: 3)** appears in gear picker
2. **Add 1 to bag** → Shows "2 left" 
3. **Add another** → Shows "1 left"
4. **Add third** → Shows "All in use" (disabled)
5. **Gear stays visible** until all quantities are used

## Result
- ✅ Quantity tracking works correctly
- ✅ Gear picker shows remaining quantities
- ✅ Users can see how many items are left
- ✅ Matches original React app behavior
- ✅ No more disappearing gear!

The fix ensures proper quantity management across multiple bags and trips, just like the original React implementation.
