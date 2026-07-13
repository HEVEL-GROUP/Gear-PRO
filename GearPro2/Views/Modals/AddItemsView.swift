//
//  AddItemsView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct AddItemsView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.presentationMode) var presentationMode
    
    let tripId: Int
    let bagId: String
    
    @State private var selectedTab: ItemType = .gear
    @State private var searchText = ""
    @State private var selectedCategory: String?
    @State private var showingAddNew = false
    
    var filteredGear: [GearItem] {
        var items = viewModel.gearLibrary
        
        if !searchText.isEmpty {
            items = items.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
        
        if let category = selectedCategory {
            items = items.filter { $0.category == category }
        }
        
        return items.sorted { $0.name < $1.name }
    }
    
    var filteredMeals: [MealItem] {
        var items = viewModel.mealLibrary
        
        if !searchText.isEmpty {
            items = items.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
        
        if let category = selectedCategory {
            items = items.filter { $0.category.rawValue == category }
        }
        
        return items.sorted { $0.name < $1.name }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab selector
                tabSelector
                
                // Search and filter
                searchAndFilterBar
                
                // Content
                if selectedTab == .gear {
                    gearContent
                } else {
                    mealContent
                }
            }
            .navigationTitle("Add Items")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingAddNew = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddNew) {
            if selectedTab == .gear {
                AddGearView()
            } else {
                AddMealItemView()
            }
        }
    }
    
    private var tabSelector: some View {
        HStack(spacing: 0) {
            ForEach([ItemType.gear, ItemType.meal], id: \.self) { tab in
                Button(action: {
                    selectedTab = tab
                    selectedCategory = nil
                }) {
                    HStack(spacing: 8) {
                        Image(systemName: tab.icon)
                        Text(tab == .gear ? "Gear" : "Meals")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(selectedTab == tab ? .white : tab.color)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(selectedTab == tab ? tab.color : tab.color.opacity(0.1))
                }
            }
        }
        .cornerRadius(12)
        .padding(.horizontal)
        .padding(.top)
    }
    
    private var searchAndFilterBar: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                
                TextField("Search \(selectedTab == .gear ? "gear" : "meals")...", text: $searchText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
            }
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    Button(action: {
                        selectedCategory = nil
                    }) {
                        Text("All")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(selectedCategory == nil ? .white : selectedTab.color)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(selectedCategory == nil ? selectedTab.color : selectedTab.color.opacity(0.1))
                            .cornerRadius(16)
                    }
                    
                    ForEach(availableCategories, id: \.self) { category in
                        Button(action: {
                            selectedCategory = category
                        }) {
                            Text(category)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(selectedCategory == category ? .white : selectedTab.color)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(selectedCategory == category ? selectedTab.color : selectedTab.color.opacity(0.1))
                                .cornerRadius(16)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
    }
    
    private var availableCategories: [String] {
        if selectedTab == .gear {
            return viewModel.categories.sorted()
        } else {
            return MealCategory.allCases.map { $0.rawValue }.sorted()
        }
    }
    
    private var gearContent: some View {
        List {
            ForEach(filteredGear, id: \.id) { gear in
                GearItemRow(gear: gear, tripId: tripId, bagId: bagId)
            }
        }
        .listStyle(PlainListStyle())
    }
    
    private var mealContent: some View {
        List {
            ForEach(filteredMeals, id: \.id) { meal in
                MealItemRow(meal: meal, tripId: tripId, bagId: bagId)
            }
        }
        .listStyle(PlainListStyle())
    }
}

struct GearItemRow: View {
    let gear: GearItem
    let tripId: Int
    let bagId: String
    
    @EnvironmentObject var viewModel: GearTrackerViewModel
    
    private var isAlreadyPacked: Bool {
        guard let trip = viewModel.getCurrentTrip(tripId: tripId) else { return false }
        return trip.bagAssignments[bagId]?.contains(gear.id) ?? false
    }
    
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(gear.brand) \(gear.name)")
                    .font(.headline)
                    .fontWeight(.medium)
                
                Text(gear.category)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack(spacing: 8) {
                    Label("\(String(format: "%.1f", gear.weight)) lbs", systemImage: "scalemass.fill")
                        .font(.caption)
                        .foregroundColor(.blue)
                    
                    if gear.isBaseCamp {
                        Label("Base Camp", systemImage: "tent")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
            }
            
            Spacer()
            
            if isAlreadyPacked {
                Text("Packed")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(8)
            } else {
                Button(action: {
                    viewModel.addGearToTrip(tripId: tripId, gearId: gear.id, bagId: bagId)
                }) {
                    Text("Add")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.blue)
                        .cornerRadius(8)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct MealItemRow: View {
    let meal: MealItem
    let tripId: Int
    let bagId: String
    
    @EnvironmentObject var viewModel: GearTrackerViewModel
    
    private var isAlreadyPacked: Bool {
        guard let mealPlan = viewModel.getMealPlan(for: tripId) else { return false }
        return mealPlan.bagAssignments[bagId]?.contains(meal.id) ?? false
    }
    
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(meal.brand ?? "") \(meal.name)")
                    .font(.headline)
                    .fontWeight(.medium)
                
                Text(meal.category.rawValue)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack(spacing: 8) {
                    Label("\(meal.calories) cal", systemImage: "flame.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                    
                    Label("\(String(format: "%.1f", meal.weight)) oz", systemImage: "scalemass.fill")
                        .font(.caption)
                        .foregroundColor(.green)
                    
                    if let cookingMethod = meal.cookingMethod {
                        Label(cookingMethod.rawValue, systemImage: cookingMethod.icon)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Spacer()
            
            if isAlreadyPacked {
                Text("Packed")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(8)
            } else {
                Button(action: {
                    // Add meal to plan first, then to bag
                    viewModel.addMealItemToPlan(tripId: tripId, dayNumber: 1, mealType: meal.category, mealItem: meal)
                    viewModel.addMealItemToBag(tripId: tripId, mealItemId: meal.id, bagId: bagId)
                }) {
                    Text("Add")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.green)
                        .cornerRadius(8)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    AddItemsView(tripId: 1, bagId: "bag-1")
        .environmentObject(GearTrackerViewModel())
}
