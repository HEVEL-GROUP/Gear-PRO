//
//  ManageBagsView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct ManageBagsView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.dismiss) var dismiss
    
    @State private var editingBag: Bag?
    @State private var newBagName = ""
    @State private var newBagColor: BagColor = .blue
    @State private var newBagMaxWeight = "35"
    @State private var refreshID = UUID()
    
    var body: some View {
        NavigationView {
            List {
                Section("Current Bags") {
                    Text("Total bags: \(viewModel.bags.count)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    ForEach(viewModel.bags) { bag in
                        if editingBag?.id == bag.id {
                            editBagRow(bag)
                        } else {
                            bagRow(bag)
                        }
                    }
                }
                
                Section("Add New Bag") {
                    TextField("Bag name", text: $newBagName)
                    
                    HStack {
                        Text("Max Weight")
                        Spacer()
                        TextField("35", text: $newBagMaxWeight)
                            .keyboardType(.decimalPad)
                            .frame(width: 60)
                            .multilineTextAlignment(.trailing)
                        Text("lbs")
                    }
                    
                    Picker("Color", selection: $newBagColor) {
                        ForEach(BagColor.allCases, id: \.self) { color in
                            HStack {
                                Circle()
                                    .fill(color.textColor)
                                    .frame(width: 20, height: 20)
                                Text(color.rawValue.capitalized)
                            }
                            .tag(color)
                        }
                    }
                    
                    Button(action: addBag) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("Add Bag")
                        }
                    }
                    .disabled(newBagName.isEmpty || newBagMaxWeight.isEmpty)
                }
            }
            .id(refreshID)
            .navigationTitle("Manage Bags")
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
    
    private func bagRow(_ bag: Bag) -> some View {
        HStack {
            Circle()
                .fill(bag.color.textColor)
                .frame(width: 12, height: 12)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(bag.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text("Max: \(String(format: "%.0f", bag.maxWeight)) lbs")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button(action: {
                editingBag = bag
            }) {
                Image(systemName: "pencil")
                    .foregroundColor(.blue)
            }
            .buttonStyle(.plain)
            
            Button(action: {
                viewModel.deleteBag(id: bag.id)
                refreshID = UUID()
            }) {
                Image(systemName: "trash")
                    .foregroundColor(.red)
            }
            .buttonStyle(.plain)
        }
    }
    
    private func editBagRow(_ bag: Bag) -> some View {
        VStack(spacing: 12) {
            TextField("Bag name", text: Binding(
                get: { editingBag?.name ?? "" },
                set: { newValue in
                    if var currentBag = editingBag {
                        currentBag.name = newValue
                        editingBag = currentBag
                    }
                }
            ))
            
            HStack {
                Text("Max Weight")
                Spacer()
                TextField("35", text: Binding(
                    get: { String(format: "%.0f", editingBag?.maxWeight ?? 35) },
                    set: { newValue in
                        if let value = Double(newValue), var currentBag = editingBag {
                            currentBag.maxWeight = value
                            editingBag = currentBag
                        }
                    }
                ))
                .keyboardType(.decimalPad)
                .frame(width: 60)
                .multilineTextAlignment(.trailing)
                Text("lbs")
            }
            
            Picker("Color", selection: Binding(
                get: { editingBag?.color ?? .blue },
                set: { newValue in
                    if var currentBag = editingBag {
                        currentBag.color = newValue
                        editingBag = currentBag
                    }
                }
            )) {
                ForEach(BagColor.allCases, id: \.self) { color in
                    HStack {
                        Circle()
                            .fill(color.textColor)
                            .frame(width: 20, height: 20)
                        Text(color.rawValue.capitalized)
                    }
                    .tag(color)
                }
            }
            .pickerStyle(.menu)
            
            Divider()
                .padding(.vertical, 4)
            
            HStack(spacing: 12) {
                Button(action: {
                    editingBag = nil
                    refreshID = UUID()
                }) {
                    Text("Cancel")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.gray.opacity(0.2))
                        .foregroundColor(.secondary)
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
                
                Button(action: {
                    if let bag = editingBag {
                        viewModel.updateBag(bag)
                        editingBag = nil
                        refreshID = UUID()
                    }
                }) {
                    Text("Save")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.green)
                        .foregroundColor(.white)
                        .fontWeight(.semibold)
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            .padding(.top, 4)
        }
        .padding(.vertical, 8)
    }
    
    private func addBag() {
        guard let maxWeight = Double(newBagMaxWeight) else { 
            print("Invalid max weight: \(newBagMaxWeight)")
            return 
        }
        
        let bag = Bag(
            id: "bag-\(Int(Date().timeIntervalSince1970))",
            name: newBagName,
            color: newBagColor,
            maxWeight: maxWeight
        )
        
        print("Adding bag: \(bag.name) with ID: \(bag.id)")
        viewModel.addBag(bag)
        print("Bag added. Total bags: \(viewModel.bags.count)")
        
        // Force refresh
        refreshID = UUID()
        
        // Reset form
        newBagName = ""
        newBagColor = .blue
        newBagMaxWeight = "35"
    }
}

#Preview {
    ManageBagsView()
        .environmentObject(GearTrackerViewModel())
}

