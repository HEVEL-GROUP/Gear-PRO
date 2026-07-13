//
//  SettingsView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI
import UserNotifications

struct SettingsView: View {
    @EnvironmentObject var viewModel: GearTrackerViewModel
    @ObservedObject private var localizationManager = LocalizationManager.shared
    @StateObject private var notificationService = NotificationService.shared
    @AppStorage("firstName") private var firstName: String = ""
    @AppStorage("lastName") private var lastName: String = ""
    @AppStorage("email") private var email: String = ""
    @AppStorage("pushNotifications") private var pushNotifications: Bool = true
    @AppStorage("selectedLanguage") private var selectedLanguage: String = "English"
    @AppStorage("isDarkMode") private var isDarkMode: Bool = false
    @AppStorage("storageMode") private var storageMode: String = "Cloud"
    
    @State private var showEditProfile = false
    @State private var showLanguagePicker = false
    @State private var showDeleteAccountAlert = false
    @State private var showLogoutAlert = false
    @State private var notificationStatus = "Checking..."
    @State private var showStorageInfo = false
    @State private var storageInfo = ""
    @State private var showPrivacyPolicy = false
    @State private var showTermsOfService = false
    @State private var showHelp = false
    @State private var showUpgrade = false
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    
    let languages = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean"]
    
    var body: some View {
        NavigationView {
            List {
                // Account Section
                accountSection
                
                // Preferences Section
                preferencesSection
                
                // Storage Section
                storageSection
                
                // Support Section
                supportSection
                
                // Account Actions Section
                accountActionsSection
            }
            .navigationTitle("Settings".localized)
            .navigationBarTitleDisplayMode(.large)
        }
        .sheet(isPresented: $showEditProfile) {
            EditProfileView(
                firstName: $firstName,
                lastName: $lastName,
                email: $email
            )
        }
        .confirmationDialog("Select Language".localized, isPresented: $showLanguagePicker, titleVisibility: .visible) {
            ForEach(languages, id: \.self) { language in
                Button(language.localized) {
                    selectedLanguage = language
                    localizationManager.setLanguage(language)
                }
            }
            Button("Cancel".localized, role: .cancel) { }
        }
        .alert("Delete Account".localized, isPresented: $showDeleteAccountAlert) {
            Button("Cancel".localized, role: .cancel) { }
            Button("Delete".localized, role: .destructive) {
                deleteAccount()
            }
        } message: {
            Text("This will permanently delete your account and all data. This action cannot be undone.".localized)
        }
        .alert("Logout".localized, isPresented: $showLogoutAlert) {
            Button("Cancel".localized, role: .cancel) { }
            Button("Logout".localized, role: .destructive) {
                logout()
            }
        } message: {
            Text("Are you sure you want to logout?".localized)
        }
        .alert("Storage Details", isPresented: $showStorageInfo) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(storageInfo)
        }
        .sheet(isPresented: $showPrivacyPolicy) {
            PrivacyPolicyView()
        }
        .sheet(isPresented: $showTermsOfService) {
            TermsOfServiceView()
        }
        .sheet(isPresented: $showHelp) {
            HelpView()
        }
        .sheet(isPresented: $showUpgrade) {
            UpgradeView()
        }
        .onAppear {
            checkNotificationStatus()
            subscriptionManager.checkSubscriptionStatus()
        }
    }
    
    private var accountSection: some View {
        Section("Account".localized) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Account Status".localized)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(subscriptionManager.getStatusDisplayText())
                        .font(.headline)
                        .foregroundColor(statusColor)
                    
                    // Show expiration date if applicable
                    if let expiration = subscriptionManager.subscriptionExpirationDate,
                       subscriptionManager.isSubscribed {
                        Text(String(format: "Renews: %@".localized, formatDate(expiration)))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else if case .trial(let days) = subscriptionManager.subscriptionStatus,
                              let trialEnd = subscriptionManager.trialEndDate {
                        Text(String(format: "Expires: %@".localized, formatDate(trialEnd)))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()
                
                if !subscriptionManager.isSubscribed {
                    Button("Upgrade".localized) {
                        showUpgrade = true
                    }
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.1))
                    .foregroundColor(.blue)
                    .cornerRadius(8)
                } else {
                    Link(destination: URL(string: "https://apps.apple.com/account/subscriptions")!) {
                        Text("Manage".localized)
                            .font(.caption)
                            .fontWeight(.medium)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.green.opacity(0.1))
                            .foregroundColor(.green)
                            .cornerRadius(8)
                    }
                }
            }
            
            Button(action: {
                showEditProfile = true
            }) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Profile")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Text("\(firstName.isEmpty ? "First" : firstName) \(lastName.isEmpty ? "Last" : lastName)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(email.isEmpty ? "email@example.com" : email)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(.plain)
        }
    }
    
    private var preferencesSection: some View {
        Section("Preferences".localized) {
            Toggle("Push Notifications".localized, isOn: $pushNotifications)
                .tint(.blue)
                .onChange(of: pushNotifications) { _, isEnabled in
                    if isEnabled {
                        Task {
                            await notificationService.requestPermission()
                        }
                    }
                }
            
            if pushNotifications {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Trip Reminders".localized)
                            .font(.subheadline)
                        Spacer()
                        if !notificationService.isAuthorized {
                            Button("Enable".localized) {
                                Task {
                                    await notificationService.requestPermission()
                                }
                            }
                            .font(.caption)
                            .fontWeight(.medium)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(6)
                        }
                    }
                    
                    if notificationService.isAuthorized {
                        HStack {
                            Text("Notify me")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Picker("Days ahead".localized, selection: $notificationService.notificationDaysAhead) {
                                ForEach(1...7, id: \.self) { day in
                                    Text("\(day) day\(day == 1 ? "" : "s")")
                                        .tag(day)
                                }
                            }
                            .pickerStyle(.menu)
                            .onChange(of: notificationService.notificationDaysAhead) { _, _ in
                                notificationService.updateNotificationDaysAhead(notificationService.notificationDaysAhead)
                            }
                            
                            Text("before trips")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Spacer()
                        }
                        
                        Text("You'll receive notifications for upcoming trips".localized)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Text("Status".localized + ": \(notificationStatus)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Button("Test Notification".localized) {
                            Task {
                                await testNotification()
                                checkNotificationStatus() // Refresh status after test
                            }
                        }
                        .font(.caption2)
                        .foregroundColor(.blue)
                        .padding(.top, 4)
                    } else {
                        Text("Enable notifications to get reminders about upcoming trips".localized)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Text("Status".localized + ": \(notificationStatus)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Button("Test Permission Request".localized) {
                            Task {
                                await testNotification()
                                checkNotificationStatus() // Refresh status after test
                            }
                        }
                        .font(.caption2)
                        .foregroundColor(.orange)
                        .padding(.top, 4)
                    }
                }
                .padding(.vertical, 4)
            }
            
            Button(action: {
                showLanguagePicker = true
            }) {
                HStack {
                    Text("Language".localized)
                    Spacer()
                    Text(selectedLanguage.localized)
                        .foregroundColor(.secondary)
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(.plain)
            
            Toggle("Dark Mode".localized, isOn: $isDarkMode)
                .tint(.blue)
        }
    }
    
    private var storageSection: some View {
        Section("Data Storage".localized) {
            Picker("Storage Mode".localized, selection: $storageMode) {
                Text("Apple Cloud".localized).tag("Cloud")
                Text("Offline Only".localized).tag("Offline")
            }
            .pickerStyle(.segmented)
            .onChange(of: storageMode) { _, newValue in
                // Notify storage manager of the change
                NotificationCenter.default.post(name: NSNotification.Name("StorageModeChanged"), object: nil)
            }
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Current Mode")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(storageMode == "Cloud" ? "Syncing to iCloud" : "Local Storage Only")
                        .font(.caption)
                        .foregroundColor(storageMode == "Cloud" ? .blue : .orange)
                }
                Spacer()
                Image(systemName: storageMode == "Cloud" ? "icloud.fill" : "externaldrive.fill")
                    .foregroundColor(storageMode == "Cloud" ? .blue : .orange)
            }
            
            // Debug: Show storage info
            Button(action: {
                storageInfo = StorageManager.shared.getStorageInfo()
                showStorageInfo = true
            }) {
                HStack {
                    Image(systemName: "info.circle")
                    Text("View Storage Details")
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
    
    private var supportSection: some View {
        Section("Support".localized) {
            Button(action: {
                showHelp = true
            }) {
                HStack {
                    Image(systemName: "questionmark.circle")
                        .foregroundColor(.blue)
                    Text("Help".localized)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(.plain)
            
            Link(destination: URL(string: "mailto:feedback@gearpro.app")!) {
                HStack {
                    Image(systemName: "envelope")
                        .foregroundColor(.green)
                    Text("Send Feedback".localized)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Button(action: {
                showTermsOfService = true
            }) {
                HStack {
                    Image(systemName: "doc.text")
                        .foregroundColor(.gray)
                    Text("Terms of Service".localized)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(.plain)
            
            Button(action: {
                showPrivacyPolicy = true
            }) {
                HStack {
                    Image(systemName: "hand.raised")
                        .foregroundColor(.purple)
                    Text("Privacy Policy".localized)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(.plain)
        }
    }
    
    private var accountActionsSection: some View {
        Section("Account Actions".localized) {
            Button(action: {
                showLogoutAlert = true
            }) {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundColor(.orange)
                    Text("Logout".localized)
                        .foregroundColor(.orange)
                }
            }
            .buttonStyle(.plain)
            
            Button(action: {
                showDeleteAccountAlert = true
            }) {
                HStack {
                    Image(systemName: "trash")
                        .foregroundColor(.red)
                    Text("Delete Account".localized)
                        .foregroundColor(.red)
                }
            }
            .buttonStyle(.plain)
        }
    }
    
    private func deleteAccount() {
        // Handle account deletion
        print("Account deletion requested")
        // Clear all data
        firstName = ""
        lastName = ""
        email = ""
        // Reset to default settings
        pushNotifications = true
        selectedLanguage = "English"
        isDarkMode = false
        storageMode = "Cloud"
    }
    
    private func logout() {
        // Handle logout
        print("Logout requested")
        // Clear sensitive data but keep preferences
        firstName = ""
        lastName = ""
        email = ""
    }
    
    private func checkNotificationStatus() {
        Task {
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            await MainActor.run {
                switch settings.authorizationStatus {
                case .authorized:
                    notificationStatus = "✅ Authorized"
                case .denied:
                    notificationStatus = "❌ Denied"
                case .notDetermined:
                    notificationStatus = "⚠️ Not Determined"
                case .provisional:
                    notificationStatus = "🔶 Provisional"
                case .ephemeral:
                    notificationStatus = "⏰ Ephemeral"
                @unknown default:
                    notificationStatus = "❓ Unknown"
                }
            }
        }
    }
    
    private var statusColor: Color {
        switch subscriptionManager.subscriptionStatus {
        case .active:
            return .green
        case .trial:
            return .blue
        case .expired, .adSupported:
            return .orange
        case .none:
            return .gray
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
    
    private func testNotification() async {
        print("=== TEST NOTIFICATION DEBUG ===")
        print("Notification service authorized: \(notificationService.isAuthorized)")
        
        // Check current notification settings
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        print("System notification settings: \(settings.authorizationStatus.rawValue)")
        
        if !notificationService.isAuthorized {
            print("❌ Notifications not authorized - requesting permission first")
            let granted = await notificationService.requestPermission()
            print("Permission granted: \(granted)")
            
            if !granted {
                print("❌ Permission denied - cannot test notifications")
                return
            }
        }
        
        // Cancel any existing test notifications first
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["test-notification"])
        
        // Create a test notification that fires in 3 seconds
        let content = UNMutableNotificationContent()
        content.title = "🧪 Test Trip Reminder"
        content.body = "This is a test notification! Your notification system is working correctly."
        content.sound = .default
        content.badge = 1
        
        // Add category for better handling
        content.categoryIdentifier = "TRIP_REMINDER"
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 3, repeats: false)
        let request = UNNotificationRequest(identifier: "test-notification", content: content, trigger: trigger)
        
        do {
            try await UNUserNotificationCenter.current().add(request)
            print("✅ Test notification scheduled for 3 seconds from now")
            print("Notification ID: test-notification")
            print("Content: \(content.title) - \(content.body)")
        } catch {
            print("❌ Error scheduling test notification: \(error)")
        }
        
        // Also check pending notifications
        let pendingRequests = await UNUserNotificationCenter.current().pendingNotificationRequests()
        print("Total pending notifications: \(pendingRequests.count)")
        for request in pendingRequests {
            print("- Pending: \(request.identifier)")
        }
        print("===============================")
    }
}

struct EditProfileView: View {
    @Environment(\.dismiss) var dismiss
    @Binding var firstName: String
    @Binding var lastName: String
    @Binding var email: String
    
    var body: some View {
        NavigationView {
            Form {
                Section("Personal Information".localized) {
                    TextField("First Name".localized, text: $firstName)
                    TextField("Last Name".localized, text: $lastName)
                    TextField("Email".localized, text: $email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                }
                
                Section {
                    Text("Your profile information is stored locally and securely.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Edit Profile".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel".localized) {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save".localized) {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(GearTrackerViewModel())
}
