//
//  AddTripView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct AddTripView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.dismiss) var dismiss
    
    @State private var name = ""
    @State private var location = ""
    @State private var startDate = Date()
    @State private var endDate = Date()
    
    var body: some View {
        NavigationView {
            Form {
                Section("Trip Details") {
                    TextField("Trip Name (e.g., Colorado Elk Hunt)", text: $name)
                    TextField("Location", text: $location)
                }
                
                Section("Dates") {
                    DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
                    DatePicker("End Date", selection: $endDate, displayedComponents: .date)
                }
            }
            .navigationTitle("New Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        addTrip()
                    }
                    .disabled(name.isEmpty || location.isEmpty)
                }
            }
        }
    }
    
    private func addTrip() {
        let bagAssignments = viewModel.bags.reduce(into: [String: [Int]]()) { result, bag in
            result[bag.id] = []
        }
        
        let trip = Trip(
            id: Int(Date().timeIntervalSince1970),
            name: name,
            date: startDate,
            endDate: endDate,
            status: .upcoming,
            location: location,
            bagAssignments: bagAssignments
        )
        
        viewModel.addTrip(trip)
        dismiss()
    }
}

#Preview {
    AddTripView()
        .environmentObject(GearTrackerViewModel())
}

