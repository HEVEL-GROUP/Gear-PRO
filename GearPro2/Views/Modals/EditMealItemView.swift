//
//  EditMealItemView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct EditMealItemView: View {
    let mealItem: MealItem
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.presentationMode) var presentationMode
    
    @State private var name: String
    @State private var category: MealCategory
    @State private var calories: String
    @State private var weight: String
    @State private var brand: String
    @State private var servingSize: String
    @State private var protein: String
    @State private var carbs: String
    @State private var fat: String
    @State private var fiber: String
    @State private var sodium: String
    @State private var isPerishable: Bool
    @State private var shelfLife: String
    @State private var preparationNotes: String
    @State private var cookingMethod: CookingMethod
    @State private var expirationDate: Date
    @State private var notes: String
    
    init(mealItem: MealItem) {
        self.mealItem = mealItem
        
        _name = State(initialValue: mealItem.name)
        _category = State(initialValue: mealItem.category)
        _calories = State(initialValue: String(mealItem.calories))
        _weight = State(initialValue: String(mealItem.weight))
        _brand = State(initialValue: mealItem.brand ?? "")
        _servingSize = State(initialValue: mealItem.servingSize ?? "")
        _protein = State(initialValue: mealItem.protein?.description ?? "")
        _carbs = State(initialValue: mealItem.carbs?.description ?? "")
        _fat = State(initialValue: mealItem.fat?.description ?? "")
        _fiber = State(initialValue: mealItem.fiber?.description ?? "")
        _sodium = State(initialValue: mealItem.sodium?.description ?? "")
        _isPerishable = State(initialValue: mealItem.isPerishable)
        _shelfLife = State(initialValue: mealItem.shelfLife?.description ?? "")
        _preparationNotes = State(initialValue: mealItem.preparationNotes ?? "")
        _cookingMethod = State(initialValue: mealItem.cookingMethod ?? .noCook)
        _expirationDate = State(initialValue: mealItem.expirationDate ?? Date())
        _notes = State(initialValue: mealItem.notes ?? "")
    }
    
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
                
                Section {
                    Button("Delete Meal Item") {
                        deleteMealItem()
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("Edit Meal Item")
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
        let updatedMealItem = MealItem(
            id: mealItem.id,
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
        
        viewModel.updateMealItem(updatedMealItem)
        presentationMode.wrappedValue.dismiss()
    }
    
    private func deleteMealItem() {
        viewModel.deleteMealItem(id: mealItem.id)
        presentationMode.wrappedValue.dismiss()
    }
}

#Preview {
    EditMealItemView(mealItem: MealItem(id: 1001, name: "Instant Oatmeal", category: .breakfast, calories: 150, weight: 0.1))
        .environmentObject(GearTrackerViewModel())
}
