//
//  HelpView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct HelpView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Help & Support".localized)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .padding(.bottom, 8)
                    
                    Group {
                        sectionTitle("Getting Started")
                        sectionText("Welcome to GearPro2! This app helps you manage your outdoor gear, plan trips, and create packing lists.")
                        
                        faqItem("How do I add gear to my library?", "Go to the Gear Library tab and tap the + button. Fill in the gear details including name, category, weight, and quantity.")
                        
                        faqItem("How do I create a trip?", "Go to the Trips tab and tap the + button. Enter trip details including name, location, and dates. The app will automatically calculate the trip duration.")
                        
                        faqItem("How do I pack gear for a trip?", "Select a trip, then go to the Packing tab. Tap 'Add Items' to select gear from your library and assign it to bags.")
                        
                        sectionTitle("Managing Your Gear")
                        faqItem("Can I track multiple quantities of the same item?", "Yes! When adding gear, set the quantity. The app will track how many you have and show availability when packing.")
                        
                        faqItem("What are consumables?", "Consumables are items like fuel, batteries, or first aid supplies that have stock levels. You can track usage and set expiration dates.")
                        
                        faqItem("How do I track gear weight?", "Each gear item has a weight field. The app automatically calculates total weight for trips and individual bags.")
                        
                        sectionTitle("Trips and Packing")
                        faqItem("How do I create multiple bags for a trip?", "In the Packing view, tap 'Manage Bags' to add, rename, or customize bags. Each bag can have its own color and weight target.")
                        
                        faqItem("What's the difference between pack-in weight and base camp weight?", "Pack-in weight includes only items you carry. Base camp weight includes items that stay at camp. The app tracks both separately.")
                        
                        faqItem("How do I check in after a trip?", "Go to the Trips tab, find your active trip, and tap 'Check-In'. Confirm which items you brought back and update consumable usage.")
                        
                        sectionTitle("Meal Planning")
                        faqItem("How do I add meals to a trip?", "Go to the Meal Planning tab, select your trip, and tap 'Add Meal'. You can create custom meals or use items from your meal library.")
                        
                        faqItem("Can I track nutrition information?", "Yes! When creating meals, you can enter calories, protein, carbs, and fat. This helps you plan balanced nutrition for your trips.")
                        
                        sectionTitle("Data Storage and Sync")
                        faqItem("How does iCloud sync work?", "When enabled, your data automatically syncs across all devices signed into the same iCloud account. Changes are synced in real-time.")
                        
                        faqItem("Can I use the app offline?", "Yes! Switch to 'Offline Only' mode in Settings. All core features work offline. Only cloud sync requires internet.")
                        
                        faqItem("What happens if I switch storage modes?", "Your data is preserved in both modes. Switching modes doesn't delete data - it just changes where new data is saved.")
                        
                        sectionTitle("Notifications")
                        faqItem("How do I enable trip reminders?", "Go to Settings and enable Push Notifications. You can set how many days in advance you want to be notified about upcoming trips.")
                        
                        faqItem("What notifications does the app send?", "The app can notify you about upcoming trips and gear maintenance alerts (expiring items, low stock, etc.).")
                        
                        sectionTitle("Troubleshooting")
                        faqItem("My data isn't syncing between devices", "Make sure both devices are signed into the same iCloud account and have iCloud Drive enabled. Check your internet connection.")
                        
                        faqItem("I can't see my gear items", "Try switching storage modes in Settings, or check if you're filtering by category. Make sure you've added gear to your library.")
                        
                        faqItem("The app crashes or freezes", "Try force-quitting and reopening the app. If the problem persists, check for app updates or contact support.")
                    }
                    .padding(.horizontal)
                    
                    sectionTitle("Need More Help?")
                    sectionText("If you can't find the answer you're looking for:")
                    bulletPoint("Send us feedback: feedback@gearpro.app")
                    bulletPoint("Check our website: help.gearpro.app")
                }
                .padding(.vertical)
            }
            .navigationTitle("Help".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done".localized) {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func sectionTitle(_ text: String) -> some View {
        Text(text.localized)
            .font(.headline)
            .fontWeight(.semibold)
            .padding(.top, 8)
    }
    
    private func sectionText(_ text: String) -> some View {
        Text(text.localized)
            .font(.body)
            .padding(.vertical, 4)
    }
    
    private func faqItem(_ question: String, _ answer: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(question.localized)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
            Text(answer.localized)
                .font(.body)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(8)
    }
    
    private func bulletPoint(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
                .font(.body)
            Text(text.localized)
                .font(.body)
            Spacer()
        }
        .padding(.leading, 16)
        .padding(.vertical, 2)
    }
}

#Preview {
    HelpView()
}

