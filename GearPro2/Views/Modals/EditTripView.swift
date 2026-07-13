//
//  EditTripView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct EditTripView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.dismiss) var dismiss
    
    let trip: Trip
    
    @State private var tripName: String
    @State private var tripLocation: String
    @State private var tripDate: Date
    @State private var tripEndDate: Date
    
    init(trip: Trip) {
        self.trip = trip
        self._tripName = State(initialValue: trip.name)
        self._tripLocation = State(initialValue: trip.location)
        self._tripDate = State(initialValue: trip.date)
        self._tripEndDate = State(initialValue: trip.endDate)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Trip Details") {
                    TextField("Trip Name", text: $tripName)
                    
                    TextField("Location", text: $tripLocation)
                }
                
                Section("Dates") {
                    DatePicker("Start Date", selection: $tripDate, displayedComponents: .date)
                    
                    DatePicker("End Date", selection: $tripEndDate, displayedComponents: .date)
                }
                
                Section("Trip Info") {
                    HStack {
                        Text("Status")
                        Spacer()
                        Text(trip.status.rawValue.capitalized)
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Total Weight")
                        Spacer()
                        Text("\(String(format: "%.1f", viewModel.calculateTripWeight(tripId: trip.id))) lbs")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Gear Items")
                        Spacer()
                        Text("\(getGearCount()) items")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Edit Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveTrip()
                    }
                    .disabled(tripName.isEmpty || tripLocation.isEmpty)
                }
            }
        }
    }
    
    private func getGearCount() -> Int {
        return trip.bagAssignments.values.flatMap { $0 }.count
    }
    
    private func saveTrip() {
        guard let index = viewModel.trips.firstIndex(where: { $0.id == trip.id }) else { return }
        
        var updatedTrip = viewModel.trips[index]
        updatedTrip.name = tripName
        updatedTrip.location = tripLocation
        updatedTrip.date = tripDate
        updatedTrip.endDate = tripEndDate
        
        viewModel.trips[index] = updatedTrip
        print("Trip '\(updatedTrip.name)' updated successfully")
        dismiss()
    }
}

#Preview {
    let vm = GearTrackerViewModel()
    return EditTripView(trip: vm.trips[0])
        .environmentObject(vm)
}
