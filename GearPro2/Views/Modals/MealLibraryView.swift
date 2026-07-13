//
//  MealLibraryView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct MealLibraryView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.presentationMode) var presentationMode
    
    var tripId: Int?
    var dayNumber: Int?
    var mealType: MealCategory?
    
    @State private var searchText = ""
    @State private var selectedCategory: MealCategory?
    @State private var showingAddMealItem = false
    
    var filteredMealItems: [MealItem] {
        var items = viewModel.mealLibrary
        
        if !searchText.isEmpty {
            items = items.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
        
        if let category = selectedCategory {
            items = items.filter { $0.category == category }
        }
        
        return items.sorted { $0.name < $1.name }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                searchAndFilterBar
                
                if filteredMealItems.isEmpty {
                    emptyStateView
                } else {
                    mealItemsList
                }
            }
            .navigationTitle("Meal Library")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingAddMealItem = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddMealItem) {
            AddMealItemView()
        }
    }
    
    private var searchAndFilterBar: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                
                TextField("Search meal items...", text: $searchText)
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
                            .foregroundColor(selectedCategory == nil ? .white : .green)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(selectedCategory == nil ? Color.green : Color.green.opacity(0.1))
                            .cornerRadius(16)
                    }
                    
                    ForEach(MealCategory.allCases, id: \.self) { category in
                        Button(action: {
                            selectedCategory = category
                        }) {
                            HStack(spacing: 4) {
                                Image(systemName: category.icon)
                                    .font(.caption)
                                Text(category.rawValue)
                                    .font(.caption)
                                    .fontWeight(.medium)
                            }
                            .foregroundColor(selectedCategory == category ? .white : .green)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(selectedCategory == category ? Color.green : Color.green.opacity(0.1))
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
    
    private var mealItemsList: some View {
        List {
            ForEach(filteredMealItems, id: \.id) { item in
                MealLibraryItemRow(
                    item: item,
                    tripId: tripId,
                    dayNumber: dayNumber,
                    mealType: mealType,
                    onAddToTrip: { mealItem in
                        if let tripId = tripId, let dayNumber = dayNumber, let mealType = mealType {
                            viewModel.addMealItemToPlan(tripId: tripId, dayNumber: dayNumber, mealType: mealType, mealItem: mealItem)
                            presentationMode.wrappedValue.dismiss()
                        }
                    }
                )
            }
        }
        .listStyle(PlainListStyle())
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "fork.knife.circle")
                .font(.system(size: 60))
                .foregroundColor(.green.opacity(0.6))
            
            Text("No Meal Items Found")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Add your first meal item to get started")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button(action: {
                showingAddMealItem = true
            }) {
                Text("Add Meal Item")
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

struct MealLibraryItemRow: View {
    let item: MealItem
    var tripId: Int?
    var dayNumber: Int?
    var mealType: MealCategory?
    var onAddToTrip: ((MealItem) -> Void)?
    
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @State private var showingEditView = false
    
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(.headline)
                    .fontWeight(.medium)
                
                if let brand = item.brand {
                    Text(brand)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                HStack(spacing: 8) {
                    Label("\(item.calories)", systemImage: "flame.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                    
                    Label(String(format: "%.1f oz", item.weight), systemImage: "scalemass.fill")
                        .font(.caption)
                        .foregroundColor(.blue)
                    
                    if let cookingMethod = item.cookingMethod {
                        Label(cookingMethod.rawValue, systemImage: cookingMethod.icon)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 8) {
                // Show "Add to Trip" button if we're in trip context
                if tripId != nil && dayNumber != nil && mealType != nil {
                    Button(action: {
                        onAddToTrip?(item)
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus.circle.fill")
                            Text("Add")
                        }
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.green)
                        .cornerRadius(16)
                    }
                } else {
                    Button(action: {
                        showingEditView = true
                    }) {
                        Image(systemName: "pencil.circle")
                            .font(.title2)
                            .foregroundColor(.green)
                    }
                }
                
                if item.isPerishable {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding(.vertical, 4)
        .sheet(isPresented: $showingEditView) {
            EditMealItemView(mealItem: item)
        }
    }
}

#Preview {
    MealLibraryView()
        .environmentObject(GearTrackerViewModel())
}
