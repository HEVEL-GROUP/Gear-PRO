//
//  SubscriptionManager.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import Foundation
import Combine
import StoreKit

enum SubscriptionStatus {
    case none
    case trial(daysRemaining: Int)
    case active
    case expired
    case adSupported
}

class SubscriptionManager: ObservableObject {
    static let shared = SubscriptionManager()
    
    @Published var subscriptionStatus: SubscriptionStatus = .none
    @Published var trialStartDate: Date?
    @Published var trialEndDate: Date?
    @Published var subscriptionExpirationDate: Date?
    @Published var isSubscribed: Bool = false
    
    private let trialDurationDays: Int = 7 // Default 7-day trial
    private let subscriptionStatusKey = "subscriptionStatus"
    private let trialStartDateKey = "trialStartDate"
    private let subscriptionExpirationDateKey = "subscriptionExpirationDate"
    
    // Product IDs - These should match your App Store Connect configuration
    let monthlyProductID = "com.norville.gearpro2.monthly"
    let yearlyProductID = "com.norville.gearpro2.yearly"
    
    private init() {
        loadSubscriptionStatus()
        checkSubscriptionStatus()
        
        // Start periodic verification on background
        Task { @MainActor in
            await startPeriodicVerification()
        }
    }
    
    // MARK: - Subscription Status Management
    
    func checkSubscriptionStatus() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            // Check if user has started a trial
            if self.trialStartDate == nil {
                // First launch - start trial
                self.startTrial()
            } else {
                // Check trial expiration
                if let trialEnd = self.trialEndDate, Date() > trialEnd {
                    // Trial expired
                    if self.isSubscribed {
                        // Check if subscription is still active
                        self.checkActiveSubscription()
                    } else {
                        // Move to ad-supported mode
                        self.subscriptionStatus = .adSupported
                    }
                } else if let trialEnd = self.trialEndDate {
                    // Still in trial
                    let daysRemaining = Calendar.current.dateComponents([.day], from: Date(), to: trialEnd).day ?? 0
                    self.subscriptionStatus = .trial(daysRemaining: max(0, daysRemaining))
                }
            }
            
            self.saveSubscriptionStatus()
        }
    }
    
    func startTrial() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let startDate = Date()
            self.trialStartDate = startDate
            self.trialEndDate = Calendar.current.date(byAdding: .day, value: self.trialDurationDays, to: startDate)
            
            let daysRemaining = Calendar.current.dateComponents([.day], from: startDate, to: self.trialEndDate!).day ?? self.trialDurationDays
            self.subscriptionStatus = .trial(daysRemaining: daysRemaining)
            
            self.saveSubscriptionStatus()
        }
    }
    
    func activateSubscription(expirationDate: Date) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.isSubscribed = true
            self.subscriptionExpirationDate = expirationDate
            self.subscriptionStatus = .active
            self.saveSubscriptionStatus()
        }
    }
    
    func checkActiveSubscription() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if let expiration = self.subscriptionExpirationDate {
                if Date() < expiration {
                    self.subscriptionStatus = .active
                    self.isSubscribed = true
                } else {
                    self.subscriptionStatus = .expired
                    self.isSubscribed = false
                }
            } else {
                // No subscription found
                if let trialEnd = self.trialEndDate, Date() > trialEnd {
                    self.subscriptionStatus = .adSupported
                } else {
                    self.checkSubscriptionStatus()
                }
            }
            self.saveSubscriptionStatus()
        }
    }
    
    // MARK: - StoreKit 2 Integration
    
    @MainActor
    func purchaseSubscription(productID: String) async throws {
        guard let product = try? await Product.products(for: [productID]).first else {
            throw SubscriptionError.productNotFound
        }
        
        let result = try await product.purchase()
        
        switch result {
        case .success(let verification):
            switch verification {
            case .verified(let transaction):
                // Transaction verified
                await transaction.finish()
                
                // Update subscription status
                if let expirationDate = transaction.expirationDate {
                    self.isSubscribed = true
                    self.subscriptionExpirationDate = expirationDate
                    self.subscriptionStatus = .active
                    self.saveSubscriptionStatus()
                } else {
                    // Non-renewing subscription or lifetime purchase
                    self.isSubscribed = true
                    self.subscriptionExpirationDate = Date.distantFuture
                    self.subscriptionStatus = .active
                    self.saveSubscriptionStatus()
                }
                
                // Verify with Apple servers to ensure consistency
                await verifySubscriptionWithApple()
                
            case .unverified(_, let error):
                throw SubscriptionError.verificationFailed(error)
            }
        case .userCancelled:
            throw SubscriptionError.userCancelled
        case .pending:
            throw SubscriptionError.pending
        @unknown default:
            throw SubscriptionError.unknown
        }
    }
    
    @MainActor
    func restorePurchases() async throws {
        try await AppStore.sync()
        await verifySubscriptionWithApple()
    }
    
    @MainActor
    func loadProducts() async throws -> [Product] {
        let productIDs = [monthlyProductID, yearlyProductID]
        print("🛒 Loading products with IDs: \(productIDs)")
        
        do {
            let loadedProducts = try await Product.products(for: productIDs)
            print("✅ Successfully loaded \(loadedProducts.count) products")
            for product in loadedProducts {
                print("   - \(product.id): \(product.displayName) - \(product.displayPrice)")
            }
            
            if loadedProducts.isEmpty {
                print("⚠️ No products found. Make sure products are configured in App Store Connect with IDs:")
                print("   - \(monthlyProductID)")
                print("   - \(yearlyProductID)")
            }
            
            return loadedProducts
        } catch {
            print("❌ Error loading products: \(error.localizedDescription)")
            throw error
        }
    }
    
    // MARK: - Subscription Verification with Apple
    
    /// Verifies subscription status directly with Apple's servers using StoreKit 2
    /// This is the most reliable way to check if a subscription is active
    @MainActor
    func verifySubscriptionWithApple() async {
        var hasActiveSubscription = false
        var latestExpirationDate: Date?
        var latestTransactionID: UInt64?
        
        // Check all current entitlements (active subscriptions)
        for await result in Transaction.currentEntitlements {
            switch result {
            case .verified(let transaction):
                // Check if this transaction is for our subscription products
                if transaction.productID == monthlyProductID || transaction.productID == yearlyProductID {
                    // Check if subscription is still valid
                    if let expirationDate = transaction.expirationDate {
                        if expirationDate > Date() {
                            // Subscription is active
                            hasActiveSubscription = true
                            
                            // Track the latest expiration date
                            if latestExpirationDate == nil || expirationDate > latestExpirationDate! {
                                latestExpirationDate = expirationDate
                                latestTransactionID = transaction.id
                            }
                        }
                    } else {
                        // Lifetime purchase or non-expiring subscription
                        hasActiveSubscription = true
                        latestExpirationDate = Date.distantFuture
                        latestTransactionID = transaction.id
                    }
                }
            case .unverified(_, let error):
                print("⚠️ Unverified transaction: \(error.localizedDescription)")
                // Continue checking other transactions
            }
        }
        
        // Update subscription status based on verification
        if hasActiveSubscription, let expiration = latestExpirationDate {
            self.isSubscribed = true
            self.subscriptionExpirationDate = expiration
            self.subscriptionStatus = .active
            print("✅ Active subscription verified. Expires: \(expiration)")
        } else {
            // No active subscription found
            self.isSubscribed = false
            
            // Check if we're still in trial period
            if let trialEnd = trialEndDate, Date() <= trialEnd {
                let daysRemaining = Calendar.current.dateComponents([.day], from: Date(), to: trialEnd).day ?? 0
                self.subscriptionStatus = .trial(daysRemaining: max(0, daysRemaining))
            } else {
                // Trial expired and no active subscription
                self.subscriptionStatus = .adSupported
            }
            print("ℹ️ No active subscription found")
        }
        
        saveSubscriptionStatus()
        
        // Optionally: Send subscription status to your backend server
        await syncSubscriptionStatusToServer()
    }
    
    /// Periodically checks subscription status (call this on app launch and periodically)
    @MainActor
    func startPeriodicVerification() async {
        // Verify immediately
        await verifySubscriptionWithApple()
        
        // Set up periodic checks (every 24 hours)
        Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 24 * 60 * 60 * 1_000_000_000) // 24 hours
                await verifySubscriptionWithApple()
            }
        }
    }
    
    // MARK: - Server-Side Tracking (Optional)
    
    /// Sends subscription status to your backend server for analytics and support
    /// Implement this method to sync subscription data to your server
    private func syncSubscriptionStatusToServer() async {
        // TODO: Implement server sync
        // This is where you would send subscription data to your backend
        
        /*
        Example implementation:
        
        guard let userID = getCurrentUserID() else { return }
        
        let subscriptionData: [String: Any] = [
            "user_id": userID,
            "is_subscribed": isSubscribed,
            "subscription_status": subscriptionStatusString,
            "trial_start_date": trialStartDate?.timeIntervalSince1970 ?? 0,
            "trial_end_date": trialEndDate?.timeIntervalSince1970 ?? 0,
            "subscription_expiration_date": subscriptionExpirationDate?.timeIntervalSince1970 ?? 0,
            "device_id": UIDevice.current.identifierForVendor?.uuidString ?? "",
            "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
        ]
        
        // Send to your API endpoint
        // Example: POST https://your-api.com/api/subscriptions/update
        */
    }
    
    /// Gets subscription receipt data for server-side validation
    /// This is useful for server-side receipt validation
    func getSubscriptionReceiptData() async -> Data? {
        // For StoreKit 2, we can get transaction data
        // This would be used with your backend for receipt validation
        
        var transactionData: [String: Any] = [:]
        
        for await result in Transaction.currentEntitlements {
            switch result {
            case .verified(let transaction):
                if transaction.productID == monthlyProductID || transaction.productID == yearlyProductID {
                    transactionData["transaction_id"] = String(transaction.id)
                    transactionData["product_id"] = transaction.productID
                    transactionData["purchase_date"] = transaction.purchaseDate.timeIntervalSince1970
                    transactionData["expiration_date"] = transaction.expirationDate?.timeIntervalSince1970
                }
            case .unverified:
                continue
            }
        }
        
        // Convert to JSON
        return try? JSONSerialization.data(withJSONObject: transactionData)
    }
    
    // MARK: - Persistence
    
    private func saveSubscriptionStatus() {
        UserDefaults.standard.set(isSubscribed, forKey: "isSubscribed")
        
        if let trialStart = trialStartDate {
            UserDefaults.standard.set(trialStart, forKey: trialStartDateKey)
        }
        
        if let trialEnd = trialEndDate {
            UserDefaults.standard.set(trialEnd, forKey: "trialEndDate")
        }
        
        if let expiration = subscriptionExpirationDate {
            UserDefaults.standard.set(expiration, forKey: subscriptionExpirationDateKey)
        }
        
        // Save status enum
        let statusString: String
        switch subscriptionStatus {
        case .none:
            statusString = "none"
        case .trial(let days):
            statusString = "trial_\(days)"
        case .active:
            statusString = "active"
        case .expired:
            statusString = "expired"
        case .adSupported:
            statusString = "adSupported"
        }
        UserDefaults.standard.set(statusString, forKey: subscriptionStatusKey)
    }
    
    private func loadSubscriptionStatus() {
        isSubscribed = UserDefaults.standard.bool(forKey: "isSubscribed")
        
        if let trialStart = UserDefaults.standard.object(forKey: trialStartDateKey) as? Date {
            trialStartDate = trialStart
        }
        
        if let trialEnd = UserDefaults.standard.object(forKey: "trialEndDate") as? Date {
            trialEndDate = trialEnd
        }
        
        if let expiration = UserDefaults.standard.object(forKey: subscriptionExpirationDateKey) as? Date {
            subscriptionExpirationDate = expiration
        }
        
        // Load status enum
        if let statusString = UserDefaults.standard.string(forKey: subscriptionStatusKey) {
            if statusString.hasPrefix("trial_") {
                let days = Int(statusString.replacingOccurrences(of: "trial_", with: "")) ?? 0
                subscriptionStatus = .trial(daysRemaining: days)
            } else {
                switch statusString {
                case "none":
                    subscriptionStatus = .none
                case "active":
                    subscriptionStatus = .active
                case "expired":
                    subscriptionStatus = .expired
                case "adSupported":
                    subscriptionStatus = .adSupported
                default:
                    subscriptionStatus = .none
                }
            }
        }
    }
    
    // MARK: - Helper Methods
    
    func shouldShowAds() -> Bool {
        switch subscriptionStatus {
        case .active, .trial:
            return false
        case .adSupported, .expired, .none:
            return true
        }
    }
    
    func getStatusDisplayText() -> String {
        switch subscriptionStatus {
        case .none:
            return "Free Trial".localized
        case .trial(let days):
            return String(format: "Free Trial - %d days left".localized, days)
        case .active:
            return "Active Subscription".localized
        case .expired:
            return "Subscription Expired".localized
        case .adSupported:
            return "Free (Ad-Supported)".localized
        }
    }
}

enum SubscriptionError: LocalizedError {
    case productNotFound
    case verificationFailed(Error)
    case userCancelled
    case pending
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .productNotFound:
            return "Product not found".localized
        case .verificationFailed(let error):
            return "Verification failed: \(error.localizedDescription)".localized
        case .userCancelled:
            return "Purchase cancelled".localized
        case .pending:
            return "Purchase pending".localized
        case .unknown:
            return "Unknown error".localized
        }
    }
}

