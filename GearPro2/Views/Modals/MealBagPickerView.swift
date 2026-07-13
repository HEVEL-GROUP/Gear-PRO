//
//  MealBagPickerView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct MealBagPickerView: View {
    let mealItem: MealItem
    let trip: Trip
    let dayNumber: Int
    let mealType: MealCategory
    
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                mealItemInfo
                
                Divider()
                
                bagsList
            }
            .navigationTitle("Pack Meal Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }
    
    private var mealItemInfo: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: mealType.icon)
                    .foregroundColor(.green)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(mealItem.name)
                        .font(.headline)
                        .fontWeight(.medium)
                    
                    if let brand = mealItem.brand {
                        Text(brand)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
            }
            
            HStack(spacing: 16) {
                Label("\(mealItem.calories) cal", systemImage: "flame.fill")
                    .font(.caption)
                    .foregroundColor(.orange)
                
                Label(String(format: "%.1f oz", mealItem.weight), systemImage: "scalemass.fill")
                    .font(.caption)
                    .foregroundColor(.blue)
                
                if let cookingMethod = mealItem.cookingMethod {
                    Label(cookingMethod.rawValue, systemImage: cookingMethod.icon)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
    }
    
    private var bagsList: some View {
        List {
            ForEach(viewModel.bags, id: \.id) { bag in
                BagRow(
                    bag: bag,
                    mealItem: mealItem,
                    trip: trip,
                    dayNumber: dayNumber,
                    mealType: mealType
                )
            }
        }
        .listStyle(PlainListStyle())
    }
}

struct BagRow: View {
    let bag: Bag
    let mealItem: MealItem
    let trip: Trip
    let dayNumber: Int
    let mealType: MealCategory
    
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.presentationMode) var presentationMode
    
    private var currentWeight: Double {
        viewModel.calculateBagWeight(tripId: trip.id, bagId: bag.id) + 
        viewModel.calculateMealBagWeight(tripId: trip.id, bagId: bag.id)
    }
    
    private var isOverWeight: Bool {
        currentWeight + mealItem.weight > bag.maxWeight
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Bag color indicator
            Circle()
                .fill(LinearGradient(
                    gradient: Gradient(colors: bag.color.gradient),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: 20, height: 20)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(bag.name)
                    .font(.headline)
                    .fontWeight(.medium)
                
                HStack(spacing: 8) {
                    Text(String(format: "%.1f / %.1f lbs", currentWeight, bag.maxWeight))
                        .font(.caption)
                        .foregroundColor(isOverWeight ? .red : .secondary)
                    
                    if isOverWeight {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
            }
            
            Spacer()
            
            Button(action: {
                packMealItem()
            }) {
                Text("Pack")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(isOverWeight ? Color.red : Color.green)
                    .cornerRadius(8)
            }
            .disabled(isOverWeight)
        }
        .padding(.vertical, 4)
    }
    
    private func packMealItem() {
        // Add meal item to the meal plan first
        viewModel.addMealItemToPlan(
            tripId: trip.id,
            dayNumber: dayNumber,
            mealType: mealType,
            mealItem: mealItem
        )
        
        // Then assign it to the bag
        viewModel.addMealItemToBag(
            tripId: trip.id,
            mealItemId: mealItem.id,
            bagId: bag.id
        )
        
        presentationMode.wrappedValue.dismiss()
    }
}

#Preview {
    MealBagPickerView(
        mealItem: MealItem(id: 1001, name: "Instant Oatmeal", category: .breakfast, calories: 150, weight: 0.1),
        trip: Trip(id: 1, name: "Test Trip", date: Date(), endDate: Date(), status: .upcoming, location: "Test Location", bagAssignments: [:]),
        dayNumber: 1,
        mealType: .breakfast
    )
    .environmentObject(GearTrackerViewModel())
}
