//
//  AdBannerView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

struct AdBannerView: View {
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    
    var body: some View {
        if subscriptionManager.shouldShowAds() {
            // Ad Banner Placeholder
            // TODO: Replace with actual AdMob banner ad
            // To integrate AdMob:
            // 1. Add Google-Mobile-Ads-SDK via Swift Package Manager
            // 2. Add your AdMob App ID to Info.plist (GADApplicationIdentifier)
            // 3. Replace this placeholder with GADBannerView wrapped in UIViewRepresentable
            
            ZStack {
                Color.gray.opacity(0.2)
                
                VStack(spacing: 8) {
                    Image(systemName: "rectangle.3.group.fill")
                        .font(.title2)
                        .foregroundColor(.gray)
                    
                    Text("Advertisement".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Button(action: {
                        // Navigate to upgrade view
                        // This would typically be handled via environment or navigation
                        // For now, this is a placeholder for ad removal
                    }) {
                        Text("Remove Ads".localized)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundColor(.blue)
                    }
                }
                .padding()
            }
            .frame(height: 50)
            .cornerRadius(8)
            .padding(.horizontal)
            .padding(.bottom, 8)
        }
    }
}

// MARK: - AdMob Integration Template
// Uncomment and configure when ready to integrate AdMob:
/*
import GoogleMobileAds

struct AdMobBannerView: UIViewRepresentable {
    let adUnitID: String
    
    func makeUIView(context: Context) -> GADBannerView {
        let banner = GADBannerView(adSize: GADAdSizeBanner)
        banner.adUnitID = adUnitID
        banner.rootViewController = UIApplication.shared.windows.first?.rootViewController
        banner.load(GADRequest())
        return banner
    }
    
    func updateUIView(_ uiView: GADBannerView, context: Context) {
        // No updates needed
    }
}
*/

#Preview {
    AdBannerView()
        .frame(height: 50)
}

