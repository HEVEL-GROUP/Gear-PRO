//
//  EditGearView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct EditGearView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.dismiss) var dismiss
    
    let gear: GearItem
    
    @State private var brand = ""
    @State private var name = ""
    @State private var category = "Shelter"
    @State private var weight = ""
    @State private var quantity = "1"
    @State private var isBaseCamp = false
    @State private var isConsumable = false
    @State private var stockLevel = "100"
    @State private var expirationDate = Date()
    @State private var hasExpirationDate = false
    @State private var notes = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("Basic Info") {
                    TextField("Brand", text: $brand)
                    TextField("Product Name", text: $name)
                    
                    Picker("Category", selection: $category) {
                        ForEach(viewModel.categories, id: \.self) { cat in
                            Text(cat).tag(cat)
                        }
                    }
                    
                    TextField("Weight (lbs)", text: $weight)
                        .keyboardType(.decimalPad)
                    
                    Stepper("Quantity: \(quantity)", value: Binding(
                        get: { Int(quantity) ?? 1 },
                        set: { quantity = String($0) }
                    ), in: 1...99)
                }
                
                Section("Options") {
                    Toggle("Base Camp Gear", isOn: $isBaseCamp)
                        .tint(.orange)
                    
                    Toggle("Consumable Item", isOn: $isConsumable)
                        .tint(.blue)
                    
                    if isConsumable {
                        HStack {
                            Text("Stock Level")
                            Spacer()
                            TextField("100", text: $stockLevel)
                                .keyboardType(.numberPad)
                                .frame(width: 60)
                                .multilineTextAlignment(.trailing)
                            Text("%")
                        }
                    }
                }
                
                Section("Expiration & Notes") {
                    Toggle("Has Expiration Date", isOn: $hasExpirationDate)
                    
                    if hasExpirationDate {
                        DatePicker("Expiration Date", selection: $expirationDate, displayedComponents: .date)
                    }
                    
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("Edit Gear")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        updateGear()
                    }
                    .disabled(brand.isEmpty || name.isEmpty || weight.isEmpty)
                }
            }
            .onAppear {
                loadGearData()
            }
        }
    }
    
    private func loadGearData() {
        brand = gear.brand
        name = gear.name
        category = gear.category
        weight = String(gear.weight)
        quantity = String(gear.quantity)
        isBaseCamp = gear.isBaseCamp
        isConsumable = gear.isConsumable ?? false
        stockLevel = String(gear.stockLevel ?? 100)
        hasExpirationDate = gear.expirationDate != nil
        expirationDate = gear.expirationDate ?? Date()
        notes = gear.notes ?? ""
    }
    
    private func updateGear() {
        guard let weightValue = Double(weight) else { return }
        let quantityValue = Int(quantity) ?? 1
        
        let updatedGear = GearItem(
            id: gear.id,
            name: name,
            category: category,
            weight: weightValue,
            brand: brand,
            condition: gear.condition,
            isBaseCamp: isBaseCamp,
            quantity: quantityValue,
            isConsumable: isConsumable ? true : nil,
            stockLevel: isConsumable ? Int(stockLevel) : nil,
            expirationDate: hasExpirationDate ? expirationDate : nil,
            notes: notes.isEmpty ? nil : notes
        )
        
        viewModel.updateGear(updatedGear)
        dismiss()
    }
}

#Preview {
    let vm = GearTrackerViewModel()
    return EditGearView(gear: vm.gearLibrary[0])
        .environmentObject(vm)
}

