//
//  MealPlanningView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct MealPlanningView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Binding var selectedTrip: Trip?
    @Binding var selectedBag: String?
    @Binding var activeTab: NavigationTab
    
    @State private var showingAddMealItem = false
    @State private var showingMealLibrary = false
    @State private var selectedDay: Int = 1
    @State private var selectedMealType: MealCategory = .breakfast
    
    var body: some View {
        VStack(spacing: 0) {
            if let trip = selectedTrip {
                headerView(trip: trip)
                
                ScrollView {
                    VStack(spacing: 16) {
                        mealPlanSummary(trip: trip)
                        daySelector(trip: trip)
                        mealPlanningGrid(trip: trip)
                    }
                    .padding()
                }
            } else {
                noTripSelectedView
            }
        }
        .navigationBarHidden(true)
        .sheet(isPresented: $showingAddMealItem) {
            AddMealItemView()
        }
        .sheet(isPresented: $showingMealLibrary) {
            if let trip = selectedTrip {
                MealLibraryView(
                    tripId: trip.id,
                    dayNumber: selectedDay,
                    mealType: selectedMealType
                )
            } else {
                MealLibraryView()
            }
        }
    }
    
    private func headerView(trip: Trip) -> some View {
        VStack(spacing: 8) {
            HStack {
                Button(action: {
                    withAnimation {
                        activeTab = .trips
                    }
                }) {
                    Image(systemName: "chevron.left")
                        .font(.title2)
                        .foregroundColor(.green)
                }
                
                Spacer()
                
                VStack {
                    Text(trip.name)
                        .font(.title2)
                        .fontWeight(.bold)
                    Text(trip.location)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button(action: {
                    showingMealLibrary = true
                }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(.green)
                }
            }
            .padding(.horizontal)
            .padding(.top)
            
            Divider()
        }
    }
    
    private func mealPlanSummary(trip: Trip) -> some View {
        let mealPlan = viewModel.getMealPlan(for: trip.id)
        let duration = viewModel.getTripDuration(trip: trip)
        
        return VStack(spacing: 12) {
            HStack {
                Text("Meal Plan Summary")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
            }
            
            HStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(duration) Days")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                    Text("Duration")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(mealPlan?.totalCalories ?? 0)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                    Text("Total Calories")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(String(format: "%.1f lbs", mealPlan?.totalWeight ?? 0.0))
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                    Text("Total Weight")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
    
    private func daySelector(trip: Trip) -> some View {
        let duration = viewModel.getTripDuration(trip: trip)
        
        return VStack(spacing: 8) {
            HStack {
                Text("Select Day")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
            }
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(1...duration, id: \.self) { dayNum in
                        Button(action: {
                            selectedDay = dayNum
                        }) {
                            Text("Day \(dayNum)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(selectedDay == dayNum ? .white : .green)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(selectedDay == dayNum ? Color.green : Color.green.opacity(0.1))
                                .cornerRadius(20)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
    
    private func mealPlanningGrid(trip: Trip) -> some View {
        let mealPlan = viewModel.getMealPlan(for: trip.id)
        let selectedDayData = mealPlan?.days.first { $0.dayNumber == selectedDay }
        
        return VStack(spacing: 16) {
            ForEach([MealCategory.breakfast, .lunch, .dinner, .snack], id: \.self) { mealType in
                mealTypeSection(
                    mealType: mealType,
                    items: getMealItems(for: mealType, dayData: selectedDayData),
                    trip: trip
                )
            }
        }
    }
    
    private func getMealItems(for mealType: MealCategory, dayData: MealDay?) -> [MealItem] {
        guard let dayData = dayData else { return [] }
        
        switch mealType {
        case .breakfast:
            return dayData.breakfast
        case .lunch:
            return dayData.lunch
        case .dinner:
            return dayData.dinner
        case .snack:
            return dayData.snacks
        default:
            return []
        }
    }
    
    private func mealTypeSection(mealType: MealCategory, items: [MealItem], trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: mealType.icon)
                    .foregroundColor(.green)
                Text(mealType.rawValue)
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button(action: {
                    selectedMealType = mealType
                    showingMealLibrary = true
                }) {
                    Image(systemName: "plus.circle")
                        .foregroundColor(.green)
                }
            }
            
            if items.isEmpty {
                Text("No items added")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .italic()
            } else {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 8) {
                    ForEach(items, id: \.id) { item in
                        MealItemCard(
                            item: item,
                            trip: trip,
                            dayNumber: selectedDay,
                            mealType: mealType
                        )
                    }
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
    
    private var noTripSelectedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "fork.knife.circle")
                .font(.system(size: 60))
                .foregroundColor(.green.opacity(0.6))
            
            Text("No Trip Selected")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Select a trip to start planning your meals")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button(action: {
                withAnimation {
                    activeTab = .trips
                }
            }) {
                Text("Go to Trips")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.green)
                    .cornerRadius(12)
            }
        }
        .padding()
    }
}

struct MealItemCard: View {
    let item: MealItem
    let trip: Trip
    let dayNumber: Int
    let mealType: MealCategory
    
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @State private var showingBagPicker = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(item.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(2)
                
                Spacer()
                
                Button(action: {
                    viewModel.removeMealItemFromPlan(
                        tripId: trip.id,
                        dayNumber: dayNumber,
                        mealType: mealType,
                        mealItemId: item.id
                    )
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }
            
            Text("\(item.calories) cal")
                .font(.caption2)
                .foregroundColor(.orange)
            
            Text(String(format: "%.1f oz", item.weight))
                .font(.caption2)
                .foregroundColor(.blue)
            
            if let cookingMethod = item.cookingMethod {
                HStack {
                    Image(systemName: cookingMethod.icon)
                        .font(.caption2)
                    Text(cookingMethod.rawValue)
                        .font(.caption2)
                }
                .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button(action: {
                // Directly add to first available bag or show bag picker if multiple bags
                if viewModel.bags.count == 1 {
                    let bagId = viewModel.bags.first!.id
                    viewModel.addMealItemToPlan(tripId: trip.id, dayNumber: dayNumber, mealType: mealType, mealItem: item)
                    viewModel.addMealItemToBag(tripId: trip.id, mealItemId: item.id, bagId: bagId)
                } else {
                    showingBagPicker = true
                }
            }) {
                Text("Pack")
                    .font(.caption2)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green)
                    .cornerRadius(6)
            }
        }
        .padding(8)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(8)
        .sheet(isPresented: $showingBagPicker) {
            MealBagPickerView(
                mealItem: item,
                trip: trip,
                dayNumber: dayNumber,
                mealType: mealType
            )
        }
    }
}

#Preview {
    MealPlanningView(
        selectedTrip: .constant(nil),
        selectedBag: .constant(nil),
        activeTab: .constant(.packing)
    )
    .environmentObject(GearTrackerViewModel())
}
