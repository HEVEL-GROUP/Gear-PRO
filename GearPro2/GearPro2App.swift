//
//  GearPro2App.swift
//  GearPro2
//
//  Created by Austin Norville on 10/21/25.
//

import SwiftUI

@main
struct GearPro2App: App {
    @ObservedObject private var notificationService = NotificationService.shared
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    @AppStorage("isDarkMode") private var isDarkMode: Bool = false
    
    var body: some Scene {
        WindowGroup {
            MainView()
                .environmentObject(notificationService)
                .preferredColorScheme(isDarkMode ? .dark : .light)
                .onAppear {
                    setupNotifications()
                    verifySubscriptionOnLaunch()
                }
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
                    // Verify subscription when app comes to foreground
                    Task { @MainActor in
                        await subscriptionManager.verifySubscriptionWithApple()
                    }
                }
        }
    }
    
    private func setupNotifications() {
        // Set up notification categories
        notificationService.setupNotificationCategories()
        
        // Request permission if user has enabled push notifications
        if UserDefaults.standard.bool(forKey: "pushNotifications") {
            Task {
                await notificationService.requestPermission()
            }
        }
    }
    
    private func verifySubscriptionOnLaunch() {
        // Verify subscription status on app launch
        Task { @MainActor in
            await subscriptionManager.verifySubscriptionWithApple()
        }
    }
}
