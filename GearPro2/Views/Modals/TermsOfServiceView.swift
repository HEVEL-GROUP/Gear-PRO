//
//  TermsOfServiceView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct TermsOfServiceView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Terms of Service".localized)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .padding(.bottom, 8)
                    
                    Text("Last Updated: October 2025")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Group {
                        sectionTitle("1. Acceptance of Terms")
                        sectionText("By downloading, installing, or using GearPro2 (\"the App\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.")
                        
                        sectionTitle("2. Description of Service")
                        sectionText("GearPro2 is a mobile application that helps you manage outdoor gear, plan trips, create packing lists, and track meal plans. The App provides features for organizing gear inventory, planning outdoor adventures, and managing trip-related data.")
                        
                        sectionTitle("3. User Accounts")
                        sectionText("You may use the App without creating an account. If you choose to provide personal information (name, email), you are responsible for maintaining the confidentiality of this information.")
                        
                        sectionTitle("4. Subscription Services")
                        sectionText("GearPro2 may offer subscription services:")
                        bulletPoint("Subscriptions are managed through the Apple App Store")
                        bulletPoint("Payment will be charged to your Apple ID account")
                        bulletPoint("Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period")
                        bulletPoint("You can manage subscriptions and turn off auto-renewal in your Apple ID Account Settings")
                        bulletPoint("No refunds are available for unused portions of subscription periods")
                        
                        sectionTitle("5. Free Trial")
                        sectionText("If offered, free trial periods:")
                        bulletPoint("Begin when you first launch the App or start a subscription")
                        bulletPoint("Automatically convert to a paid subscription at the end of the trial period unless cancelled")
                        bulletPoint("You can cancel during the trial period to avoid charges")
                        
                        sectionTitle("6. User Responsibilities")
                        sectionText("You agree to:")
                        bulletPoint("Use the App only for lawful purposes")
                        bulletPoint("Not attempt to reverse engineer, decompile, or disassemble the App")
                        bulletPoint("Not use the App to transmit any harmful code or malware")
                        bulletPoint("Maintain the security of your device and iCloud account")
                        bulletPoint("Back up your data regularly")
                        
                        sectionTitle("7. Intellectual Property")
                        sectionText("The App, including its design, features, and content, is protected by copyright and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the App without permission.")
                        
                        sectionTitle("8. Data and Privacy")
                        sectionText("Your use of the App is also governed by our Privacy Policy. By using the App, you consent to the collection and use of information as described in the Privacy Policy.")
                        
                        sectionTitle("9. Disclaimer of Warranties")
                        sectionText("The App is provided \"as is\" and \"as available\" without warranties of any kind, either express or implied. We do not guarantee that the App will be error-free, secure, or continuously available.")
                        
                        sectionTitle("10. Limitation of Liability")
                        sectionText("To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the App.")
                        
                        sectionTitle("11. Indemnification")
                        sectionText("You agree to indemnify and hold harmless the App developers from any claims, damages, losses, liabilities, and expenses arising out of your use of the App or violation of these Terms.")
                        
                        sectionTitle("12. Termination")
                        sectionText("We reserve the right to terminate or suspend your access to the App at any time, with or without cause or notice, for any reason, including breach of these Terms.")
                        
                        sectionTitle("13. Changes to Terms")
                        sectionText("We reserve the right to modify these Terms at any time. We will notify you of any material changes by updating the \"Last Updated\" date. Your continued use of the App after changes constitutes acceptance of the new Terms.")
                        
                        sectionTitle("14. Governing Law")
                        sectionText("These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which the App developer operates, without regard to its conflict of law provisions.")
                        
                        sectionTitle("15. Contact Information")
                        sectionText("If you have questions about these Terms of Service, please contact us at:")
                        Text("feedback@gearpro.app")
                            .font(.body)
                            .foregroundColor(.blue)
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Terms of Service".localized)
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
    TermsOfServiceView()
}

