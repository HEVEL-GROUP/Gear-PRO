//
//  MainView.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import SwiftUI

enum NavigationTab: String, CaseIterable {
    case dashboard
    case packing
    case meals
    case gear
    case trips
    case settings
    
    var label: String {
        switch self {
        case .dashboard: return "Dashboard".localized
        case .packing: return "Packing".localized
        case .meals: return "Meal Planning".localized
        case .gear: return "Gear Library".localized
        case .trips: return "Trips".localized
        case .settings: return "Settings".localized
        }
    }
    
    var icon: String {
        switch self {
        case .dashboard: return "house.fill"
        case .packing: return "backpack.fill"
        case .meals: return "fork.knife"
        case .gear: return "gearshape.fill"
        case .trips: return "calendar"
        case .settings: return "gearshape.2.fill"
        }
    }
}

struct MainView: View {
    @StateObject private var viewModel = GearTrackerViewModel()
    @ObservedObject private var localizationManager = LocalizationManager.shared
    @State private var activeTab: NavigationTab = .dashboard
    @State private var selectedTrip: Trip?
    @State private var selectedBag: String?
    @AppStorage("storageMode") private var storageMode: String = "Cloud"
    @State private var showSyncIndicator = false
    
    var body: some View {
        ZStack(alignment: .bottom) {
            Color(UIColor.systemGroupedBackground)
                .ignoresSafeArea()
            
            // Sync indicator at top
            VStack {
                if showSyncIndicator {
                    syncStatusBanner
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
                Spacer()
            }
            .zIndex(1)
            
            // Content
            VStack(spacing: 0) {
                content
                    .padding(.horizontal)
                    .padding(.top)
                Spacer()
            }
            .padding(.bottom, 80)
            
            // Bottom Navigation
            bottomNavigation
            
            // Ad Banner (if applicable)
            if SubscriptionManager.shared.shouldShowAds() {
                VStack {
                    Spacer()
                    AdBannerView()
                        .padding(.bottom, 80) // Above bottom navigation
                }
            }
        }
        .environmentObject(viewModel)
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("ReloadDataFromCloud"))) { _ in
            withAnimation {
                showSyncIndicator = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                withAnimation {
                    showSyncIndicator = false
                }
            }
        }
    }
    
    @ViewBuilder
    private var content: some View {
        switch activeTab {
        case .dashboard:
            DashboardView(
                selectedTrip: $selectedTrip,
                selectedBag: $selectedBag,
                activeTab: $activeTab
            )
        case .packing:
            PackingView(
                selectedTrip: $selectedTrip,
                selectedBag: $selectedBag,
                activeTab: $activeTab
            )
        case .meals:
            MealPlanningView(
                selectedTrip: $selectedTrip,
                selectedBag: $selectedBag,
                activeTab: $activeTab
            )
        case .gear:
            GearLibraryView(activeTab: $activeTab)
        case .trips:
            TripsView(
                selectedTrip: $selectedTrip,
                selectedBag: $selectedBag,
                activeTab: $activeTab
            )
        case .settings:
            SettingsView()
        }
    }
    
    private var syncStatusBanner: some View {
        HStack(spacing: 12) {
            Image(systemName: storageMode == "Cloud" ? "icloud.and.arrow.down.fill" : "externaldrive.fill")
                .foregroundColor(storageMode == "Cloud" ? .blue : .orange)
                .font(.system(size: 20))
            
            VStack(alignment: .leading, spacing: 2) {
                Text(storageMode == "Cloud" ? "Synced from iCloud" : "Loaded from Local Storage")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text("Your data is up to date")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
                .font(.system(size: 20))
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(UIColor.secondarySystemBackground))
                .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
        )
        .padding(.horizontal)
        .padding(.top, 8)
    }
    
    private var bottomNavigation: some View {
        HStack(spacing: 0) {
            ForEach(NavigationTab.allCases, id: \.self) { tab in
                Button(action: {
                    withAnimation {
                        activeTab = tab
                    }
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 24))
                        Text(tab.label)
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(activeTab == tab ? .green : .gray)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(activeTab == tab ? Color.green.opacity(0.1) : Color.clear)
                    .cornerRadius(12)
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(
            Color(UIColor.systemBackground)
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: -5)
        )
    }
}

#Preview {
    MainView()
}

