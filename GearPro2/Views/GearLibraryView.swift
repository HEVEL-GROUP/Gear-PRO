//
//  GearLibraryView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct GearLibraryView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Binding var activeTab: NavigationTab
    
    @State private var searchTerm = ""
    @State private var filterCategory = "all"
    @State private var showAddGear = false
    @State private var editingGear: GearItem?
    @State private var gearToDelete: GearItem?
    @State private var showDeleteAlert = false
    
    var filteredGear: [GearItem] {
        viewModel.gearLibrary.filter { gear in
            let matchesSearch = searchTerm.isEmpty ||
                gear.name.localizedCaseInsensitiveContains(searchTerm) ||
                gear.brand.localizedCaseInsensitiveContains(searchTerm)
            let matchesCategory = filterCategory == "all" || gear.category == filterCategory
            return matchesSearch && matchesCategory
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                headerSection
                searchAndFilter
                gearCards
            }
            .padding(.bottom, 20)
        }
        .sheet(isPresented: $showAddGear) {
            AddGearView()
        }
        .sheet(item: $editingGear) { gear in
            EditGearView(gear: gear)
        }
        .alert("Delete Gear", isPresented: $showDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                if let gear = gearToDelete {
                    viewModel.deleteGear(id: gear.id)
                }
            }
        } message: {
            Text("Are you sure you want to delete this gear from your library?")
        }
    }
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: {
                activeTab = .dashboard
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                    Text("Back")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
            
            Text("Gear Library")
                .font(.title)
                .fontWeight(.bold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private var searchAndFilter: some View {
        VStack(spacing: 12) {
            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                
                TextField("Search gear...", text: $searchTerm)
            }
            .padding()
            .background(Color(UIColor.systemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.gray.opacity(0.2), lineWidth: 1)
            )
            
            // Category Filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterButton(
                        label: "All",
                        isSelected: filterCategory == "all"
                    ) {
                        filterCategory = "all"
                    }
                    
                    ForEach(viewModel.categories, id: \.self) { category in
                        FilterButton(
                            label: category,
                            isSelected: filterCategory == category
                        ) {
                            filterCategory = category
                        }
                    }
                }
            }
        }
    }
    
    private var gearCards: some View {
        VStack(spacing: 12) {
            ForEach(filteredGear) { gear in
                GearCard(
                    gear: gear,
                    onEdit: {
                        editingGear = gear
                    },
                    onDelete: {
                        gearToDelete = gear
                        showDeleteAlert = true
                    },
                    onToggleBaseCamp: {
                        viewModel.toggleBaseCamp(gearId: gear.id)
                    }
                )
            }
            
            // Add Gear Button
            Button(action: {
                showAddGear = true
            }) {
                HStack {
                    Image(systemName: "plus")
                    Text("Add New Gear")
                }
                .fontWeight(.bold)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green)
                .foregroundColor(.white)
                .cornerRadius(16)
            }
            .shadow(color: .black.opacity(0.1), radius: 10)
        }
    }
}

struct GearCard: View {
    let gear: GearItem
    let onEdit: () -> Void
    let onDelete: () -> Void
    let onToggleBaseCamp: () -> Void
    
    private var expirationStatus: (text: String, color: Color)? {
        guard let expirationDate = gear.expirationDate else { return nil }
        
        let days = Calendar.current.dateComponents([.day], from: Date(), to: expirationDate).day ?? 0
        
        if days < 0 {
            return ("EXPIRED", .red)
        } else if days <= 30 {
            return ("\(days)d", .orange)
        } else if days <= 90 {
            return ("Check date", .yellow)
        }
        return nil
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 8) {
                    // Badges
                    HStack(spacing: 8) {
                        Text(gear.brand)
                            .font(.headline)
                            .fontWeight(.bold)
                        
                        Badge(text: gear.category, color: .gray)
                        
                        if gear.isBaseCamp {
                            Badge(text: "⛺ Base Camp", color: .orange)
                        }
                        
                        if gear.quantity > 1 {
                            Badge(text: "Qty: \(gear.quantity)", color: .blue)
                        }
                    }
                    
                    // Name
                    Text(gear.name)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    // Weight
                    Text("\(String(format: "%.2f", gear.weight)) lbs")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    // Stock and Expiration
                    HStack(spacing: 8) {
                        if let isConsumable = gear.isConsumable, isConsumable,
                           let stockLevel = gear.stockLevel {
                            let stockColor: Color = stockLevel <= 10 ? .red : stockLevel <= 25 ? .orange : .green
                            Badge(text: "Stock: \(stockLevel)%", color: stockColor)
                        }
                        
                        if let status = expirationStatus {
                            Badge(text: status.text, color: status.color)
                        }
                    }
                    
                    // Notes
                    if let notes = gear.notes {
                        Text("💡 \(notes)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .italic()
                    }
                }
                
                Spacer()
                
                // Actions
                VStack(spacing: 8) {
                    Button(action: onEdit) {
                        Image(systemName: "pencil")
                            .foregroundColor(.blue)
                    }
                    
                    Button(action: onToggleBaseCamp) {
                        Text(gear.isBaseCamp ? "Remove BC" : "Set BC")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                    
                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                    }
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

struct Badge: View {
    let text: String
    let color: Color
    
    var body: some View {
        Text(text)
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.2))
            .foregroundColor(color)
            .cornerRadius(4)
    }
}

struct FilterButton: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.green : Color.gray.opacity(0.1))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

#Preview {
    MainView()
}

