# Setup Instructions for GearPro2

## Adding Files to Xcode Project

Since new Swift files were created outside of Xcode, you'll need to add them to your Xcode project:

### Option 1: Quick Add (Recommended)

1. Open `GearPro2.xcodeproj` in Xcode
2. In Finder, navigate to the `GearPro2` folder
3. Select all the new folders:
   - `Models` folder
   - `ViewModels` folder  
   - `Views` folder (including the `Modals` subfolder)
4. Drag and drop them into the Xcode project navigator (left sidebar)
5. In the dialog that appears:
   - ✅ Check "Copy items if needed"
   - ✅ Check "Create groups"
   - ✅ Select your app target (GearPro2)
   - Click "Finish"

### Option 2: Manual Add

1. Open `GearPro2.xcodeproj` in Xcode
2. Right-click on the `GearPro2` folder in the project navigator
3. Select "Add Files to GearPro2..."
4. Navigate to and select the folders/files
5. Make sure to:
   - ✅ Check "Copy items if needed"
   - ✅ Check "Create groups"
   - ✅ Select your app target
   - Click "Add"

### Files to Add:

**Models/** (4 files)
- `GearItem.swift`
- `Bag.swift`
- `Trip.swift`
- `GearAlert.swift`

**ViewModels/** (1 file)
- `GearTrackerViewModel.swift`

**Views/** (4 main files + 6 modal files)
- `MainView.swift`
- `DashboardView.swift`
- `PackingView.swift`
- `GearLibraryView.swift`
- `TripsView.swift`

**Views/Modals/** (6 files)
- `AddGearView.swift`
- `EditGearView.swift`
- `AddTripView.swift`
- `GearPickerView.swift`
- `ManageBagsView.swift`
- `TripSummaryView.swift`

## Verification

After adding the files:

1. Build the project (⌘B)
2. Fix any missing imports or references
3. Run on simulator or device (⌘R)

## Common Issues

### "Cannot find type 'X' in scope"
- Make sure all files are added to your target
- Check target membership in File Inspector (right sidebar)

### "No such module 'X'"
- Clean build folder (⌘⇧K)
- Rebuild (⌘B)

### Files showing in gray
- Right-click the file
- Select "Show File Inspector" (⌘⌥1)
- Check the "Target Membership" section
- Ensure your app target is checked

## Project Organization

Your Xcode project navigator should look like this:

```
GearPro2/
├── GearPro2App.swift
├── ContentView.swift
├── Models/
│   ├── GearItem.swift
│   ├── Bag.swift
│   ├── Trip.swift
│   └── GearAlert.swift
├── ViewModels/
│   └── GearTrackerViewModel.swift
├── Views/
│   ├── MainView.swift
│   ├── DashboardView.swift
│   ├── PackingView.swift
│   ├── GearLibraryView.swift
│   ├── TripsView.swift
│   └── Modals/
│       ├── AddGearView.swift
│       ├── EditGearView.swift
│       ├── AddTripView.swift
│       ├── GearPickerView.swift
│       ├── ManageBagsView.swift
│       └── TripSummaryView.swift
└── Assets.xcassets/
```

## Testing

Once everything builds successfully:

1. Launch the app
2. You should see the Dashboard with sample data
3. Navigate through all 4 tabs:
   - Home (Dashboard)
   - Pack (Packing View)
   - Gear (Gear Library)
   - Trips (All Trips)
4. Test adding/editing gear, creating trips, and packing bags

## Next Steps

- Customize the sample data in `GearTrackerViewModel.swift`
- Add data persistence (UserDefaults or Core Data)
- Customize colors and styling to your preference
- Add your own gear and plan your first trip!

Enjoy your gear tracking app! 🎒🏕️

