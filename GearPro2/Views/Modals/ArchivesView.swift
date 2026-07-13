//
//  ArchivesView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct ArchivesView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.dismiss) var dismiss
    
    @State private var selectedTrip: Trip?
    @State private var showCopyConfirmation = false
    @State private var tripToCopy: Trip?
    
    var body: some View {
        NavigationView {
            List {
                if viewModel.getArchivedTrips().isEmpty {
                    emptyState
                } else {
                    ForEach(viewModel.getArchivedTrips()) { trip in
                        ArchivedTripRow(trip: trip) { actionTrip in
                            switch actionTrip {
                            case .copy(let trip):
                                tripToCopy = trip
                                showCopyConfirmation = true
                            case .unarchive(let trip):
                                viewModel.unarchiveTrip(id: trip.id)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Trip Archives")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .alert("Copy Trip", isPresented: $showCopyConfirmation) {
                Button("Copy") {
                    if let trip = tripToCopy {
                        if let copiedTrip = viewModel.copyTrip(id: trip.id) {
                            print("Successfully copied trip: \(copiedTrip.name)")
                        } else {
                            print("Failed to copy trip")
                        }
                    }
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("This will create a copy of '\(tripToCopy?.name ?? "")' with the same gear assignments. The new trip will be set to upcoming status.")
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "archivebox")
                .font(.system(size: 48))
                .foregroundColor(.gray.opacity(0.5))
            Text("No Archived Trips")
                .font(.headline)
                .foregroundColor(.secondary)
            Text("Completed trips will appear here")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: 200)
        .listRowBackground(Color.clear)
    }
}

struct ArchivedTripRow: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    let trip: Trip
    let onAction: (ArchivedTripAction) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Trip Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(trip.name)
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    Text(trip.location)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack(spacing: 8) {
                        Text(formatDate(trip.date))
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text("•")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text("Archived \(formatDate(trip.dateArchived ?? Date()))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(String(format: "%.1f", viewModel.calculateTripWeight(tripId: trip.id))) lbs")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.blue)
                    
                    Text("\(getGearCount()) items")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            // Action Buttons
            HStack(spacing: 12) {
                Button(action: {
                    onAction(.copy(trip))
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "doc.on.doc")
                        Text("Copy Trip")
                    }
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.1))
                    .foregroundColor(.blue)
                    .cornerRadius(8)
                }
                
                Button(action: {
                    onAction(.unarchive(trip))
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.up.bin")
                        Text("Unarchive")
                    }
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.green.opacity(0.1))
                    .foregroundColor(.green)
                    .cornerRadius(8)
                }
                
                Spacer()
            }
        }
        .padding(.vertical, 8)
    }
    
    private func getGearCount() -> Int {
        return trip.bagAssignments.values.flatMap { $0 }.count
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
}

enum ArchivedTripAction {
    case copy(Trip)
    case unarchive(Trip)
}

#Preview {
    ArchivesView()
        .environmentObject(GearTrackerViewModel())
}
