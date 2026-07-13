//
//  TripCheckInView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct TripCheckInView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.dismiss) var dismiss
    
    let trip: Trip
    @State private var checkInItems: [CheckInItem] = []
    @State private var isComplete = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Header
                    headerSection
                    
                    // Trip Summary
                    tripSummarySection
                    
                    // Check-in Items
                    checkInItemsSection
                    
                    // Complete Button
                    if !checkInItems.isEmpty {
                        completeButton
                    }
                }
                .padding()
            }
            .navigationTitle("Trip Check-In")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                loadCheckInItems()
            }
        }
    }
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(trip.name)
                .font(.title2)
                .fontWeight(.bold)
            
            Text(trip.location)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text("Confirm what gear you brought back and update consumable levels")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private var tripSummarySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Trip Summary")
                .font(.headline)
            
            HStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Total Items")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(checkInItems.count)")
                        .font(.title2)
                        .fontWeight(.bold)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Consumables")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(checkInItems.filter { $0.gear.isConsumable == true }.count)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Confirmed")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(checkInItems.filter { $0.status == .confirmed }.count)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private var checkInItemsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Gear Check-In")
                .font(.headline)
            
            if checkInItems.isEmpty {
                emptyState
            } else {
                ForEach(checkInItems) { item in
                    CheckInItemRow(item: item) { updatedItem in
                        updateCheckInItem(updatedItem)
                    }
                }
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 48))
                .foregroundColor(.green.opacity(0.5))
            Text("No gear to check in")
                .font(.headline)
                .foregroundColor(.secondary)
            Text("This trip has no packed gear")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: 200)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private var completeButton: some View {
        let allProcessed = checkInItems.allSatisfy { $0.status != .pending }
        let confirmedCount = checkInItems.filter { $0.status == .confirmed }.count
        let missingCount = checkInItems.filter { $0.status == .missing }.count
        
        return Button(action: {
            completeCheckIn()
        }) {
            VStack(spacing: 4) {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Complete Check-In")
                }
                .fontWeight(.bold)
                
                Text("\(confirmedCount) confirmed • \(missingCount) missing")
                    .font(.caption)
                    .opacity(0.8)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(allProcessed ? Color.green : Color.gray)
            .foregroundColor(.white)
            .cornerRadius(16)
        }
        .disabled(!allProcessed)
        .shadow(color: .black.opacity(0.1), radius: 10)
    }
    
    private func loadCheckInItems() {
        var items: [CheckInItem] = []
        
        // Collect all gear from all bags in this trip
        for (bagId, gearIds) in trip.bagAssignments {
            guard let bag = viewModel.bags.first(where: { $0.id == bagId }) else { continue }
            
            for gearId in gearIds {
                if let gear = viewModel.gearLibrary.first(where: { $0.id == gearId }) {
                    items.append(CheckInItem(
                        id: UUID(),
                        gear: gear,
                        bagName: bag.name,
                        status: .pending,
                        consumableUsed: gear.isConsumable == true ? 0 : nil
                    ))
                }
            }
        }
        
        checkInItems = items
    }
    
    private func updateCheckInItem(_ item: CheckInItem) {
        if let index = checkInItems.firstIndex(where: { $0.id == item.id }) {
            checkInItems[index] = item
            print("Updated item: \(item.gear.name) - Status: \(item.status)")
        }
    }
    
    private func completeCheckIn() {
        print("Starting check-in completion...")
        
        // Handle missing gear
        for item in checkInItems {
            if item.status == .missing {
                print("Reporting missing gear: \(item.gear.name) (ID: \(item.gear.id))")
                viewModel.reportMissingGear(
                    gearId: item.gear.id,
                    tripId: trip.id,
                    tripName: trip.name,
                    bagName: item.bagName
                )
            }
        }
        
        // Update consumable stock levels for confirmed items only
        for item in checkInItems {
            if item.status == .confirmed,
               let isConsumable = item.gear.isConsumable, isConsumable,
               let used = item.consumableUsed {
                
                let currentStock = item.gear.stockLevel ?? 100
                let newStock = max(0, currentStock - used)
                
                print("Updating \(item.gear.name): \(currentStock)% -> \(newStock)%")
                
                var updatedGear = item.gear
                updatedGear.stockLevel = newStock
                viewModel.updateGear(updatedGear)
            }
        }
        
        // Mark trip as completed
        var updatedTrip = trip
        updatedTrip.status = .completed
        if let index = viewModel.trips.firstIndex(where: { $0.id == trip.id }) {
            viewModel.trips[index] = updatedTrip
            print("Trip marked as completed")
            
            // Automatically archive the trip after check-in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                viewModel.archiveTrip(id: trip.id)
            }
        }
        
        print("Check-in completed, dismissing...")
        dismiss()
    }
}

struct CheckInItem: Identifiable {
    let id: UUID
    let gear: GearItem
    let bagName: String
    var status: CheckInStatus
    var consumableUsed: Int? // Percentage used for consumables
}

enum CheckInStatus {
    case pending
    case confirmed
    case missing
}

struct CheckInItemRow: View {
    let item: CheckInItem
    let onUpdate: (CheckInItem) -> Void
    
    @State private var currentItem: CheckInItem
    
    init(item: CheckInItem, onUpdate: @escaping (CheckInItem) -> Void) {
        self.item = item
        self.onUpdate = onUpdate
        self._currentItem = State(initialValue: item)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Gear Info
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(item.gear.brand) \(item.gear.name)")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    Text("in \(item.bagName)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text("\(String(format: "%.2f", item.gear.weight)) lbs")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Status Buttons
            HStack(spacing: 12) {
                statusButton(.confirmed, "Brought Back", "checkmark.circle.fill", .green)
                statusButton(.missing, "Missing", "xmark.circle.fill", .red)
            }
            
            // Consumable Usage (if applicable)
            if let isConsumable = item.gear.isConsumable, isConsumable {
                consumableUsageSection
            }
        }
        .padding()
        .background(backgroundColor)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(borderColor, lineWidth: 2)
        )
    }
    
    private func statusButton(_ status: CheckInStatus, _ title: String, _ icon: String, _ color: Color) -> some View {
        Button(action: {
            currentItem.status = status
            onUpdate(currentItem)
        }) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                Text(title)
            }
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(currentItem.status == status ? color : color.opacity(0.1))
            .foregroundColor(currentItem.status == status ? .white : color)
            .cornerRadius(8)
        }
    }
    
    private var consumableUsageSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("How much did you use?")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.orange)
            
            HStack {
                Text("Used:")
                    .font(.caption)
                
                Spacer()
                
                Stepper("\(currentItem.consumableUsed ?? 0)%", value: Binding(
                    get: { currentItem.consumableUsed ?? 0 },
                    set: { newValue in
                        currentItem.consumableUsed = newValue
                        onUpdate(currentItem)
                    }
                ), in: 0...100, step: 5)
                .font(.caption)
            }
            
            if let used = currentItem.consumableUsed {
                let remaining = (item.gear.stockLevel ?? 100) - used
                Text("New stock level: \(max(0, remaining))%")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.top, 8)
    }
    
    private var backgroundColor: Color {
        switch currentItem.status {
        case .pending: return Color.gray.opacity(0.05)
        case .confirmed: return Color.green.opacity(0.05)
        case .missing: return Color.red.opacity(0.05)
        }
    }
    
    private var borderColor: Color {
        switch currentItem.status {
        case .pending: return Color.gray.opacity(0.2)
        case .confirmed: return Color.green.opacity(0.3)
        case .missing: return Color.red.opacity(0.3)
        }
    }
}

#Preview {
    let vm = GearTrackerViewModel()
    return TripCheckInView(trip: vm.trips[0])
        .environmentObject(vm)
}

