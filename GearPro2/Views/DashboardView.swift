//
//  DashboardView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Binding var selectedTrip: Trip?
    @Binding var selectedBag: String?
    @Binding var activeTab: NavigationTab
    @State private var showAddTrip = false
    @State private var showMissingGear = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Hero Card
                if let nextTrip = viewModel.getNextTrip() {
                    nextTripCard(nextTrip)
                } else {
                    noTripsCard
                }
                
                // Quick Stats
                quickStats
                
                // Alerts (includes missing gear and other alerts)
                if !viewModel.alerts.isEmpty || viewModel.getMissingGearCount() > 0 {
                    alertsSection
                }
                
                // Upcoming Trips
                allTripsSection
            }
            .padding(.bottom, 20)
        }
        .sheet(isPresented: $showAddTrip) {
            AddTripView()
        }
        .sheet(isPresented: $showMissingGear) {
            MissingGearView()
        }
    }
    
    private func nextTripCard(_ trip: Trip) -> some View {
        ZStack {
            LinearGradient(
                colors: [.green, Color.green.opacity(0.8)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Next Adventure")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.9))
                        Text(trip.name)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        Text("📍 \(trip.location) • \(formattedDate(trip.date))")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.9))
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing) {
                        Text("Pack Weight")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.8))
                        HStack(alignment: .firstTextBaseline, spacing: 2) {
                            Text(String(format: "%.1f", viewModel.calculateTripWeight(tripId: trip.id)))
                                .font(.system(size: 36, weight: .bold))
                            Text("lbs")
                                .font(.caption)
                        }
                        .foregroundColor(.white)
                    }
                }
                
                HStack(spacing: 12) {
                    Button(action: {
                        selectedTrip = trip
                        selectedBag = viewModel.bags.first?.id
                        activeTab = .packing
                    }) {
                        Text("Start Packing")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.white)
                            .foregroundColor(.green)
                            .cornerRadius(12)
                    }
                    
                    Button(action: {
                        activeTab = .packing
                    }) {
                        Image(systemName: "gearshape.fill")
                            .font(.title3)
                            .foregroundColor(.white)
                            .frame(width: 50, height: 50)
                            .background(Color.green.opacity(0.3))
                            .cornerRadius(12)
                    }
                }
            }
            .padding()
        }
        .cornerRadius(24)
        .shadow(color: .black.opacity(0.2), radius: 10)
    }
    
    private var noTripsCard: some View {
        ZStack {
            LinearGradient(
                colors: [.gray, Color.gray.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 12) {
                Image(systemName: "calendar")
                    .font(.system(size: 48))
                    .foregroundColor(.white.opacity(0.7))
                Text("No Upcoming Trips")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                Text("Plan your next adventure")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
                
                Button(action: {
                    showAddTrip = true
                }) {
                    Text("Create New Trip")
                        .fontWeight(.semibold)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color.white)
                        .foregroundColor(.gray)
                        .cornerRadius(12)
                }
            }
            .padding()
        }
        .frame(height: 200)
        .cornerRadius(24)
        .shadow(color: .black.opacity(0.2), radius: 10)
    }
    
    private var missingGearAlertRow: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Missing Gear")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text("\(viewModel.getMissingGearCount()) items need attention")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button(action: {
                showMissingGear = true
            }) {
                Text("Manage")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.red)
            }
        }
        .padding()
        .background(Color.red.opacity(0.1))
        .cornerRadius(12)
    }
    
    private var quickStats: some View {
        HStack(spacing: 12) {
            StatCard(
                icon: "shippingbox.fill",
                value: "\(viewModel.gearLibrary.count)",
                label: "Total Gear",
                color: .blue
            )
            StatCard(
                icon: "checkmark.circle.fill",
                value: "\(viewModel.trips.count)",
                label: "Trips",
                color: .green
            )
            StatCard(
                icon: "exclamationmark.triangle.fill",
                value: "\(viewModel.alerts.count)",
                label: "Alerts",
                color: .orange
            )
        }
    }
    
    private var alertsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)
                Text("Needs Attention")
                    .font(.headline)
            }
            
            VStack(spacing: 8) {
                // Missing Gear Alert (if any)
                if viewModel.getMissingGearCount() > 0 {
                    missingGearAlertRow
                }
                
                // Regular Alerts
                ForEach(viewModel.alerts) { alert in
                    alertRow(alert)
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func alertRow(_ alert: GearAlert) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(alert.gearName)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(alert.message)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button(action: {
                activeTab = .gear
            }) {
                Text("View")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.blue)
            }
        }
        .padding()
        .background(backgroundColor(for: alert.priority))
        .cornerRadius(12)
    }
    
    private var allTripsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("All Trips")
                    .font(.headline)
                
                Spacer()
                
                Button(action: {
                    activeTab = .trips
                }) {
                    Text("View All")
                        .font(.subheadline)
                        .foregroundColor(.green)
                }
            }
            
            VStack(spacing: 8) {
                ForEach(viewModel.trips.prefix(3)) { trip in
                    tripRow(trip)
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func tripRow(_ trip: Trip) -> some View {
        Button(action: {
            selectedTrip = trip
            selectedBag = viewModel.bags.first?.id
            activeTab = .trips
        }) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(trip.name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.caption2)
                        Text("\(formattedDate(trip.date)) • \(viewModel.getTripDuration(trip: trip)) days")
                            .font(.caption)
                    }
                    .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Weight")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f lbs", viewModel.calculateTripWeight(tripId: trip.id)))
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                }
            }
            .padding()
            .background(
                LinearGradient(
                    colors: [Color.gray.opacity(0.1), Color.gray.opacity(0.05)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(12)
        }
    }
    
    // Helper functions
    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
    
    private func backgroundColor(for priority: AlertPriority) -> Color {
        switch priority {
        case .high: return Color.red.opacity(0.1)
        case .medium: return Color.orange.opacity(0.1)
        case .low: return Color.yellow.opacity(0.1)
        }
    }
}

struct StatCard: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.title3)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(color, lineWidth: 2)
                .frame(width: 4, height: nil, alignment: .leading),
            alignment: .leading
        )
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

#Preview {
    MainView()
}

