//
//  UpgradeView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI
import StoreKit

struct UpgradeView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    @State private var products: [Product] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var selectedProductID: String?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.yellow)
                            .padding(.top, 20)
                        
                        Text("Upgrade to Premium".localized)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Unlock all features and remove ads".localized)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal)
                    
                    // Current Status
                    if case .trial(let days) = subscriptionManager.subscriptionStatus {
                        HStack {
                            Image(systemName: "clock.fill")
                                .foregroundColor(.blue)
                            Text(String(format: "%d days left in your free trial".localized, days))
                                .font(.subheadline)
                        }
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }
                    
                    // Features List
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Premium Features".localized)
                            .font(.headline)
                            .padding(.horizontal)
                        
                        FeatureRow(icon: "checkmark.circle.fill", text: "Unlimited trips and gear items".localized)
                        FeatureRow(icon: "checkmark.circle.fill", text: "No advertisements".localized)
                        FeatureRow(icon: "checkmark.circle.fill", text: "Priority cloud sync".localized)
                        FeatureRow(icon: "checkmark.circle.fill", text: "Advanced analytics".localized)
                        FeatureRow(icon: "checkmark.circle.fill", text: "Export and backup features".localized)
                    }
                    .padding(.vertical)
                    
                    // Subscription Options
                    if isLoading {
                        VStack(spacing: 12) {
                            ProgressView()
                            Text("Loading subscription options...".localized)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                    } else if products.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.title)
                                .foregroundColor(.orange)
                            
                            Text("No Subscription Options Available".localized)
                                .font(.headline)
                            
                            Text("Subscription products are not yet configured. Please set up subscription products in App Store Connect with the following product IDs:".localized)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Monthly: \(subscriptionManager.monthlyProductID)")
                                    .font(.system(.caption, design: .monospaced))
                                    .foregroundColor(.secondary)
                                
                                Text("Yearly: \(subscriptionManager.yearlyProductID)")
                                    .font(.system(.caption, design: .monospaced))
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                            .background(Color(UIColor.secondarySystemBackground))
                            .cornerRadius(8)
                            .padding(.horizontal)
                            
                            Button(action: {
                                Task {
                                    await loadProducts()
                                }
                            }) {
                                HStack {
                                    Image(systemName: "arrow.clockwise")
                                    Text("Retry".localized)
                                }
                                .font(.subheadline)
                                .foregroundColor(.blue)
                            }
                            .padding(.top, 8)
                        }
                        .padding()
                    } else {
                        VStack(spacing: 12) {
                            ForEach(products, id: \.id) { product in
                                SubscriptionOptionCard(
                                    product: product,
                                    isSelected: selectedProductID == product.id,
                                    onSelect: {
                                        selectedProductID = product.id
                                    }
                                )
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    // Purchase Button
                    if let selectedID = selectedProductID {
                        Button(action: {
                            Task {
                                await purchaseSubscription(productID: selectedID)
                            }
                        }) {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Subscribe Now".localized)
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(isLoading)
                        .padding(.horizontal)
                    }
                    
                    // Restore Purchases
                    Button(action: {
                        Task {
                            await restorePurchases()
                        }
                    }) {
                        Text("Restore Purchases".localized)
                            .font(.subheadline)
                            .foregroundColor(.blue)
                    }
                    .padding(.bottom)
                    
                    // Terms
                    Text("By subscribing, you agree to our Terms of Service and Privacy Policy. Subscriptions auto-renew unless cancelled 24 hours before the end of the period.".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
            .navigationTitle("Upgrade".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel".localized) {
                        dismiss()
                    }
                }
            }
            .alert("Error".localized, isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage ?? "Unknown error".localized)
            }
            .task {
                await loadProducts()
            }
            .refreshable {
                await loadProducts()
            }
            .onAppear {
                // Ensure products load even if task doesn't trigger
                if products.isEmpty && !isLoading {
                    Task {
                        await loadProducts()
                    }
                }
            }
        }
    }
    
    private func loadProducts() async {
        isLoading = true
        errorMessage = nil
        
        do {
            products = try await subscriptionManager.loadProducts()
            
            // Auto-select yearly if available (better value)
            if let yearly = products.first(where: { $0.id == subscriptionManager.yearlyProductID }) {
                selectedProductID = yearly.id
            } else if let monthly = products.first(where: { $0.id == subscriptionManager.monthlyProductID }) {
                selectedProductID = monthly.id
            } else if !products.isEmpty {
                selectedProductID = products.first?.id
            }
            
            // If still no selection and we have products, select first
            if selectedProductID == nil && !products.isEmpty {
                selectedProductID = products.first?.id
            }
            
        } catch {
            print("❌ Failed to load products: \(error)")
            errorMessage = "Failed to load subscription options: \(error.localizedDescription)".localized
            
            // Don't show error alert for empty products - we show a helpful message instead
            if !error.localizedDescription.contains("product") {
                showError = true
            }
        }
        
        isLoading = false
    }
    
    private func purchaseSubscription(productID: String) async {
        isLoading = true
        do {
            try await subscriptionManager.purchaseSubscription(productID: productID)
            // Success - dismiss and refresh
            dismiss()
        } catch {
            if let subError = error as? SubscriptionError,
               case .userCancelled = subError {
                // User cancelled - don't show error
                return
            }
            errorMessage = error.localizedDescription
            showError = true
        }
        isLoading = false
    }
    
    private func restorePurchases() async {
        isLoading = true
        do {
            try await subscriptionManager.restorePurchases()
            errorMessage = "Purchases restored successfully".localized
            showError = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
        isLoading = false
    }
}

struct FeatureRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.green)
                .font(.title3)
            Text(text)
                .font(.body)
            Spacer()
        }
        .padding(.horizontal)
    }
}

struct SubscriptionOptionCard: View {
    let product: Product
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(product.displayName)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    if let subscription = product.subscription {
                        Text(formatSubscriptionPeriod(subscription.subscriptionPeriod))
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    Text(product.displayPrice)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
                
                Spacer()
                
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(isSelected ? .green : .gray)
            }
            .padding()
            .background(isSelected ? Color.green.opacity(0.1) : Color(UIColor.secondarySystemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.green : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
    
    private func formatSubscriptionPeriod(_ period: Product.SubscriptionPeriod) -> String {
        switch period.unit {
        case .day:
            return "\(period.value) day\(period.value > 1 ? "s" : "")".localized
        case .week:
            return "\(period.value) week\(period.value > 1 ? "s" : "")".localized
        case .month:
            if period.value == 12 {
                return "Yearly".localized
            }
            return "\(period.value) month\(period.value > 1 ? "s" : "")".localized
        case .year:
            return "\(period.value) year\(period.value > 1 ? "s" : "")".localized
        @unknown default:
            return "Subscription".localized
        }
    }
}

#Preview {
    UpgradeView()
}

