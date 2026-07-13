//
//  TripSummaryView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct TripGearItem: Identifiable {
    let id = UUID()
    let gear: GearItem
    let bagId: String
    let bagName: String
}

struct TripMealItem: Identifiable {
    let id = UUID()
    let mealItem: MealItem
    let bagId: String
    let bagName: String
}

struct TripSummaryView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.dismiss) var dismiss
    
    let trip: Trip
    
    var allTripGear: [TripGearItem] {
        var result: [TripGearItem] = []
        
        for (bagId, gearIds) in trip.bagAssignments {
            guard let bag = viewModel.bags.first(where: { $0.id == bagId }) else { continue }
            
            for gearId in gearIds {
                if let gear = viewModel.gearLibrary.first(where: { $0.id == gearId }) {
                    result.append(TripGearItem(gear: gear, bagId: bagId, bagName: bag.name))
                }
            }
        }
        
        return result
    }
    
    var allTripMeals: [TripMealItem] {
        var result: [TripMealItem] = []
        
        guard let mealPlan = viewModel.getMealPlan(for: trip.id) else { return result }
        
        for (bagId, mealItemIds) in mealPlan.bagAssignments {
            guard let bag = viewModel.bags.first(where: { $0.id == bagId }) else { continue }
            
            for mealItemId in mealItemIds {
                if let mealItem = viewModel.getMealItemById(mealItemId) {
                    result.append(TripMealItem(mealItem: mealItem, bagId: bagId, bagName: bag.name))
                }
            }
        }
        
        return result
    }
    
    var gearByCategory: [String: [TripGearItem]] {
        Dictionary(grouping: allTripGear, by: { $0.gear.category })
    }
    
    var mealsByCategory: [String: [TripMealItem]] {
        Dictionary(grouping: allTripMeals, by: { $0.mealItem.category.rawValue })
    }
    
    var totalWeight: Double {
        viewModel.calculateTripWeight(tripId: trip.id)
    }
    
    var baseCampWeight: Double {
        viewModel.calculateBaseCampWeight(tripId: trip.id)
    }
    
    var packInWeight: Double {
        viewModel.calculatePackInWeight(tripId: trip.id)
    }
    
    var totalMealWeight: Double {
        guard let mealPlan = viewModel.getMealPlan(for: trip.id) else { return 0 }
        return mealPlan.totalWeight
    }
    
    var totalMealCalories: Int {
        guard let mealPlan = viewModel.getMealPlan(for: trip.id) else { return 0 }
        return mealPlan.totalCalories
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Weight Overview
                    weightOverview
                    
                    // Meal Plan Overview
                    if totalMealCalories > 0 {
                        mealPlanOverview
                    }
                    
                    // Bags Overview
                    bagsOverview
                    
                    // Gear by Category
                    if !gearByCategory.isEmpty {
                        gearByCategorySection
                    }
                    
                    // Meals by Category
                    if !mealsByCategory.isEmpty {
                        mealsByCategorySection
                    }
                    
                    // Empty state if no gear or meals
                    if gearByCategory.isEmpty && mealsByCategory.isEmpty {
                        emptyState
                    }
                }
                .padding()
            }
            .navigationTitle("Trip Summary")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var weightOverview: some View {
        HStack(spacing: 12) {
            WeightCard(
                label: "Total Weight",
                value: totalWeight + totalMealWeight,
                color: .blue
            )
            WeightCard(
                label: "Pack-In Weight",
                value: packInWeight,
                color: .green
            )
            WeightCard(
                label: "Base Camp",
                value: baseCampWeight,
                color: .orange
            )
        }
    }
    
    private var mealPlanOverview: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Meal Plan")
                .font(.headline)
            
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(totalMealCalories)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                    Text("Total Calories")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(String(format: "%.1f oz", totalMealWeight))
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                    Text("Meal Weight")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(viewModel.getTripDuration(trip: trip))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                    Text("Days")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private var bagsOverview: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Bags")
                .font(.headline)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(viewModel.bags) { bag in
                    let gearWeight = viewModel.calculateBagWeight(tripId: trip.id, bagId: bag.id)
                    let mealWeight = viewModel.calculateMealBagWeight(tripId: trip.id, bagId: bag.id)
                    let totalWeight = gearWeight + mealWeight
                    let gearItemCount = viewModel.getBagItemCount(tripId: trip.id, bagId: bag.id)
                    let mealItemCount = viewModel.getMealPlan(for: trip.id)?.bagAssignments[bag.id]?.count ?? 0
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(bag.name)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(bag.color.textColor)
                        Text("\(String(format: "%.1f", totalWeight)) / \(String(format: "%.0f", bag.maxWeight)) lbs")
                            .font(.caption)
                        HStack {
                            Text("\(gearItemCount) gear")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            if mealItemCount > 0 {
                                Text("• \(mealItemCount) meals")
                                    .font(.caption2)
                                    .foregroundColor(.green)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(bag.color.background)
                    .cornerRadius(12)
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private var gearByCategorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("All Gear by Category")
                .font(.headline)
            
            ForEach(gearByCategory.keys.sorted(), id: \.self) { category in
                if let items = gearByCategory[category] {
                    categorySection(category: category, items: items)
                }
            }
        }
    }
    
    private func categorySection(category: String, items: [TripGearItem]) -> some View {
        let categoryWeight = items.reduce(0.0) { $0 + $1.gear.weight }
        
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(category)
                    .font(.subheadline)
                    .fontWeight(.bold)
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(items.count) items")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f lbs", categoryWeight))
                        .font(.subheadline)
                        .fontWeight(.bold)
                }
            }
            
            VStack(spacing: 6) {
                ForEach(items) { item in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text("\(item.gear.brand) \(item.gear.name)")
                                    .font(.caption)
                                
                                if item.gear.isBaseCamp {
                                    Text("⛺")
                                        .font(.caption2)
                                }
                            }
                            
                            Text("in \(item.bagName)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        Text("\(String(format: "%.2f", item.gear.weight)) lbs")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .padding(8)
                    .background(Color.gray.opacity(0.05))
                    .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private var mealsByCategorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Meals by Category")
                .font(.headline)
            
            ForEach(mealsByCategory.keys.sorted(), id: \.self) { category in
                if let items = mealsByCategory[category] {
                    mealCategorySection(category: category, items: items)
                }
            }
        }
    }
    
    private func mealCategorySection(category: String, items: [TripMealItem]) -> some View {
        let categoryWeight = items.reduce(0.0) { $0 + $1.mealItem.weight }
        let categoryCalories = items.reduce(0) { $0 + $1.mealItem.calories }
        
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: MealCategory(rawValue: category)?.icon ?? "fork.knife")
                    .foregroundColor(.green)
                
                Text(category)
                    .font(.subheadline)
                    .fontWeight(.bold)
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(items.count) items")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(categoryCalories) cal")
                        .font(.caption)
                        .foregroundColor(.orange)
                    Text(String(format: "%.1f oz", categoryWeight))
                        .font(.subheadline)
                        .fontWeight(.bold)
                }
            }
            
            VStack(spacing: 6) {
                ForEach(items) { item in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(item.mealItem.brand ?? "") \(item.mealItem.name)")
                                .font(.caption)
                            
                            Text("in \(item.bagName)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(item.mealItem.calories) cal")
                                .font(.caption2)
                                .foregroundColor(.orange)
                            Text(String(format: "%.1f oz", item.mealItem.weight))
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                    }
                    .padding(8)
                    .background(Color.green.opacity(0.05))
                    .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "shippingbox")
                .font(.system(size: 48))
                .foregroundColor(.gray.opacity(0.5))
            Text("No gear packed yet")
                .font(.headline)
                .foregroundColor(.secondary)
            Text("Start adding gear to your bags")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: 200)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

struct WeightCard: View {
    let label: String
    let value: Double
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(color)
            Text(String(format: "%.1f", value))
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color.opacity(0.9))
            Text("lbs")
                .font(.caption)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(color, lineWidth: 2)
                .frame(width: 4, height: nil, alignment: .leading),
            alignment: .leading
        )
    }
}

#Preview {
    let vm = GearTrackerViewModel()
    return TripSummaryView(trip: vm.trips[0])
        .environmentObject(vm)
}

