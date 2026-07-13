//
//  PrivacyPolicyView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct PrivacyPolicyView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Privacy Policy".localized)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .padding(.bottom, 8)
                    
                    Text("Last Updated: October 2025")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Group {
                        sectionTitle("1. Information We Collect")
                        sectionText("GearPro2 collects and stores the following information:")
                        bulletPoint("Personal Information: Name and email address (optional, stored locally on your device)")
                        bulletPoint("Gear Data: Your gear inventory, including items, quantities, weights, and categories")
                        bulletPoint("Trip Data: Trip information, packing lists, and meal plans")
                        bulletPoint("Settings: App preferences, notification settings, and language preferences")
                        
                        sectionTitle("2. Data Storage")
                        sectionText("All data is stored locally on your device using iOS UserDefaults. When you enable Apple Cloud storage:")
                        bulletPoint("Data is synced to your iCloud account using iCloud Key-Value Store")
                        bulletPoint("Data is encrypted in transit and at rest by Apple")
                        bulletPoint("Data is only accessible on devices signed into your iCloud account")
                        bulletPoint("You can switch to Offline Only mode at any time to disable cloud sync")
                        
                        sectionTitle("3. Data Collection and Usage")
                        sectionText("We do not collect, share, or sell your personal data. All data remains on your device or in your iCloud account. We do not use analytics services, advertising networks, or third-party data processors.")
                        
                        sectionTitle("4. Subscription and Payment Information")
                        sectionText("If you purchase a subscription:")
                        bulletPoint("Payment processing is handled entirely by Apple through the App Store")
                        bulletPoint("We do not have access to your payment information")
                        bulletPoint("Subscription status is managed by Apple and stored locally on your device")
                        bulletPoint("We do not share subscription information with third parties")
                        
                        sectionTitle("5. Advertising (If Applicable)")
                        sectionText("If you use the free ad-supported version of the app:")
                        bulletPoint("Ads may be displayed through third-party ad networks (e.g., Google AdMob)")
                        bulletPoint("Ad networks may collect device information for ad targeting")
                        bulletPoint("You can opt out of personalized ads in your device settings")
                        bulletPoint("Subscribing to premium removes all ads")
                        
                        sectionTitle("6. Notifications")
                        sectionText("GearPro2 may send you local notifications for:")
                        bulletPoint("Upcoming trip reminders")
                        bulletPoint("Gear maintenance alerts")
                        bulletPoint("Low stock warnings")
                        sectionText("Notification permissions are requested only when you enable push notifications in settings. You can disable notifications at any time.")
                        
                        sectionTitle("7. Your Rights")
                        sectionText("You have the right to:")
                        bulletPoint("Access all your data stored in the app")
                        bulletPoint("Delete your data at any time (via Delete Account in Settings)")
                        bulletPoint("Export your data (future feature)")
                        bulletPoint("Disable cloud sync and use offline-only mode")
                        bulletPoint("Opt out of personalized advertising")
                        
                        sectionTitle("8. Data Security")
                        sectionText("We take data security seriously:")
                        bulletPoint("All data is stored locally on your device")
                        bulletPoint("iCloud sync uses Apple's encrypted storage")
                        bulletPoint("We do not transmit data to external servers (except iCloud)")
                        bulletPoint("No third-party services have access to your data")
                        
                        sectionTitle("9. Children's Privacy")
                        sectionText("GearPro2 is not intended for children under 13. We do not knowingly collect personal information from children under 13.")
                        
                        sectionTitle("10. Changes to This Policy")
                        sectionText("We may update this Privacy Policy from time to time. We will notify you of any changes by updating the \"Last Updated\" date at the top of this policy.")
                        
                        sectionTitle("11. Contact Us")
                        sectionText("If you have questions about this Privacy Policy, please contact us at:")
                        Text("feedback@gearpro.app")
                            .font(.body)
                            .foregroundColor(.blue)
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Privacy Policy".localized)
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
    PrivacyPolicyView()
}

