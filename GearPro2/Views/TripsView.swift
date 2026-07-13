//
//  TripsView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct TripsView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Binding var selectedTrip: Trip?
    @Binding var selectedBag: String?
    @Binding var activeTab: NavigationTab
    
    @State private var showAddTrip = false
    @State private var tripToDelete: Trip?
    @State private var showDeleteAlert = false
    @State private var showCheckIn: Trip?
    @State private var showArchives = false
    @State private var showEditTrip: Trip?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                headerSection
                tripsList
            }
            .padding(.bottom, 20)
        }
        .sheet(isPresented: $showAddTrip) {
            AddTripView()
        }
        .sheet(item: $showCheckIn) { trip in
            TripCheckInView(trip: trip)
        }
        .sheet(isPresented: $showArchives) {
            ArchivesView()
        }
        .sheet(item: $showEditTrip) { trip in
            EditTripView(trip: trip)
        }
        .alert("Delete Trip", isPresented: $showDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                if let trip = tripToDelete {
                    viewModel.deleteTrip(id: trip.id)
                    if selectedTrip?.id == trip.id {
                        selectedTrip = nil
                    }
                }
            }
        } message: {
            Text("This will delete the trip and all its packing lists. This cannot be undone.")
        }
    }
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: {
                activeTab = .dashboard
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                    Text("Back")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
            
            HStack {
                Text("All Trips")
                    .font(.title)
                    .fontWeight(.bold)
                
                Spacer()
                
                HStack(spacing: 12) {
                    Button(action: {
                        showArchives = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "archivebox")
                            Text("Archives")
                        }
                        .foregroundColor(.blue)
                        .fontWeight(.medium)
                    }
                    
                    Button(action: {
                        showAddTrip = true
                    }) {
                        Text("+ New Trip")
                            .foregroundColor(.green)
                            .fontWeight(.medium)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private var tripsList: some View {
        VStack(spacing: 12) {
            ForEach(viewModel.getActiveTrips()) { trip in
                TripCard(
                    trip: trip,
                    weight: viewModel.calculateTripWeight(tripId: trip.id),
                    onPack: {
                        selectedTrip = trip
                        selectedBag = viewModel.bags.first?.id
                        activeTab = .packing
                    },
                    onCheckIn: {
                        showCheckIn = trip
                    },
                    onEdit: {
                        showEditTrip = trip
                    },
                    onDelete: {
                        tripToDelete = trip
                        showDeleteAlert = true
                    }
                )
            }
        }
    }
}

struct TripCard: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    let trip: Trip
    let weight: Double
    let onPack: () -> Void
    let onCheckIn: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(trip.name)
                        .font(.headline)
                        .fontWeight(.bold)
                    
                    Text(trip.location)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Text("\(formattedDate(trip.date)) - \(formattedDate(trip.endDate))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                HStack(spacing: 8) {
                    Button(action: onEdit) {
                        Image(systemName: "pencil")
                            .foregroundColor(.blue)
                    }
                    
                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                    }
                }
            }
            
            HStack(spacing: 12) {
                Button(action: onPack) {
                    Text("Pack Gear")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                
                if shouldShowCheckInButton(for: trip) {
                    Button(action: onCheckIn) {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle")
                            Text("Check-In")
                        }
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(checkInButtonColor(for: trip))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                }
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Weight")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f lbs", weight))
                        .font(.subheadline)
                        .fontWeight(.bold)
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(12)
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
    
    private func shouldShowCheckInButton(for trip: Trip) -> Bool {
        let today = Date()
        let calendar = Calendar.current
        
        // Show check-in button if:
        // 1. Trip is active, OR
        // 2. Today is the trip date, OR  
        // 3. Today is after the trip end date
        return trip.status == .active || 
               calendar.isDate(today, inSameDayAs: trip.date) ||
               today > trip.endDate
    }
    
    private func checkInButtonColor(for trip: Trip) -> Color {
        let today = Date()
        let calendar = Calendar.current
        
        if trip.status == .active {
            return .orange  // Active trip - ready to check in
        } else if calendar.isDate(today, inSameDayAs: trip.date) {
            return .blue    // Trip day - check in available
        } else if today > trip.endDate {
            return .red     // Overdue - trip ended, need to check in
        } else {
            return .orange  // Default
        }
    }
}

#Preview {
    MainView()
}

