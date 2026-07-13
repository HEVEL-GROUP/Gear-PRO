//
//  PackingView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

enum ItemType {
    case gear
    case meal
    
    var icon: String {
        switch self {
        case .gear: return "gearshape.fill"
        case .meal: return "fork.knife"
        }
    }
    
    var color: Color {
        switch self {
        case .gear: return .blue
        case .meal: return .green
        }
    }
}

struct PackingView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Binding var selectedTrip: Trip?
    @Binding var selectedBag: String?
    @Binding var activeTab: NavigationTab
    
    @State private var showGearPicker = false
    @State private var showManageBags = false
    @State private var showTripSummary = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let selectedTrip = selectedTrip,
                   let trip = viewModel.getCurrentTrip(tripId: selectedTrip.id) {
                    headerSection(trip)
                    bagSelector(trip)
                    
                    if let bagId = selectedBag,
                       let bag = viewModel.bags.first(where: { $0.id == bagId }) {
                        weightProgress(trip: trip, bag: bag)
                        packedItemsSection(trip: trip, bagId: bagId)
                        
                        // Quick meal planning
                        quickMealPlanning(trip: trip)
                        
                        if hasItemsInBag(trip: trip, bagId: bagId) {
                            categorySummary(trip: trip, bagId: bagId)
                        }
                    }
                } else {
                    tripSelectionList
                }
            }
            .padding(.bottom, 20)
        }
        .sheet(isPresented: $showGearPicker) {
            if let selectedTrip = selectedTrip,
               let trip = viewModel.getCurrentTrip(tripId: selectedTrip.id),
               let bagId = selectedBag {
                AddItemsView(tripId: trip.id, bagId: bagId)
            }
        }
        .sheet(isPresented: $showManageBags) {
            ManageBagsView()
        }
        .sheet(isPresented: $showTripSummary) {
            if let selectedTrip = selectedTrip,
               let trip = viewModel.getCurrentTrip(tripId: selectedTrip.id) {
                TripSummaryView(trip: trip)
            }
        }
    }
    
    private var tripSelectionList: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("Select Trip to Pack")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Choose a trip to start packing gear")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color(UIColor.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 5)
            
            // Active trips list
            if viewModel.getActiveTrips().isEmpty {
                emptyTripsState
            } else {
                ForEach(viewModel.getActiveTrips()) { trip in
                    TripSelectionCard(trip: trip) {
                        selectedTrip = trip
                        selectedBag = viewModel.bags.first?.id
                    }
                }
            }
        }
    }
    
    private var emptyTripsState: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 48))
                .foregroundColor(.blue.opacity(0.5))
            Text("No Active Trips")
                .font(.headline)
                .foregroundColor(.secondary)
            Text("Create a trip to start packing gear")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Button(action: {
                activeTab = .trips
            }) {
                Text("Create Trip")
                    .fontWeight(.medium)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: 200)
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func headerSection(_ trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: {
                activeTab = .dashboard
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                    Text("Back to Dashboard")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(trip.name)
                        .font(.title2)
                        .fontWeight(.bold)
                    Text(trip.location)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 8) {
                    Button(action: {
                        showTripSummary = true
                    }) {
                        Text("Trip Summary")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                    
                    Button(action: {
                        showManageBags = true
                    }) {
                        Text("Manage Bags")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func bagSelector(_ trip: Trip) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(viewModel.bags) { bag in
                    BagCard(
                        bag: bag,
                        weight: viewModel.calculateBagWeight(tripId: trip.id, bagId: bag.id),
                        itemCount: viewModel.getBagItemCount(tripId: trip.id, bagId: bag.id),
                        isSelected: selectedBag == bag.id
                    )
                    .onTapGesture {
                        withAnimation {
                            selectedBag = bag.id
                        }
                    }
                }
            }
            .padding(.horizontal, 4)
        }
    }
    
    private func weightProgress(trip: Trip, bag: Bag) -> some View {
        let gearWeight = viewModel.calculateBagWeight(tripId: trip.id, bagId: bag.id)
        let mealWeight = viewModel.calculateMealBagWeight(tripId: trip.id, bagId: bag.id)
        let totalWeight = gearWeight + mealWeight
        let percentage = min(totalWeight / bag.maxWeight, 1.0)
        
        let bagGearIds = trip.bagAssignments[bag.id] ?? []
        let bagGear = bagGearIds.compactMap { id in
            viewModel.gearLibrary.first(where: { $0.id == id })
        }
        let baseCampWeight = bagGear.filter { $0.isBaseCamp }.reduce(0.0) { $0 + $1.weight }
        
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\(bag.name) Weight")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Text(String(format: "%.1f / %.0f lbs", totalWeight, bag.maxWeight))
                    .font(.subheadline)
                    .fontWeight(.bold)
            }
            
            // Weight breakdown
            HStack(spacing: 12) {
                if gearWeight > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "gearshape.fill")
                            .font(.caption)
                        Text(String(format: "%.1f lbs", gearWeight))
                            .font(.caption)
                    }
                    .foregroundColor(.blue)
                }
                
                if mealWeight > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "fork.knife")
                            .font(.caption)
                        Text(String(format: "%.1f lbs", mealWeight))
                            .font(.caption)
                    }
                    .foregroundColor(.green)
                }
                
                Spacer()
            }
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 12)
                    
                    LinearGradient(
                        colors: bag.color.gradient,
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * percentage, height: 12)
                    .cornerRadius(6)
                }
            }
            .frame(height: 12)
            
            Text(weightStatus(weight: totalWeight, maxWeight: bag.maxWeight))
                .font(.caption)
                .foregroundColor(.secondary)
            
            if baseCampWeight > 0 {
                Text("⛺ \(String(format: "%.1f lbs", baseCampWeight)) will stay at base camp")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func packedItemsSection(trip: Trip, bagId: String) -> some View {
        let gearIds = trip.bagAssignments[bagId] ?? []
        let bagGear = gearIds.compactMap { id in
            viewModel.gearLibrary.first(where: { $0.id == id })
        }
        
        let mealIds = viewModel.getMealPlan(for: trip.id)?.bagAssignments[bagId] ?? []
        let bagMeals = mealIds.compactMap { id in
            viewModel.getMealItemById(id)
        }
        
        return VStack(alignment: .leading, spacing: 12) {
            Text("Packed Items")
                .font(.headline)
            
            if bagGear.isEmpty && bagMeals.isEmpty {
                emptyItemsState
            } else {
                VStack(spacing: 8) {
                    // Gear items
                    if !bagGear.isEmpty {
                        ForEach(bagGear) { gear in
                            itemRow(
                                name: "\(gear.brand) \(gear.name)",
                                category: gear.category,
                                weight: gear.weight,
                                type: .gear,
                                onRemove: {
                                    viewModel.removeGearFromBag(tripId: trip.id, gearId: gear.id, bagId: bagId)
                                }
                            )
                        }
                    }
                    
                    // Meal items
                    if !bagMeals.isEmpty {
                        ForEach(bagMeals) { meal in
                            itemRow(
                                name: "\(meal.brand ?? "") \(meal.name)",
                                category: meal.category.rawValue,
                                weight: meal.weight,
                                type: .meal,
                                calories: meal.calories,
                                onRemove: {
                                    viewModel.removeMealItemFromBag(tripId: trip.id, mealItemId: meal.id, bagId: bagId)
                                }
                            )
                        }
                    }
                }
            }
            
            Button(action: {
                showGearPicker = true
            }) {
                HStack {
                    Image(systemName: "plus")
                    Text("Add Items")
                }
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func itemRow(name: String, category: String, weight: Double, type: ItemType, calories: Int? = nil, onRemove: @escaping () -> Void) -> some View {
        HStack(spacing: 12) {
            Image(systemName: type.icon)
                .foregroundColor(type.color)
                .font(.subheadline)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(1)
                
                HStack(spacing: 8) {
                    Text(category)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if let calories = calories {
                        Text("\(calories) cal")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
            }
            
            Spacer()
            
            Text("\(String(format: "%.1f", weight)) oz")
                .font(.subheadline)
                .fontWeight(.bold)
            
            Button(action: onRemove) {
                Image(systemName: "trash")
                    .foregroundColor(.red)
            }
        }
        .padding()
        .background(type.color.opacity(0.05))
        .cornerRadius(12)
    }
    
    private func hasItemsInBag(trip: Trip, bagId: String) -> Bool {
        let hasGear = !(trip.bagAssignments[bagId]?.isEmpty ?? true)
        let hasMeals = !(viewModel.getMealPlan(for: trip.id)?.bagAssignments[bagId]?.isEmpty ?? true)
        return hasGear || hasMeals
    }
    
    private var emptyItemsState: some View {
        VStack(spacing: 8) {
            Image(systemName: "shippingbox")
                .font(.system(size: 40))
                .foregroundColor(.gray.opacity(0.5))
            Text("No items packed yet")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
    }
    
    private func quickMealPlanning(trip: Trip) -> some View {
        let mealPlan = viewModel.getMealPlan(for: trip.id)
        let duration = viewModel.getTripDuration(trip: trip)
        
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Meal Plan")
                    .font(.headline)
                
                Spacer()
                
                Button(action: {
                    activeTab = .meals
                }) {
                    Text("Plan Meals")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }
            
            if let mealPlan = mealPlan, mealPlan.totalCalories > 0 {
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(mealPlan.totalCalories)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.orange)
                        Text("Total Calories")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(String(format: "%.1f oz", mealPlan.totalWeight))
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                        Text("Meal Weight")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(duration)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        Text("Days")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "fork.knife.circle")
                        .font(.system(size: 32))
                        .foregroundColor(.green.opacity(0.6))
                    
                    Text("No meals planned yet")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Button(action: {
                        activeTab = .meals
                    }) {
                        Text("Start Meal Planning")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.green)
                            .cornerRadius(8)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func categorySummary(trip: Trip, bagId: String) -> some View {
        let gearIds = trip.bagAssignments[bagId] ?? []
        let bagGear = gearIds.compactMap { id in
            viewModel.gearLibrary.first(where: { $0.id == id })
        }
        
        let mealIds = viewModel.getMealPlan(for: trip.id)?.bagAssignments[bagId] ?? []
        let bagMeals = mealIds.compactMap { id in
            viewModel.getMealItemById(id)
        }
        
        let gearCategorized = Dictionary(grouping: bagGear, by: { $0.category })
        let mealCategorized = Dictionary(grouping: bagMeals, by: { $0.category.rawValue })
        
        return VStack(alignment: .leading, spacing: 12) {
            Text("By Category")
                .font(.headline)
            
            VStack(spacing: 8) {
                // Gear categories
                ForEach(gearCategorized.keys.sorted(), id: \.self) { category in
                    if let items = gearCategorized[category] {
                        categoryRow(category: category, items: items, type: .gear)
                    }
                }
                
                // Meal categories
                ForEach(mealCategorized.keys.sorted(), id: \.self) { category in
                    if let items = mealCategorized[category] {
                        categoryRow(category: category, items: items, type: .meal)
                    }
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func categoryRow(category: String, items: [Any], type: ItemType) -> some View {
        let weight: Double
        let count: Int
        
        if type == .gear {
            let gearItems = items as! [GearItem]
            weight = gearItems.reduce(0.0) { $0 + $1.weight }
            count = gearItems.count
        } else {
            let mealItems = items as! [MealItem]
            weight = mealItems.reduce(0.0) { $0 + $1.weight }
            count = mealItems.count
        }
        
        return HStack {
            Image(systemName: type.icon)
                .foregroundColor(type.color)
                .font(.caption)
            
            Text(category)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text("\(count) items")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(String(format: "%.1f oz", weight))
                .font(.subheadline)
                .fontWeight(.bold)
        }
    }
    
    
    private var noTripSelected: some View {
        VStack(spacing: 16) {
            Image(systemName: "shippingbox")
                .font(.system(size: 48))
                .foregroundColor(.gray.opacity(0.5))
            Text("No trip selected")
                .font(.headline)
                .foregroundColor(.secondary)
            Button(action: {
                activeTab = .dashboard
            }) {
                Text("Go to Dashboard")
                    .foregroundColor(.green)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: 300)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func weightStatus(weight: Double, maxWeight: Double) -> String {
        let ratio = weight / maxWeight
        if ratio < 0.85 {
            return "✓ Good weight"
        } else if ratio < 1.0 {
            return "⚠ Getting heavy"
        } else {
            return "⛔ Over target"
        }
    }
}

struct BagCard: View {
    let bag: Bag
    let weight: Double
    let itemCount: Int
    let isSelected: Bool
    
    var body: some View {
        ZStack {
            if isSelected {
                LinearGradient(
                    colors: bag.color.gradient,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            } else {
                Color(UIColor.systemBackground)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(bag.name)
                    .font(.headline)
                    .fontWeight(.bold)
                Text(String(format: "%.1f lbs", weight))
                    .font(.subheadline)
                Text("\(itemCount) items")
                    .font(.caption)
            }
            .foregroundColor(isSelected ? .white : .primary)
            .padding()
        }
        .frame(minWidth: 140)
        .cornerRadius(16)
        .shadow(color: .black.opacity(isSelected ? 0.2 : 0.05), radius: isSelected ? 10 : 5)
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3), value: isSelected)
    }
}

struct TripSelectionCard: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    let trip: Trip
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(trip.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Text(trip.location)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Text("\(formattedDate(trip.date)) - \(formattedDate(trip.endDate))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(String(format: "%.1f", viewModel.calculateTripWeight(tripId: trip.id))) lbs")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.blue)
                        
                        Text("\(getGearCount()) items")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                HStack {
                    statusBadge
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color(UIColor.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 5)
        }
        .buttonStyle(.plain)
    }
    
    private var statusBadge: some View {
        Text(trip.status.rawValue.capitalized)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(6)
    }
    
    private var statusColor: Color {
        switch trip.status {
        case .upcoming: return .blue
        case .active: return .orange
        case .completed: return .green
        case .archived: return .gray
        }
    }
    
    private func getGearCount() -> Int {
        return trip.bagAssignments.values.flatMap { $0 }.count
    }
    
    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
}

#Preview {
    MainView()
}

