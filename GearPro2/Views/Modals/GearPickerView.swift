//
//  GearPickerView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct GearPickerView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.dismiss) var dismiss
    
    let tripId: Int
    let bagId: String
    
    var availableGear: [GearItem] {
        return viewModel.gearLibrary.filter { gear in
            // Each trip operates independently - only check usage within this trip
            let currentTrip = viewModel.trips.first(where: { $0.id == tripId })
            let usedInThisTrip = currentTrip?.bagAssignments.values.reduce(0) { count, gearIds in
                count + gearIds.filter { $0 == gear.id }.count
            } ?? 0
            
            // Show gear if there are any available within this trip
            return gear.quantity > usedInThisTrip
        }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 12) {
                    if availableGear.isEmpty {
                        emptyState
                    } else {
                        ForEach(availableGear) { gear in
                            gearRow(gear)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Add Gear to \(bagName)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var bagName: String {
        viewModel.bags.first(where: { $0.id == bagId })?.name ?? "Bag"
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "shippingbox")
                .font(.system(size: 48))
                .foregroundColor(.gray.opacity(0.5))
            Text("All gear already packed")
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: 300)
    }
    
    private func gearRow(_ gear: GearItem) -> some View {
        let usedInOtherTrips = viewModel.getGearUsageCount(gearId: gear.id, excludeTripId: tripId)
        let currentTrip = viewModel.trips.first(where: { $0.id == tripId })
        let usedInThisTrip = currentTrip?.bagAssignments.values.reduce(0) { count, gearIds in
            count + gearIds.filter { $0 == gear.id }.count
        } ?? 0
        let totalUsed = usedInOtherTrips + usedInThisTrip
        let available = gear.quantity - totalUsed
        let isUnavailable = available <= 0
        
        return Button(action: {
            if !isUnavailable {
                viewModel.addGearToTrip(tripId: tripId, gearId: gear.id, bagId: bagId)
                // Don't dismiss immediately - let user see the updated count
            }
        }) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text("\(gear.brand) \(gear.name)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(isUnavailable ? .secondary : .primary)
                        
                        if gear.isBaseCamp {
                            Text("⛺ BC")
                                .font(.caption2)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 2)
                                .background(Color.orange.opacity(0.2))
                                .foregroundColor(.orange)
                                .cornerRadius(4)
                        }
                        
                        if gear.quantity > 1 {
                            let badgeColor: Color = isUnavailable ? .red : (available == 1 ? .yellow : .blue)
                            let badgeText = isUnavailable ? "All in use" : "\(available) left"
                            Text(badgeText)
                                .font(.caption2)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 2)
                                .background(badgeColor.opacity(0.2))
                                .foregroundColor(badgeColor)
                                .cornerRadius(4)
                        }
                    }
                    
                    Text("\(gear.category) • \(String(format: "%.2f", gear.weight)) lbs")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if !isUnavailable {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(.green)
                        .font(.title2)
                }
            }
            .padding()
            .background(isUnavailable ? Color.gray.opacity(0.1) : Color(UIColor.systemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isUnavailable ? Color.clear : Color.green.opacity(0.2), lineWidth: 1)
            )
        }
        .disabled(isUnavailable)
    }
}

#Preview {
    let vm = GearTrackerViewModel()
    return GearPickerView(tripId: vm.trips[0].id, bagId: vm.bags[0].id)
        .environmentObject(vm)
}

