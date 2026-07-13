//
//  GearTrackerViewModel.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import Foundation
import SwiftUI
import Combine

// MARK: - Storage Manager
class StorageManager {
    static let shared = StorageManager()
    
    private var storageMode: String {
        UserDefaults.standard.string(forKey: "storageMode") ?? "Cloud"
    }
    
    private init() {
        // Listen for storage mode changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(storageModeChanged),
            name: NSNotification.Name("StorageModeChanged"),
            object: nil
        )
        
        // Listen for iCloud changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(iCloudDataChanged),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: NSUbiquitousKeyValueStore.default
        )
        
        print("📦 StorageManager initialized - Mode: \(storageMode)")
    }
    
    @objc private func storageModeChanged() {
        print("📦 Storage mode changed to: \(storageMode)")
        // Sync data when storage mode changes
        if storageMode == "Cloud" {
            syncToCloud()
        }
    }
    
    @objc private func iCloudDataChanged(notification: Notification) {
        print("☁️ iCloud data changed externally!")
        if let userInfo = notification.userInfo {
            if let reason = userInfo[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int {
                let reasonString = reason == NSUbiquitousKeyValueStoreServerChange ? "Server Change" : 
                                 reason == NSUbiquitousKeyValueStoreInitialSyncChange ? "Initial Sync" : 
                                 reason == NSUbiquitousKeyValueStoreQuotaViolationChange ? "Quota Violation" : 
                                 reason == NSUbiquitousKeyValueStoreAccountChange ? "Account Change" : "Unknown"
                print("☁️ Change reason: \(reasonString)")
            }
            
            if let changedKeys = userInfo[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] {
                print("☁️ Changed keys: \(changedKeys)")
                // Notify the app to reload data
                NotificationCenter.default.post(name: NSNotification.Name("ReloadDataFromCloud"), object: nil)
            }
        }
    }
    
    func saveData(_ data: Data, forKey key: String) {
        let timestamp = Date().timeIntervalSince1970
        print("💾 Saving \(key) - Size: \(data.count) bytes - Mode: \(storageMode)")
        
        if storageMode == "Cloud" {
            // Save to both local and iCloud
            UserDefaults.standard.set(data, forKey: key)
            UserDefaults.standard.set(timestamp, forKey: "\(key)_timestamp")
            
            NSUbiquitousKeyValueStore.default.set(data, forKey: key)
            NSUbiquitousKeyValueStore.default.set(timestamp, forKey: "\(key)_timestamp")
            
            let synced = NSUbiquitousKeyValueStore.default.synchronize()
            print("☁️ iCloud sync \(synced ? "✅ SUCCESS" : "❌ FAILED") for \(key)")
        } else {
            // Save only locally
            UserDefaults.standard.set(data, forKey: key)
            UserDefaults.standard.set(timestamp, forKey: "\(key)_timestamp")
            print("📱 Saved locally only for \(key)")
        }
    }
    
    func loadData(forKey key: String) -> Data? {
        print("📖 Loading \(key) - Mode: \(storageMode)")
        
        if storageMode == "Cloud" {
            // Check timestamps to get the most recent data
            let localTimestamp = UserDefaults.standard.double(forKey: "\(key)_timestamp")
            let cloudTimestamp = NSUbiquitousKeyValueStore.default.double(forKey: "\(key)_timestamp")
            
            print("📊 Timestamps - Local: \(localTimestamp), Cloud: \(cloudTimestamp)")
            
            // Use the most recent data
            if cloudTimestamp > localTimestamp {
                if let cloudData = NSUbiquitousKeyValueStore.default.data(forKey: key) {
                    print("☁️ Using cloud data (newer) for \(key)")
                    // Update local cache
                    UserDefaults.standard.set(cloudData, forKey: key)
                    UserDefaults.standard.set(cloudTimestamp, forKey: "\(key)_timestamp")
                    return cloudData
                }
            }
            
            // Fall back to local or use local if it's newer
            if let localData = UserDefaults.standard.data(forKey: key) {
                print("📱 Using local data for \(key)")
                return localData
            }
        } else {
            // Load only from local
            if let localData = UserDefaults.standard.data(forKey: key) {
                print("📱 Loaded from local storage for \(key)")
                return localData
            }
        }
        
        print("⚠️ No data found for \(key)")
        return nil
    }
    
    func saveString(_ value: String, forKey key: String) {
        if storageMode == "Cloud" {
            UserDefaults.standard.set(value, forKey: key)
            NSUbiquitousKeyValueStore.default.set(value, forKey: key)
            NSUbiquitousKeyValueStore.default.synchronize()
        } else {
            UserDefaults.standard.set(value, forKey: key)
        }
    }
    
    func loadString(forKey key: String) -> String? {
        if storageMode == "Cloud" {
            if let cloudValue = NSUbiquitousKeyValueStore.default.string(forKey: key) {
                return cloudValue
            }
        }
        return UserDefaults.standard.string(forKey: key)
    }
    
    func saveArray(_ array: [String], forKey key: String) {
        if storageMode == "Cloud" {
            UserDefaults.standard.set(array, forKey: key)
            NSUbiquitousKeyValueStore.default.set(array as NSArray, forKey: key)
            NSUbiquitousKeyValueStore.default.synchronize()
        } else {
            UserDefaults.standard.set(array, forKey: key)
        }
    }
    
    func loadArray(forKey key: String) -> [String]? {
        if storageMode == "Cloud" {
            if let cloudArray = NSUbiquitousKeyValueStore.default.array(forKey: key) as? [String] {
                return cloudArray
            }
        }
        return UserDefaults.standard.array(forKey: key) as? [String]
    }
    
    func removeData(forKey key: String) {
        UserDefaults.standard.removeObject(forKey: key)
        UserDefaults.standard.removeObject(forKey: "\(key)_timestamp")
        if storageMode == "Cloud" {
            NSUbiquitousKeyValueStore.default.removeObject(forKey: key)
            NSUbiquitousKeyValueStore.default.removeObject(forKey: "\(key)_timestamp")
            NSUbiquitousKeyValueStore.default.synchronize()
        }
    }
    
    private func syncToCloud() {
        print("🔄 Syncing all data to iCloud...")
        // Sync all local data to iCloud
        let keys = ["GearLibrary", "Trips", "Bags", "MealPlans", "MealLibrary", "Categories"]
        let timestamp = Date().timeIntervalSince1970
        
        for key in keys {
            if let data = UserDefaults.standard.data(forKey: key) {
                NSUbiquitousKeyValueStore.default.set(data, forKey: key)
                NSUbiquitousKeyValueStore.default.set(timestamp, forKey: "\(key)_timestamp")
                print("☁️ Synced \(key) to iCloud")
            }
        }
        
        let synced = NSUbiquitousKeyValueStore.default.synchronize()
        print("🔄 Sync to iCloud \(synced ? "✅ COMPLETED" : "❌ FAILED")")
    }
    
    func getStorageInfo() -> String {
        var info = "📦 Storage Info:\n"
        info += "Mode: \(storageMode)\n"
        
        let keys = ["GearLibrary", "Trips", "Bags", "MealPlans", "MealLibrary"]
        for key in keys {
            let localSize = UserDefaults.standard.data(forKey: key)?.count ?? 0
            let cloudSize = NSUbiquitousKeyValueStore.default.data(forKey: key)?.count ?? 0
            let localTime = UserDefaults.standard.double(forKey: "\(key)_timestamp")
            let cloudTime = NSUbiquitousKeyValueStore.default.double(forKey: "\(key)_timestamp")
            
            info += "\n\(key):"
            info += "\n  Local: \(localSize) bytes (updated: \(Date(timeIntervalSince1970: localTime)))"
            info += "\n  Cloud: \(cloudSize) bytes (updated: \(Date(timeIntervalSince1970: cloudTime)))"
        }
        
        return info
    }
}

class GearTrackerViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var gearLibrary: [GearItem] = []
    @Published var trips: [Trip] = []
    @Published var bags: [Bag] = []
    @Published var categories: [String] = []
    @Published var alerts: [GearAlert] = []
    @Published var missingGear: [MissingGearItem] = []
    @Published var mealPlans: [MealPlan] = []
    @Published var mealLibrary: [MealItem] = []
    
    // MARK: - Services
    private let notificationService = NotificationService.shared
    private let storageManager = StorageManager.shared
    
    // MARK: - Initialization
    init() {
        loadData()
        generateAlerts()
        scheduleTripNotifications()
        
        // Listen for notification reschedule requests
        NotificationCenter.default.addObserver(
            forName: .rescheduleTripNotifications,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.scheduleTripNotifications()
        }
        
        // Listen for cloud data changes
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("ReloadDataFromCloud"),
            object: nil,
            queue: .main
        ) { [weak self] _ in
            print("🔄 Reloading data from cloud...")
            self?.loadData()
            self?.generateAlerts()
        }
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - Data Persistence
    private func loadData() {
        loadGearLibrary()
        loadTrips()
        loadBags()
        loadMealPlans()
        loadMealLibrary()
        loadCategories()
        
        // If no data exists, load sample data
        if gearLibrary.isEmpty {
            print("No gear found, loading sample data...")
            loadSampleData()
        } else {
            print("Found \(gearLibrary.count) gear items in library")
        }
    }
    
    private func loadGearLibrary() {
        print("Attempting to load gear library from storage...")
        if let data = storageManager.loadData(forKey: "GearLibrary"),
           let gear = try? JSONDecoder().decode([GearItem].self, from: data) {
            gearLibrary = gear
            print("Successfully loaded \(gear.count) gear items")
        } else {
            print("No gear data found in storage or failed to decode")
        }
    }
    
    private func loadTrips() {
        if let data = storageManager.loadData(forKey: "Trips"),
           let tripsData = try? JSONDecoder().decode([Trip].self, from: data) {
            trips = tripsData
        }
    }
    
    private func loadBags() {
        if let data = storageManager.loadData(forKey: "Bags"),
           let bagsData = try? JSONDecoder().decode([Bag].self, from: data) {
            bags = bagsData
        }
    }
    
    private func loadMealPlans() {
        if let data = storageManager.loadData(forKey: "MealPlans"),
           let mealPlansData = try? JSONDecoder().decode([MealPlan].self, from: data) {
            mealPlans = mealPlansData
        }
    }
    
    private func loadMealLibrary() {
        if let data = storageManager.loadData(forKey: "MealLibrary"),
           let mealLibraryData = try? JSONDecoder().decode([MealItem].self, from: data) {
            mealLibrary = mealLibraryData
        }
    }
    
    private func loadCategories() {
        if let categoriesData = storageManager.loadArray(forKey: "Categories") {
            categories = categoriesData
        }
    }
    
    private func saveGearLibrary() {
        if let data = try? JSONEncoder().encode(gearLibrary) {
            storageManager.saveData(data, forKey: "GearLibrary")
        }
    }
    
    private func saveTrips() {
        if let data = try? JSONEncoder().encode(trips) {
            storageManager.saveData(data, forKey: "Trips")
        }
    }
    
    private func saveBags() {
        if let data = try? JSONEncoder().encode(bags) {
            storageManager.saveData(data, forKey: "Bags")
        }
    }
    
    private func saveMealPlans() {
        if let data = try? JSONEncoder().encode(mealPlans) {
            storageManager.saveData(data, forKey: "MealPlans")
        }
    }
    
    private func saveMealLibrary() {
        if let data = try? JSONEncoder().encode(mealLibrary) {
            storageManager.saveData(data, forKey: "MealLibrary")
        }
    }
    
    private func saveCategories() {
        storageManager.saveArray(categories, forKey: "Categories")
    }
    
    // MARK: - Sample Data
    private func loadSampleData() {
        // Default categories
        categories = ["Shelter", "Sleep", "Pack", "Cooking", "Water", "Clothing", "Navigation", "First Aid", "Tools", "Electronics", "Hunting"]
        
        // Sample gear
        gearLibrary = [
            GearItem(id: 1, name: "Hubba Hubba NX 2P", category: "Shelter", weight: 3.5, brand: "MSR", isBaseCamp: true),
            GearItem(id: 2, name: "Magma 15°F Sleeping Bag", category: "Sleep", weight: 2.8, brand: "REI Co-op", quantity: 2),
            GearItem(id: 3, name: "Atmos AG 65L", category: "Pack", weight: 4.5, brand: "Osprey"),
            GearItem(id: 4, name: "PocketRocket 2", category: "Cooking", weight: 0.16, brand: "MSR"),
            GearItem(id: 5, name: "Squeeze Water Filter", category: "Water", weight: 0.22, brand: "Sawyer", expirationDate: Calendar.current.date(byAdding: .day, value: 145, to: Date())!, notes: "Replace filter annually"),
            GearItem(id: 6, name: "NeoAir XLite", category: "Sleep", weight: 0.75, brand: "Therm-a-Rest", quantity: 2),
            GearItem(id: 7, name: "Beta LT Jacket", category: "Clothing", weight: 0.78, brand: "Arc'teryx"),
            GearItem(id: 8, name: "Fuel Canister", category: "Cooking", weight: 0.25, brand: "MSR", quantity: 3, isConsumable: true, stockLevel: 30, notes: "Reorder at 25%"),
            GearItem(id: 9, name: "First Aid Kit", category: "First Aid", weight: 0.5, brand: "Adventure Medical", expirationDate: Calendar.current.date(byAdding: .day, value: 70, to: Date())!, notes: "Check medications annually")
        ]
        
        // Sample bags
        bags = [
            Bag(id: "bag-1", name: "My Pack", color: .blue, maxWeight: 45),
            Bag(id: "bag-2", name: "Wife's Pack", color: .pink, maxWeight: 30)
        ]
        
        // Sample meal library
        mealLibrary = [
            MealItem(id: 1001, name: "Instant Oatmeal", category: .breakfast, calories: 150, weight: 0.1, brand: "Quaker", servingSize: "1 packet", protein: 5, carbs: 27, fat: 3, fiber: 4, sodium: 200, cookingMethod: .boil, expirationDate: Calendar.current.date(byAdding: .day, value: 365, to: Date())!),
            MealItem(id: 1002, name: "Freeze Dried Eggs", category: .breakfast, calories: 200, weight: 0.15, brand: "Mountain House", servingSize: "1 pouch", protein: 15, carbs: 8, fat: 12, fiber: 1, sodium: 400, cookingMethod: .boil, expirationDate: Calendar.current.date(byAdding: .day, value: 730, to: Date())!),
            MealItem(id: 1003, name: "Trail Mix", category: .snack, calories: 300, weight: 0.2, brand: "Kirkland", servingSize: "1/4 cup", protein: 8, carbs: 25, fat: 20, fiber: 4, sodium: 50, cookingMethod: .noCook, expirationDate: Calendar.current.date(byAdding: .day, value: 180, to: Date())!),
            MealItem(id: 1004, name: "Beef Jerky", category: .snack, calories: 80, weight: 0.05, brand: "Jack Links", servingSize: "1 oz", protein: 12, carbs: 3, fat: 1, fiber: 0, sodium: 500, cookingMethod: .noCook, expirationDate: Calendar.current.date(byAdding: .day, value: 90, to: Date())!),
            MealItem(id: 1005, name: "Freeze Dried Chili", category: .dinner, calories: 400, weight: 0.25, brand: "Backpacker's Pantry", servingSize: "1 pouch", protein: 20, carbs: 35, fat: 15, fiber: 8, sodium: 800, cookingMethod: .boil, expirationDate: Calendar.current.date(byAdding: .day, value: 1095, to: Date())!),
            MealItem(id: 1006, name: "Instant Rice", category: .dinner, calories: 200, weight: 0.12, brand: "Minute Rice", servingSize: "1/2 cup", protein: 4, carbs: 44, fat: 0, fiber: 1, sodium: 0, cookingMethod: .boil, expirationDate: Calendar.current.date(byAdding: .day, value: 730, to: Date())!),
            MealItem(id: 1007, name: "Energy Bars", category: .snack, calories: 250, weight: 0.08, brand: "Clif Bar", servingSize: "1 bar", protein: 10, carbs: 40, fat: 6, fiber: 5, sodium: 200, cookingMethod: .noCook, expirationDate: Calendar.current.date(byAdding: .day, value: 120, to: Date())!),
            MealItem(id: 1008, name: "Instant Coffee", category: .beverage, calories: 5, weight: 0.02, brand: "Folgers", servingSize: "1 tsp", protein: 0, carbs: 1, fat: 0, fiber: 0, sodium: 5, cookingMethod: .boil, expirationDate: Calendar.current.date(byAdding: .day, value: 365, to: Date())!),
            MealItem(id: 1009, name: "Dehydrated Vegetables", category: .dinner, calories: 50, weight: 0.05, brand: "Harmony House", servingSize: "1/4 cup", protein: 3, carbs: 10, fat: 0, fiber: 4, sodium: 10, cookingMethod: .boil, expirationDate: Calendar.current.date(byAdding: .day, value: 1095, to: Date())!),
            MealItem(id: 1010, name: "Peanut Butter", category: .snack, calories: 200, weight: 0.1, brand: "Jif", servingSize: "2 tbsp", protein: 8, carbs: 6, fat: 16, fiber: 2, sodium: 150, cookingMethod: .noCook, expirationDate: Calendar.current.date(byAdding: .day, value: 180, to: Date())!)
        ]
        
        // Sample trips
        let calendar = Calendar.current
        trips = [
            Trip(
                id: 1,
                name: "Elk Hunt - Colorado",
                date: calendar.date(byAdding: .day, value: 15, to: Date())!,
                endDate: calendar.date(byAdding: .day, value: 22, to: Date())!,
                status: .upcoming,
                location: "San Juan Mountains",
                bagAssignments: [
                    "bag-1": [2, 3, 4],
                    "bag-2": [5]
                ]
            ),
            Trip(
                id: 2,
                name: "Weekend Backpacking",
                date: calendar.date(byAdding: .day, value: -6, to: Date())!,
                endDate: calendar.date(byAdding: .day, value: -4, to: Date())!,
                status: .active,
                location: "Big Bend National Park",
                bagAssignments: [
                    "bag-1": [4],
                    "bag-2": [5]
                ]
            )
        ]
        
        // Sample meal plans
        mealPlans = [
            createSampleMealPlan(for: trips[0]),
            createSampleMealPlan(for: trips[1])
        ]
        
        // Save all sample data
        saveGearLibrary()
        saveTrips()
        saveBags()
        saveMealLibrary()
        saveMealPlans()
        saveCategories()
    }
    
    // MARK: - Notification Management
    private func scheduleTripNotifications() {
        let upcomingTrips = trips.filter { $0.status == .upcoming && $0.date > Date() }
        notificationService.scheduleNotificationsForTrips(upcomingTrips)
    }
    
    func rescheduleTripNotifications() {
        scheduleTripNotifications()
    }
    
    func updateTripStatus(tripId: Int, newStatus: TripStatus) {
        if let index = trips.firstIndex(where: { $0.id == tripId }) {
            let trip = trips[index]
            
            // Handle notifications based on status change
            switch newStatus {
            case .upcoming:
                // Schedule notification for upcoming trip
                notificationService.scheduleNotificationForTrip(trip)
            case .active, .completed, .archived:
                // Cancel notification for non-upcoming trips
                notificationService.cancelNotificationForTrip(trip)
            }
            
            // Update trip status
            trips[index].status = newStatus
            saveTrips()
        }
    }
    
    // MARK: - Alert Generation
    func generateAlerts() {
        var newAlerts: [GearAlert] = []
        let today = Date()
        
        for gear in gearLibrary {
            // Check stock level for consumables
            if let isConsumable = gear.isConsumable, isConsumable,
               let stockLevel = gear.stockLevel, stockLevel < 25 {
                newAlerts.append(GearAlert(
                    id: "stock-\(gear.id)",
                    gearId: gear.id,
                    gearName: "\(gear.brand) \(gear.name)",
                    type: .low,
                    message: "Stock at \(stockLevel)% - reorder soon",
                    priority: stockLevel < 10 ? .high : .medium
                ))
            }
            
            // Check expiration dates
            if let expirationDate = gear.expirationDate {
                let daysUntilExp = Calendar.current.dateComponents([.day], from: today, to: expirationDate).day ?? 0
                
                if daysUntilExp < 0 {
                    newAlerts.append(GearAlert(
                        id: "exp-\(gear.id)",
                        gearId: gear.id,
                        gearName: "\(gear.brand) \(gear.name)",
                        type: .expired,
                        message: "Expired \(abs(daysUntilExp)) days ago",
                        priority: .high
                    ))
                } else if daysUntilExp <= 30 {
                    newAlerts.append(GearAlert(
                        id: "exp-\(gear.id)",
                        gearId: gear.id,
                        gearName: "\(gear.brand) \(gear.name)",
                        type: .expiring,
                        message: "Expires in \(daysUntilExp) days",
                        priority: daysUntilExp <= 7 ? .high : .medium
                    ))
                } else if daysUntilExp <= 90 {
                    newAlerts.append(GearAlert(
                        id: "exp-\(gear.id)",
                        gearId: gear.id,
                        gearName: "\(gear.brand) \(gear.name)",
                        type: .check,
                        message: "Check expiration date soon",
                        priority: .low
                    ))
                }
            }
        }
        
        alerts = newAlerts.sorted { $0.priority < $1.priority }
    }
    
    // MARK: - Computed Properties
    func getCurrentTrip(tripId: Int) -> Trip? {
        return trips.first(where: { $0.id == tripId })
    }
    
    // MARK: - Helper Functions
    func getGearUsageCount(gearId: Int, excludeTripId: Int? = nil) -> Int {
        // Only count usage within the current trip being packed
        // Each trip operates independently - gear packed in other trips doesn't affect availability
        guard let tripId = excludeTripId,
              let trip = trips.first(where: { $0.id == tripId }) else {
            return 0
        }
        
        return trip.bagAssignments.values.reduce(0) { count, gearIds in
            count + gearIds.filter { $0 == gearId }.count
        }
    }
    
    func calculateBagWeight(tripId: Int, bagId: String) -> Double {
        guard let trip = trips.first(where: { $0.id == tripId }),
              let gearIds = trip.bagAssignments[bagId] else {
            return 0
        }
        return gearIds.reduce(0.0) { sum, gearId in
            if let gear = gearLibrary.first(where: { $0.id == gearId }) {
                return sum + gear.weight
            }
            return sum
        }
    }
    
    func calculateTripWeight(tripId: Int) -> Double {
        guard let trip = trips.first(where: { $0.id == tripId }) else {
            return 0
        }
        return trip.bagAssignments.keys.reduce(0.0) { sum, bagId in
            sum + calculateBagWeight(tripId: tripId, bagId: bagId)
        }
    }
    
    func calculateBaseCampWeight(tripId: Int) -> Double {
        guard let trip = trips.first(where: { $0.id == tripId }) else {
            return 0
        }
        return trip.bagAssignments.keys.reduce(0.0) { sum, bagId in
            let bagGear = trip.bagAssignments[bagId]?.compactMap { id in
                gearLibrary.first(where: { $0.id == id })
            } ?? []
            let baseCampWeight = bagGear.filter { $0.isBaseCamp }.reduce(0.0) { $0 + $1.weight }
            return sum + baseCampWeight
        }
    }
    
    func calculatePackInWeight(tripId: Int) -> Double {
        return calculateTripWeight(tripId: tripId) - calculateBaseCampWeight(tripId: tripId)
    }
    
    func getTripDuration(trip: Trip) -> Int {
        let days = Calendar.current.dateComponents([.day], from: trip.date, to: trip.endDate).day ?? 0
        return days + 1
    }
    
    func getNextTrip() -> Trip? {
        let upcoming = trips.filter { $0.status == .upcoming }
        return upcoming.sorted { $0.date < $1.date }.first
    }
    
    func getBagItemCount(tripId: Int, bagId: String) -> Int {
        guard let trip = trips.first(where: { $0.id == tripId }),
              let gearIds = trip.bagAssignments[bagId] else {
            return 0
        }
        return gearIds.count
    }
    
    // MARK: - Actions
    func addGear(_ gear: GearItem) {
        gearLibrary.append(gear)
        saveGearLibrary()
        generateAlerts()
    }
    
    func updateGear(_ gear: GearItem) {
        if let index = gearLibrary.firstIndex(where: { $0.id == gear.id }) {
            gearLibrary[index] = gear
            saveGearLibrary()
            generateAlerts()
        }
    }
    
    func deleteGear(id: Int) {
        // Check if gear is being used
        let inUse = trips.contains { trip in
            trip.bagAssignments.values.contains { $0.contains(id) }
        }
        
        guard !inUse else { return }
        
        gearLibrary.removeAll { $0.id == id }
        saveGearLibrary()
        generateAlerts()
    }
    
    func toggleBaseCamp(gearId: Int) {
        if let index = gearLibrary.firstIndex(where: { $0.id == gearId }) {
            gearLibrary[index].isBaseCamp.toggle()
            saveGearLibrary()
        }
    }
    
    func addTrip(_ trip: Trip) {
        trips.append(trip)
        saveTrips()
        
        // Schedule notification for the new trip
        notificationService.scheduleNotificationForTrip(trip)
    }
    
    func deleteTrip(id: Int) {
        // Cancel notification before deleting trip
        if let trip = trips.first(where: { $0.id == id }) {
            notificationService.cancelNotificationForTrip(trip)
        }
        
        trips.removeAll { $0.id == id }
        saveTrips()
    }
    
    func addBag(_ bag: Bag) {
        print("ViewModel: Adding bag \(bag.name) with ID \(bag.id)")
        bags.append(bag)
        saveBags()
        print("ViewModel: Bag added. Total bags: \(bags.count)")
        
        // Add bag to all existing trips
        for index in trips.indices {
            var updatedTrip = trips[index]
            updatedTrip.bagAssignments[bag.id] = []
            trips[index] = updatedTrip
            print("ViewModel: Added bag to trip \(updatedTrip.name)")
        }
        saveTrips()
    }
    
    func updateBag(_ bag: Bag) {
        if let index = bags.firstIndex(where: { $0.id == bag.id }) {
            bags[index] = bag
            saveBags()
            print("ViewModel: Updated bag \(bag.name) with ID \(bag.id)")
        } else {
            print("ViewModel: Warning - Bag with ID \(bag.id) not found for update")
        }
    }
    
    func deleteBag(id: String) {
        // Check if bag has gear
        let hasGear = trips.contains { trip in
            if let gearIds = trip.bagAssignments[id], !gearIds.isEmpty {
                return true
            }
            return false
        }
        
        guard !hasGear else { return }
        
        bags.removeAll { $0.id == id }
        saveBags()
        
        // Remove bag from all trips
        for index in trips.indices {
            var updatedTrip = trips[index]
            updatedTrip.bagAssignments.removeValue(forKey: id)
            trips[index] = updatedTrip
        }
        saveTrips()
    }
    
    func addGearToTrip(tripId: Int, gearId: Int, bagId: String) {
        guard let gear = gearLibrary.first(where: { $0.id == gearId }) else { return }
        
        // Check quantity - only within the current trip
        // Each trip operates independently, so we only check usage within this trip
        guard let tripIndex = trips.firstIndex(where: { $0.id == tripId }) else { return }
        
        let usedInThisTrip = trips[tripIndex].bagAssignments.values.reduce(0) { count, gearIds in
            count + gearIds.filter { $0 == gearId }.count
        }
        
        // Only check if we have enough quantity available for this trip
        guard usedInThisTrip < gear.quantity else { return }
        
        // Add gear
        var updatedTrip = trips[tripIndex]
        if updatedTrip.bagAssignments[bagId] != nil {
            updatedTrip.bagAssignments[bagId]?.append(gearId)
        } else {
            updatedTrip.bagAssignments[bagId] = [gearId]
        }
        
        // Update the trips array to trigger UI refresh
        trips[tripIndex] = updatedTrip
    }
    
    func removeGearFromBag(tripId: Int, gearId: Int, bagId: String) {
        guard let tripIndex = trips.firstIndex(where: { $0.id == tripId }) else { return }
        
        var updatedTrip = trips[tripIndex]
        updatedTrip.bagAssignments[bagId]?.removeAll { $0 == gearId }
        
        // Update the trips array to trigger UI refresh
        trips[tripIndex] = updatedTrip
    }
    
    func addCategory(_ category: String) {
        guard !category.isEmpty, !categories.contains(category) else { return }
        categories.append(category)
    }
    
    func updateCategory(oldName: String, newName: String) {
        guard !newName.isEmpty, oldName != newName, !categories.contains(newName) else { return }
        
        if let index = categories.firstIndex(of: oldName) {
            categories[index] = newName
        }
        
        // Update all gear with this category
        for index in gearLibrary.indices {
            if gearLibrary[index].category == oldName {
                gearLibrary[index].category = newName
            }
        }
    }
    
    func deleteCategory(_ category: String) {
        categories.removeAll { $0 == category }
        
        // Flag gear as needing category
        for index in gearLibrary.indices {
            if gearLibrary[index].category == category {
                gearLibrary[index].category = "NEEDS_CATEGORY"
            }
        }
        
        if !categories.contains("NEEDS_CATEGORY") {
            categories.append("NEEDS_CATEGORY")
        }
    }
    
    // MARK: - Missing Gear Management
    func reportMissingGear(gearId: Int, tripId: Int, tripName: String, bagName: String) {
        let missingItem = MissingGearItem(
            gearId: gearId,
            tripId: tripId,
            tripName: tripName,
            bagName: bagName
        )
        missingGear.append(missingItem)
        print("Reported missing gear: \(gearId) from trip \(tripName)")
        print("Total missing gear items now: \(missingGear.count)")
        print("Missing gear with status 'reported': \(missingGear.filter { $0.status == .reported }.count)")
    }
    
    func updateMissingGearAction(_ item: MissingGearItem, action: MissingGearAction, notes: String? = nil) {
        if let index = missingGear.firstIndex(where: { $0.id == item.id }) {
            var updatedItem = missingGear[index]
            updatedItem.actionTaken = action
            updatedItem.notes = notes
            
            switch action {
            case .replace:
                updatedItem.status = .replaced
                // No cleanup needed - gear still exists in library
                restoreReplacedGearToFutureTrips(gearId: item.gearId)
            case .remove:
                updatedItem.status = .removed
                // Remove gear from library AND from all future trips
                removeGear(id: item.gearId)
                removeMissingGearFromFutureTrips(gearId: item.gearId)
            case .found:
                updatedItem.status = .found
                // No cleanup needed - gear still exists in library
                restoreReplacedGearToFutureTrips(gearId: item.gearId)
            case .pending:
                updatedItem.status = .reported
                // Remove from future trips since it's missing and not replaced
                removeMissingGearFromFutureTrips(gearId: item.gearId)
            }
            
            missingGear[index] = updatedItem
            print("Updated missing gear action: \(action.rawValue) for gear \(item.gearId)")
        }
    }
    
    func getMissingGearForTrip(_ tripId: Int) -> [MissingGearItem] {
        return missingGear.filter { $0.tripId == tripId }
    }
    
    func getMissingGearCount() -> Int {
        return missingGear.filter { $0.status == .reported }.count
    }
    
    func getGearById(_ id: Int) -> GearItem? {
        return gearLibrary.first { $0.id == id }
    }
    
    func removeGear(id: Int) {
        gearLibrary.removeAll { $0.id == id }
        print("Removed gear with ID: \(id)")
    }
    
    // MARK: - Trip Archiving
    func archiveTrip(id: Int) {
        if let index = trips.firstIndex(where: { $0.id == id }) {
            var updatedTrip = trips[index]
            
            // Cancel notification before archiving
            notificationService.cancelNotificationForTrip(updatedTrip)
            
            updatedTrip.status = .archived
            updatedTrip.dateArchived = Date()
            trips[index] = updatedTrip
            print("Trip '\(updatedTrip.name)' archived")
            
            // Clean up missing gear from future trips when trip is archived
            cleanupMissingGearFromFutureTrips()
        }
    }
    
    func unarchiveTrip(id: Int) {
        if let index = trips.firstIndex(where: { $0.id == id }) {
            var updatedTrip = trips[index]
            updatedTrip.status = .completed
            updatedTrip.dateArchived = nil
            trips[index] = updatedTrip
            print("Trip '\(updatedTrip.name)' unarchived")
            
            // Don't reschedule notification for unarchived trips as they're completed
        }
    }
    
    func copyTrip(id: Int) -> Trip? {
        guard let originalTrip = trips.first(where: { $0.id == id }) else { 
            print("Failed to find trip with ID: \(id)")
            return nil 
        }
        
        print("Copying trip: '\(originalTrip.name)' (ID: \(originalTrip.id), Status: \(originalTrip.status.rawValue))")
        
        let newId = (trips.map { $0.id }.max() ?? 0) + 1
        let newTrip = Trip(
            id: newId,
            name: "\(originalTrip.name) (Copy)",
            date: Date(),
            endDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date(),
            status: .upcoming,
            location: originalTrip.location,
            bagAssignments: originalTrip.bagAssignments,
            dateArchived: nil
        )
        
        trips.append(newTrip)
        
        // Schedule notification for the copied trip
        notificationService.scheduleNotificationForTrip(newTrip)
        
        print("Trip '\(originalTrip.name)' copied as '\(newTrip.name)' (ID: \(newTrip.id))")
        print("Total trips now: \(trips.count)")
        print("Active trips: \(getActiveTrips().count)")
        print("Archived trips: \(getArchivedTrips().count)")
        return newTrip
    }
    
    func getActiveTrips() -> [Trip] {
        return trips.filter { $0.status != .archived }
    }
    
    func getArchivedTrips() -> [Trip] {
        return trips.filter { $0.status == .archived }
    }
    
    // MARK: - Missing Gear Cleanup
    func removeMissingGearFromFutureTrips(gearId: Int) {
        print("Removing missing gear ID \(gearId) from all future trips")
        
        for tripIndex in trips.indices {
            var trip = trips[tripIndex]
            
            // Only process upcoming and active trips (not completed/archived)
            guard trip.status == .upcoming || trip.status == .active else { continue }
            
            var hasChanges = false
            
            // Remove gear from all bags in this trip
            for bagId in trip.bagAssignments.keys {
                if let gearIds = trip.bagAssignments[bagId],
                   gearIds.contains(gearId) {
                    trip.bagAssignments[bagId] = gearIds.filter { $0 != gearId }
                    hasChanges = true
                    print("Removed gear \(gearId) from bag \(bagId) in trip '\(trip.name)'")
                }
            }
            
            if hasChanges {
                trips[tripIndex] = trip
            }
        }
    }
    
    func restoreReplacedGearToFutureTrips(gearId: Int) {
        print("Gear ID \(gearId) was replaced - no action needed for future trips")
        // When gear is replaced, it's automatically available for all trips again
        // No cleanup needed since the gear still exists in the library
    }
    
    // MARK: - Automatic Cleanup
    func cleanupMissingGearFromFutureTrips() {
        print("Performing automatic cleanup of missing gear from future trips")
        
        // Get all missing gear that hasn't been replaced or found
        let unreplacedMissingGear = missingGear.filter { item in
            item.status == .reported && item.actionTaken != .replace && item.actionTaken != .found
        }
        
        for item in unreplacedMissingGear {
            print("Auto-removing unreplaced missing gear ID \(item.gearId) from future trips")
            removeMissingGearFromFutureTrips(gearId: item.gearId)
        }
    }
    
    // MARK: - Meal Planning Functions
    private func createSampleMealPlan(for trip: Trip) -> MealPlan {
        let duration = getTripDuration(trip: trip)
        var days: [MealDay] = []
        
        for dayNum in 1...duration {
            let day = MealDay(
                id: dayNum,
                dayNumber: dayNum,
                breakfast: [mealLibrary[0], mealLibrary[7]], // Oatmeal + Coffee
                lunch: [mealLibrary[2], mealLibrary[4]], // Trail Mix + Jerky
                dinner: [mealLibrary[4], mealLibrary[5]], // Chili + Rice
                snacks: [mealLibrary[6], mealLibrary[9]] // Energy Bar + Peanut Butter
            )
            days.append(day)
        }
        
        let totalCalories = days.reduce(0) { $0 + $1.totalCalories }
        let totalWeight = days.reduce(0) { $0 + $1.totalWeight }
        
        return MealPlan(
            id: trip.id,
            tripId: trip.id,
            days: days,
            totalCalories: totalCalories,
            totalWeight: totalWeight,
            bagAssignments: [:]
        )
    }
    
    func getMealPlan(for tripId: Int) -> MealPlan? {
        return mealPlans.first { $0.tripId == tripId }
    }
    
    func createMealPlan(for trip: Trip) -> MealPlan {
        let duration = getTripDuration(trip: trip)
        var days: [MealDay] = []
        
        for dayNum in 1...duration {
            let day = MealDay(id: dayNum, dayNumber: dayNum)
            days.append(day)
        }
        
        let newMealPlan = MealPlan(
            id: trip.id,
            tripId: trip.id,
            days: days,
            totalCalories: 0,
            totalWeight: 0.0,
            bagAssignments: [:]
        )
        
        mealPlans.append(newMealPlan)
        return newMealPlan
    }
    
    func addMealItemToPlan(tripId: Int, dayNumber: Int, mealType: MealCategory, mealItem: MealItem) {
        guard let planIndex = mealPlans.firstIndex(where: { $0.tripId == tripId }),
              let dayIndex = mealPlans[planIndex].days.firstIndex(where: { $0.dayNumber == dayNumber }) else {
            return
        }
        
        var updatedPlan = mealPlans[planIndex]
        var updatedDay = updatedPlan.days[dayIndex]
        
        switch mealType {
        case .breakfast:
            updatedDay.breakfast.append(mealItem)
        case .lunch:
            updatedDay.lunch.append(mealItem)
        case .dinner:
            updatedDay.dinner.append(mealItem)
        case .snack:
            updatedDay.snacks.append(mealItem)
        default:
            break
        }
        
        updatedPlan.days[dayIndex] = updatedDay
        updatedPlan.totalCalories = updatedPlan.days.reduce(0) { $0 + $1.totalCalories }
        updatedPlan.totalWeight = updatedPlan.days.reduce(0) { $0 + $1.totalWeight }
        
        mealPlans[planIndex] = updatedPlan
    }
    
    func removeMealItemFromPlan(tripId: Int, dayNumber: Int, mealType: MealCategory, mealItemId: Int) {
        guard let planIndex = mealPlans.firstIndex(where: { $0.tripId == tripId }),
              let dayIndex = mealPlans[planIndex].days.firstIndex(where: { $0.dayNumber == dayNumber }) else {
            return
        }
        
        var updatedPlan = mealPlans[planIndex]
        var updatedDay = updatedPlan.days[dayIndex]
        
        switch mealType {
        case .breakfast:
            updatedDay.breakfast.removeAll { $0.id == mealItemId }
        case .lunch:
            updatedDay.lunch.removeAll { $0.id == mealItemId }
        case .dinner:
            updatedDay.dinner.removeAll { $0.id == mealItemId }
        case .snack:
            updatedDay.snacks.removeAll { $0.id == mealItemId }
        default:
            break
        }
        
        updatedPlan.days[dayIndex] = updatedDay
        updatedPlan.totalCalories = updatedPlan.days.reduce(0) { $0 + $1.totalCalories }
        updatedPlan.totalWeight = updatedPlan.days.reduce(0) { $0 + $1.totalWeight }
        
        mealPlans[planIndex] = updatedPlan
    }
    
    func addMealItemToBag(tripId: Int, mealItemId: Int, bagId: String) {
        guard let planIndex = mealPlans.firstIndex(where: { $0.tripId == tripId }) else { return }
        
        var updatedPlan = mealPlans[planIndex]
        if updatedPlan.bagAssignments[bagId] != nil {
            updatedPlan.bagAssignments[bagId]?.append(mealItemId)
        } else {
            updatedPlan.bagAssignments[bagId] = [mealItemId]
        }
        
        mealPlans[planIndex] = updatedPlan
    }
    
    func removeMealItemFromBag(tripId: Int, mealItemId: Int, bagId: String) {
        guard let planIndex = mealPlans.firstIndex(where: { $0.tripId == tripId }) else { return }
        
        var updatedPlan = mealPlans[planIndex]
        updatedPlan.bagAssignments[bagId]?.removeAll { $0 == mealItemId }
        
        mealPlans[planIndex] = updatedPlan
    }
    
    func calculateMealBagWeight(tripId: Int, bagId: String) -> Double {
        guard let plan = mealPlans.first(where: { $0.tripId == tripId }),
              let mealItemIds = plan.bagAssignments[bagId] else {
            return 0
        }
        
        return mealItemIds.reduce(0.0) { sum, mealItemId in
            if let mealItem = mealLibrary.first(where: { $0.id == mealItemId }) {
                return sum + mealItem.weight
            }
            return sum
        }
    }
    
    func addMealItem(_ mealItem: MealItem) {
        mealLibrary.append(mealItem)
        saveMealLibrary()
    }
    
    func updateMealItem(_ mealItem: MealItem) {
        if let index = mealLibrary.firstIndex(where: { $0.id == mealItem.id }) {
            mealLibrary[index] = mealItem
            saveMealLibrary()
        }
    }
    
    func deleteMealItem(id: Int) {
        mealLibrary.removeAll { $0.id == id }
        saveMealLibrary()
    }
    
    func getMealItemById(_ id: Int) -> MealItem? {
        return mealLibrary.first { $0.id == id }
    }
    
    // MARK: - Debug Functions
    func debugGearLibrary() {
        print("=== GEAR LIBRARY DEBUG ===")
        print("Gear Library Count: \(gearLibrary.count)")
        print("Categories Count: \(categories.count)")
        print("Categories: \(categories)")
        
        for gear in gearLibrary {
            print("- \(gear.brand) \(gear.name) (\(gear.category))")
        }
        
        // Check UserDefaults
        if let data = UserDefaults.standard.data(forKey: "GearLibrary") {
            print("UserDefaults has gear data: \(data.count) bytes")
        } else {
            print("No gear data in UserDefaults")
        }
        print("=========================")
    }
    
    func forceLoadSampleData() {
        loadSampleData()
        print("Sample data loaded - Gear count: \(gearLibrary.count)")
    }
    
    func clearAllData() {
        print("Clearing all data...")
        gearLibrary = []
        trips = []
        bags = []
        mealPlans = []
        mealLibrary = []
        categories = []
        
        // Clear UserDefaults
        UserDefaults.standard.removeObject(forKey: "GearLibrary")
        UserDefaults.standard.removeObject(forKey: "Trips")
        UserDefaults.standard.removeObject(forKey: "Bags")
        UserDefaults.standard.removeObject(forKey: "MealPlans")
        UserDefaults.standard.removeObject(forKey: "MealLibrary")
        UserDefaults.standard.removeObject(forKey: "Categories")
        
        print("All data cleared")
    }
}

// MARK: - Missing Gear Models
struct MissingGearItem: Identifiable, Codable {
    let id: UUID
    let gearId: Int
    let tripId: Int
    let tripName: String
    let bagName: String
    let dateReported: Date
    var status: MissingGearStatus
    var actionTaken: MissingGearAction?
    var notes: String?
    
    init(gearId: Int, tripId: Int, tripName: String, bagName: String) {
        self.id = UUID()
        self.gearId = gearId
        self.tripId = tripId
        self.tripName = tripName
        self.bagName = bagName
        self.dateReported = Date()
        self.status = .reported
        self.actionTaken = nil
        self.notes = nil
    }
}

enum MissingGearStatus: String, CaseIterable, Codable {
    case reported = "Reported"
    case replaced = "Replaced"
    case removed = "Removed"
    case found = "Found"
}

enum MissingGearAction: String, CaseIterable, Codable {
    case replace = "Replace"
    case remove = "Remove"
    case found = "Found"
    case pending = "Pending"
}

// MARK: - NotificationService
import UserNotifications

class NotificationService: ObservableObject {
    static let shared = NotificationService()
    
    @Published var isAuthorized = false
    @Published var notificationDaysAhead: Int = 3
    
    private init() {
        checkAuthorizationStatus()
        loadNotificationSettings()
    }
    
    // MARK: - Authorization
    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .badge, .sound]
            )
            
            await MainActor.run {
                self.isAuthorized = granted
            }
            
            return granted
        } catch {
            print("Error requesting notification permission: \(error)")
            return false
        }
    }
    
    private func checkAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                self.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }
    
    // MARK: - Settings Management
    func updateNotificationDaysAhead(_ days: Int) {
        notificationDaysAhead = days
        saveNotificationSettings()
        
        // Reschedule all notifications with new timing
        Task {
            await rescheduleAllTripNotifications()
        }
    }
    
    private func loadNotificationSettings() {
        notificationDaysAhead = UserDefaults.standard.integer(forKey: "NotificationDaysAhead")
        if notificationDaysAhead == 0 {
            notificationDaysAhead = 3 // Default to 3 days
        }
    }
    
    private func saveNotificationSettings() {
        UserDefaults.standard.set(notificationDaysAhead, forKey: "NotificationDaysAhead")
    }
    
    // MARK: - Trip Notifications
    func scheduleNotificationForTrip(_ trip: Trip) {
        guard isAuthorized else { return }
        
        // Don't schedule notifications for past trips or completed trips
        guard trip.date > Date() && trip.status == .upcoming else { return }
        
        // Calculate notification date
        let notificationDate = Calendar.current.date(
            byAdding: .day,
            value: -notificationDaysAhead,
            to: trip.date
        ) ?? trip.date
        
        // Don't schedule if notification date is in the past
        guard notificationDate > Date() else { return }
        
        // Create notification content
        let content = UNMutableNotificationContent()
        content.title = "Upcoming Trip Reminder"
        content.body = "Your trip '\(trip.name)' to \(trip.location) starts in \(notificationDaysAhead) day\(notificationDaysAhead == 1 ? "" : "s")!"
        content.sound = .default
        content.badge = 1
        
        // Add trip info to userInfo for potential future use
        content.userInfo = [
            "tripId": trip.id,
            "tripName": trip.name,
            "tripDate": trip.date.timeIntervalSince1970
        ]
        
        // Create trigger
        let triggerDate = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: notificationDate
        )
        let trigger = UNCalendarNotificationTrigger(
            dateMatching: triggerDate,
            repeats: false
        )
        
        // Create request
        let request = UNNotificationRequest(
            identifier: "trip-\(trip.id)",
            content: content,
            trigger: trigger
        )
        
        // Schedule notification
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Error scheduling notification for trip \(trip.name): \(error)")
            } else {
                print("Scheduled notification for trip '\(trip.name)' on \(notificationDate)")
            }
        }
    }
    
    func cancelNotificationForTrip(_ trip: Trip) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: ["trip-\(trip.id)"]
        )
        print("Cancelled notification for trip '\(trip.name)'")
    }
    
    func scheduleNotificationsForTrips(_ trips: [Trip]) {
        // Cancel all existing trip notifications first
        cancelAllTripNotifications()
        
        // Schedule new notifications for upcoming trips
        for trip in trips {
            scheduleNotificationForTrip(trip)
        }
    }
    
    func cancelAllTripNotifications() {
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            let tripRequestIds = requests.compactMap { request in
                request.identifier.hasPrefix("trip-") ? request.identifier : nil
            }
            
            UNUserNotificationCenter.current().removePendingNotificationRequests(
                withIdentifiers: tripRequestIds
            )
            
            print("Cancelled \(tripRequestIds.count) trip notifications")
        }
    }
    
    private func rescheduleAllTripNotifications() async {
        // This will be called from the ViewModel when trips are updated
        // The ViewModel will call scheduleNotificationsForTrips with current trips
        await MainActor.run {
            // Post notification to trigger ViewModel rescheduling
            NotificationCenter.default.post(name: .rescheduleTripNotifications, object: nil)
        }
    }
    
    // MARK: - Utility Functions
    func getUpcomingTripsCount() -> Int {
        // This would need to be called from the ViewModel with current trips
        // For now, return 0 - this can be enhanced later
        return 0
    }
    
    // MARK: - Debug Functions
    func getPendingNotifications() async -> [UNNotificationRequest] {
        return await UNUserNotificationCenter.current().pendingNotificationRequests()
    }
    
    func printPendingNotifications() async {
        let requests = await getPendingNotifications()
        print("=== PENDING NOTIFICATIONS ===")
        for request in requests {
            if let trigger = request.trigger as? UNCalendarNotificationTrigger {
                print("ID: \(request.identifier)")
                print("Title: \(request.content.title)")
                print("Body: \(request.content.body)")
                print("Date: \(trigger.dateComponents)")
                print("---")
            }
        }
        print("Total: \(requests.count) notifications")
    }
    
    // MARK: - Notification Categories
    func setupNotificationCategories() {
        let tripReminderCategory = UNNotificationCategory(
            identifier: "TRIP_REMINDER",
            actions: [],
            intentIdentifiers: [],
            options: []
        )
        
        UNUserNotificationCenter.current().setNotificationCategories([tripReminderCategory])
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let rescheduleTripNotifications = Notification.Name("rescheduleTripNotifications")
}

// MARK: - Localization Manager
class LocalizationManager: ObservableObject {
    static let shared = LocalizationManager()
    
    @Published var currentLanguage: String = "en" {
        didSet {
            UserDefaults.standard.set(currentLanguage, forKey: "selectedLanguageCode")
            // Post notification to force UI refresh
            NotificationCenter.default.post(name: NSNotification.Name("LanguageChanged"), object: nil)
        }
    }
    
    private init() {
        // Load saved language or default to English
        if let savedLanguage = UserDefaults.standard.string(forKey: "selectedLanguageCode") {
            currentLanguage = savedLanguage
        } else {
            // Map from display name to language code
            let displayName = UserDefaults.standard.string(forKey: "selectedLanguage") ?? "English"
            currentLanguage = languageCode(for: displayName)
        }
    }
    
    func setLanguage(_ displayName: String) {
        let languageCode = languageCode(for: displayName)
        currentLanguage = languageCode
        UserDefaults.standard.set(displayName, forKey: "selectedLanguage")
    }
    
    func displayName(for languageCode: String) -> String {
        switch languageCode {
        case "en": return "English"
        case "es": return "Spanish"
        case "fr": return "French"
        case "de": return "German"
        case "it": return "Italian"
        case "pt": return "Portuguese"
        case "zh": return "Chinese"
        case "ja": return "Japanese"
        case "ko": return "Korean"
        default: return "English"
        }
    }
    
    private func languageCode(for displayName: String) -> String {
        switch displayName {
        case "English": return "en"
        case "Spanish": return "es"
        case "French": return "fr"
        case "German": return "de"
        case "Italian": return "it"
        case "Portuguese": return "pt"
        case "Chinese": return "zh"
        case "Japanese": return "ja"
        case "Korean": return "ko"
        default: return "en"
        }
    }
    
    func localizedString(_ key: String) -> String {
        guard let path = Bundle.main.path(forResource: currentLanguage, ofType: "lproj"),
              let bundle = Bundle(path: path) else {
            return NSLocalizedString(key, comment: "")
        }
        return bundle.localizedString(forKey: key, value: nil, table: nil)
    }
}

extension String {
    var localized: String {
        return LocalizationManager.shared.localizedString(self)
    }
    
    func localized(with arguments: CVarArg...) -> String {
        return String(format: self.localized, arguments: arguments)
    }
}


