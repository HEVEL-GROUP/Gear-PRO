# Subscription Tracking and Verification Guide

## Overview

This guide explains how GearPro2 tracks subscribers and verifies subscription status to ensure accounts are active.

## Current Implementation

### Client-Side Tracking (Current)

The app uses **StoreKit 2** to track subscriptions locally and verify with Apple's servers:

1. **Local Storage**: Subscription status is stored in UserDefaults for quick access
2. **Apple Server Verification**: Periodic verification with Apple's servers using `Transaction.currentEntitlements`
3. **Automatic Updates**: Subscription status is verified:
   - On app launch
   - When app comes to foreground
   - After purchase completion
   - Every 24 hours (periodic check)

### Key Methods

#### `verifySubscriptionWithApple()`
This is the **most important method** for tracking active subscriptions:

```swift
await SubscriptionManager.shared.verifySubscriptionWithApple()
```

**What it does:**
- Queries Apple's servers for all current entitlements
- Checks if subscriptions are for your app's products
- Verifies expiration dates
- Updates subscription status automatically
- Marks subscription as active/expired based on Apple's data

**When to call:**
- On app launch
- When app enters foreground
- After purchase completion
- Periodically (every 24 hours)
- When user taps "Restore Purchases"

#### `startPeriodicVerification()`
Automatically verifies subscription status every 24 hours in the background.

## How Subscription Verification Works

### 1. Transaction Verification Flow

```
User Purchase
    ↓
StoreKit 2 Transaction Created
    ↓
Transaction.verify() → Checks with Apple
    ↓
If Verified → Update Status → Save Locally
    ↓
Periodic Verification (every 24h)
```

### 2. Status Checking Process

1. **Check Local Status** (fast, instant)
   - Read from UserDefaults
   - Show status immediately

2. **Verify with Apple** (background, async)
   - Query `Transaction.currentEntitlements`
   - Check expiration dates
   - Update local status if changed

3. **Handle Edge Cases**:
   - Subscription renewed → Auto-update to active
   - Subscription cancelled → Auto-update to expired
   - Refunded → Auto-update to expired
   - Trial expired → Move to ad-supported

### 3. Subscription States

```swift
enum SubscriptionStatus {
    case none                    // No subscription, no trial
    case trial(daysRemaining: Int)  // In free trial period
    case active                  // Active paid subscription
    case expired                 // Subscription expired
    case adSupported             // Free tier with ads
}
```

## Verifying Active Accounts

### Real-Time Verification

The app automatically verifies subscription status:

```swift
// On app launch (GearPro2App.swift)
.onAppear {
    Task { @MainActor in
        await SubscriptionManager.shared.verifySubscriptionWithApple()
    }
}

// When app enters foreground
.onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
    Task { @MainActor in
        await SubscriptionManager.shared.verifySubscriptionWithApple()
    }
}
```

### Manual Verification

You can manually verify at any time:

```swift
// In your view
Task {
    await SubscriptionManager.shared.verifySubscriptionWithApple()
}
```

### Checking Subscription Status

```swift
// Check if user is subscribed
let isSubscribed = SubscriptionManager.shared.isSubscribed

// Get current status
let status = SubscriptionManager.shared.subscriptionStatus

// Check if ads should be shown
let showAds = SubscriptionManager.shared.shouldShowAds()

// Get status display text
let statusText = SubscriptionManager.shared.getStatusDisplayText()
```

## Server-Side Tracking (Recommended for Production)

For production apps, you should also track subscriptions on your backend server. This enables:

- Analytics and revenue tracking
- Customer support (check subscription status)
- Fraud prevention
- Cross-platform sync
- Subscription lifecycle management

### Implementation Steps

1. **Create API Endpoint** on your backend:
   ```
   POST /api/subscriptions/update
   ```

2. **Implement `syncSubscriptionStatusToServer()`** in `SubscriptionManager.swift`:

```swift
private func syncSubscriptionStatusToServer() async {
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
    
    // Send to your API
    // Example using URLSession:
    var request = URLRequest(url: URL(string: "https://your-api.com/api/subscriptions/update")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try? JSONSerialization.data(withJSONObject: subscriptionData)
    
    // Send request...
}
```

### Server-Side Receipt Validation

For maximum security, validate receipts on your server:

1. **Get Receipt Data**:
   ```swift
   let receiptData = await SubscriptionManager.shared.getSubscriptionReceiptData()
   ```

2. **Send to Your Server**:
   ```swift
   // POST receipt data to your server
   // Server validates with Apple's App Store Server API
   ```

3. **Server Validates** with Apple:
   - Use App Store Server API
   - Verify receipt authenticity
   - Check subscription status
   - Return validated status to app

## Testing Subscription Status

### Sandbox Testing

1. **Create Sandbox Tester** in App Store Connect
2. **Sign out** of App Store on device
3. **Test Purchase** flow:
   - Purchase subscription
   - Check status updates
   - Verify with Apple
   - Test expiration

### Testing Scenarios

1. **Active Subscription**:
   - Purchase subscription
   - Verify status is `.active`
   - Check expiration date is set

2. **Trial Period**:
   - First launch starts trial
   - Verify status is `.trial`
   - Check days remaining

3. **Expired Subscription**:
   - Wait for expiration (or use sandbox to expire)
   - Verify status becomes `.expired` or `.adSupported`
   - Check ads are shown

4. **Restore Purchases**:
   - Delete app, reinstall
   - Tap "Restore Purchases"
   - Verify subscription is restored

## Monitoring Subscription Health

### Key Metrics to Track

1. **Active Subscribers**: Count of users with `isSubscribed == true`
2. **Trial Users**: Count of users in trial period
3. **Conversion Rate**: Trial → Paid conversion %
4. **Churn Rate**: Subscription cancellations
5. **Revenue**: Monthly/Yearly subscription revenue

### Logging Subscription Events

Add logging for important events:

```swift
// In SubscriptionManager
print("✅ Subscription activated: \(productID)")
print("⚠️ Subscription expired")
print("🔄 Subscription verified: \(status)")
print("💰 Trial started: \(trialStartDate)")
```

## Best Practices

1. **Always Verify with Apple**: Don't rely only on local storage
2. **Handle Edge Cases**: Expired, cancelled, refunded subscriptions
3. **Grace Period**: Consider a grace period for payment failures
4. **User Communication**: Notify users when subscription expires
5. **Restore Purchases**: Always provide restore functionality
6. **Server Sync**: Sync subscription status to your backend
7. **Error Handling**: Handle network failures gracefully
8. **Privacy**: Don't store sensitive payment info locally

## Troubleshooting

### Subscription Status Not Updating

1. **Check Internet Connection**: Verification requires network
2. **Verify Product IDs**: Match App Store Connect exactly
3. **Check Sandbox Environment**: Use sandbox testers
4. **Review Logs**: Check console for errors

### Subscription Not Restoring

1. **Sign in to App Store**: User must be signed in
2. **Check Transaction History**: Verify purchase exists
3. **Call `restorePurchases()`**: Manually trigger restore
4. **Verify with Apple**: Check entitlements directly

## Additional Resources

- [Apple StoreKit 2 Documentation](https://developer.apple.com/documentation/storekit)
- [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [Subscription Best Practices](https://developer.apple.com/app-store/subscriptions/)

