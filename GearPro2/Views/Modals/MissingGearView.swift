//
//  MissingGearView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct MissingGearView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @Environment(\.dismiss) var dismiss
    
    @State private var selectedItem: MissingGearItem?
    @State private var showActionSheet = false
    @State private var showNotesSheet = false
    @State private var notes = ""
    
    var body: some View {
        NavigationView {
            List {
                if viewModel.missingGear.isEmpty {
                    emptyState
                } else {
                    ForEach(viewModel.missingGear) { item in
                        MissingGearRow(item: item) { selectedItem in
                            self.selectedItem = selectedItem
                            showActionSheet = true
                        }
                    }
                }
            }
            .navigationTitle("Missing Gear")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .confirmationDialog("Missing Gear Action", isPresented: $showActionSheet, titleVisibility: .visible) {
                Button("Replace Item", role: .none) {
                    handleAction(.replace)
                }
                
                Button("Remove from Library", role: .destructive) {
                    handleAction(.remove)
                }
                
                Button("Mark as Found") {
                    handleAction(.found)
                }
                
                Button("Add Notes") {
                    showNotesSheet = true
                }
                
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("What would you like to do with this missing gear?")
            }
            .sheet(isPresented: $showNotesSheet) {
                NotesSheet(item: selectedItem, notes: $notes) {
                    if let item = selectedItem {
                        viewModel.updateMissingGearAction(item, action: .pending, notes: notes)
                    }
                }
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 48))
                .foregroundColor(.green.opacity(0.5))
            Text("No Missing Gear")
                .font(.headline)
                .foregroundColor(.secondary)
            Text("All your gear is accounted for!")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: 200)
        .listRowBackground(Color.clear)
    }
    
    private func handleAction(_ action: MissingGearAction) {
        guard let item = selectedItem else { return }
        
        switch action {
        case .replace:
            // For now, just mark as replaced
            // In a full implementation, you might want to open a gear creation flow
            viewModel.updateMissingGearAction(item, action: .replace)
        case .remove:
            viewModel.updateMissingGearAction(item, action: .remove)
        case .found:
            viewModel.updateMissingGearAction(item, action: .found)
        case .pending:
            break
        }
        
        selectedItem = nil
    }
}

struct MissingGearRow: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    let item: MissingGearItem
    let onAction: (MissingGearItem) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(getGearName())
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    Text("Missing from: \(item.tripName)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text("Bag: \(item.bagName)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    statusBadge
                    Text(formatDate(item.dateReported))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            if let notes = item.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.top, 4)
            }
            
            HStack {
                Spacer()
                Button("Take Action") {
                    onAction(item)
                }
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
                .shadow(color: .blue.opacity(0.3), radius: 4, x: 0, y: 2)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color.red.opacity(0.05))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.red.opacity(0.2), lineWidth: 1)
        )
    }
    
    private var statusBadge: some View {
        Text(item.status.rawValue)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(4)
    }
    
    private var statusColor: Color {
        switch item.status {
        case .reported: return .red
        case .replaced: return .green
        case .removed: return .gray
        case .found: return .blue
        }
    }
    
    private func getGearName() -> String {
        if let gear = viewModel.getGearById(item.gearId) {
            return "\(gear.brand) \(gear.name)"
        }
        return "Unknown Gear #\(item.gearId)"
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
}

struct NotesSheet: View {
    let item: MissingGearItem?
    @Binding var notes: String
    let onSave: () -> Void
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                Text("Add Notes")
                    .font(.headline)
                
                TextEditor(text: $notes)
                    .frame(minHeight: 200)
                    .padding()
                    .background(Color(UIColor.systemBackground))
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
                
                Spacer()
            }
            .padding()
            .navigationTitle("Notes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave()
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    MissingGearView()
        .environmentObject(GearTrackerViewModel())
}
