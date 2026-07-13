//
//  AddMealItemView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct AddMealItemView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.presentationMode) var presentationMode
    
    @State private var name = ""
    @State private var category = MealCategory.breakfast
    @State private var calories = ""
    @State private var weight = ""
    @State private var brand = ""
    @State private var servingSize = ""
    @State private var protein = ""
    @State private var carbs = ""
    @State private var fat = ""
    @State private var fiber = ""
    @State private var sodium = ""
    @State private var isPerishable = false
    @State private var shelfLife = ""
    @State private var preparationNotes = ""
    @State private var cookingMethod = CookingMethod.noCook
    @State private var expirationDate = Date()
    @State private var notes = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Basic Information")) {
                    TextField("Name", text: $name)
                    Picker("Category", selection: $category) {
                        ForEach(MealCategory.allCases, id: \.self) { category in
                            HStack {
                                Image(systemName: category.icon)
                                Text(category.rawValue)
                            }
                            .tag(category)
                        }
                    }
                    TextField("Brand", text: $brand)
                    TextField("Serving Size", text: $servingSize)
                }
                
                Section(header: Text("Nutritional Information")) {
                    HStack {
                        TextField("Calories", text: $calories)
                            .keyboardType(.numberPad)
                        Text("cal")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("Weight", text: $weight)
                            .keyboardType(.decimalPad)
                        Text("oz")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("Protein", text: $protein)
                            .keyboardType(.decimalPad)
                        Text("g")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("Carbs", text: $carbs)
                            .keyboardType(.decimalPad)
                        Text("g")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("Fat", text: $fat)
                            .keyboardType(.decimalPad)
                        Text("g")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("Fiber", text: $fiber)
                            .keyboardType(.decimalPad)
                        Text("g")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        TextField("Sodium", text: $sodium)
                            .keyboardType(.decimalPad)
                        Text("mg")
                            .foregroundColor(.secondary)
                    }
                }
                
                Section(header: Text("Preparation")) {
                    Picker("Cooking Method", selection: $cookingMethod) {
                        ForEach(CookingMethod.allCases, id: \.self) { method in
                            HStack {
                                Image(systemName: method.icon)
                                Text(method.rawValue)
                            }
                            .tag(method)
                        }
                    }
                    
                    TextField("Preparation Notes", text: $preparationNotes, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section(header: Text("Storage")) {
                    Toggle("Perishable", isOn: $isPerishable)
                    
                    if isPerishable {
                        HStack {
                            TextField("Shelf Life", text: $shelfLife)
                                .keyboardType(.numberPad)
                            Text("days")
                                .foregroundColor(.secondary)
                        }
                        
                        DatePicker("Expiration Date", selection: $expirationDate, displayedComponents: .date)
                    }
                }
                
                Section(header: Text("Notes")) {
                    TextField("Additional Notes", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("Add Meal Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveMealItem()
                    }
                    .disabled(name.isEmpty || calories.isEmpty || weight.isEmpty)
                }
            }
        }
    }
    
    private func saveMealItem() {
        let newId = (viewModel.mealLibrary.map { $0.id }.max() ?? 1000) + 1
        
        let mealItem = MealItem(
            id: newId,
            name: name,
            category: category,
            calories: Int(calories) ?? 0,
            weight: Double(weight) ?? 0.0,
            brand: brand.isEmpty ? nil : brand,
            servingSize: servingSize.isEmpty ? nil : servingSize,
            protein: protein.isEmpty ? nil : Double(protein),
            carbs: carbs.isEmpty ? nil : Double(carbs),
            fat: fat.isEmpty ? nil : Double(fat),
            fiber: fiber.isEmpty ? nil : Double(fiber),
            sodium: sodium.isEmpty ? nil : Double(sodium),
            isPerishable: isPerishable,
            shelfLife: shelfLife.isEmpty ? nil : Int(shelfLife),
            preparationNotes: preparationNotes.isEmpty ? nil : preparationNotes,
            cookingMethod: cookingMethod,
            expirationDate: isPerishable ? expirationDate : nil,
            notes: notes.isEmpty ? nil : notes
        )
        
        viewModel.addMealItem(mealItem)
        presentationMode.wrappedValue.dismiss()
    }
}

#Preview {
    AddMealItemView()
        .environmentObject(GearTrackerViewModel())
}
