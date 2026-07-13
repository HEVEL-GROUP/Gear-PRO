//
//  MealPlan.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import Foundation

struct MealPlan: Identifiable, Codable {
    let id: Int
    var tripId: Int
    var days: [MealDay]
    var totalCalories: Int
    var totalWeight: Double
    var bagAssignments: [String: [Int]] // bagId: [mealItemIds]
    
    init(id: Int, tripId: Int, days: [MealDay] = [], totalCalories: Int = 0, totalWeight: Double = 0.0, bagAssignments: [String: [Int]] = [:]) {
        self.id = id
        self.tripId = tripId
        self.days = days
        self.totalCalories = totalCalories
        self.totalWeight = totalWeight
        self.bagAssignments = bagAssignments
    }
}

struct MealDay: Identifiable, Codable {
    let id: Int
    var dayNumber: Int
    var breakfast: [MealItem]
    var lunch: [MealItem]
    var dinner: [MealItem]
    var snacks: [MealItem]
    
    init(id: Int, dayNumber: Int, breakfast: [MealItem] = [], lunch: [MealItem] = [], dinner: [MealItem] = [], snacks: [MealItem] = []) {
        self.id = id
        self.dayNumber = dayNumber
        self.breakfast = breakfast
        self.lunch = lunch
        self.dinner = dinner
        self.snacks = snacks
    }
    
    var totalCalories: Int {
        return breakfast.reduce(0) { $0 + $1.calories } +
               lunch.reduce(0) { $0 + $1.calories } +
               dinner.reduce(0) { $0 + $1.calories } +
               snacks.reduce(0) { $0 + $1.calories }
    }
    
    var totalWeight: Double {
        return breakfast.reduce(0) { $0 + $1.weight } +
               lunch.reduce(0) { $0 + $1.weight } +
               dinner.reduce(0) { $0 + $1.weight } +
               snacks.reduce(0) { $0 + $1.weight }
    }
}

struct MealItem: Identifiable, Codable {
    let id: Int
    var name: String
    var category: MealCategory
    var calories: Int
    var weight: Double
    var brand: String?
    var servingSize: String?
    var protein: Double?
    var carbs: Double?
    var fat: Double?
    var fiber: Double?
    var sodium: Double?
    var isPerishable: Bool
    var shelfLife: Int? // days
    var preparationNotes: String?
    var cookingMethod: CookingMethod?
    var isConsumable: Bool
    var stockLevel: Int?
    var expirationDate: Date?
    var notes: String?
    
    init(id: Int, name: String, category: MealCategory, calories: Int, weight: Double, brand: String? = nil, servingSize: String? = nil, protein: Double? = nil, carbs: Double? = nil, fat: Double? = nil, fiber: Double? = nil, sodium: Double? = nil, isPerishable: Bool = false, shelfLife: Int? = nil, preparationNotes: String? = nil, cookingMethod: CookingMethod? = nil, isConsumable: Bool = true, stockLevel: Int? = nil, expirationDate: Date? = nil, notes: String? = nil) {
        self.id = id
        self.name = name
        self.category = category
        self.calories = calories
        self.weight = weight
        self.brand = brand
        self.servingSize = servingSize
        self.protein = protein
        self.carbs = carbs
        self.fat = fat
        self.fiber = fiber
        self.sodium = sodium
        self.isPerishable = isPerishable
        self.shelfLife = shelfLife
        self.preparationNotes = preparationNotes
        self.cookingMethod = cookingMethod
        self.isConsumable = isConsumable
        self.stockLevel = stockLevel
        self.expirationDate = expirationDate
        self.notes = notes
    }
}

enum MealCategory: String, CaseIterable, Codable {
    case breakfast = "Breakfast"
    case lunch = "Lunch"
    case dinner = "Dinner"
    case snack = "Snack"
    case beverage = "Beverage"
    case condiment = "Condiment"
    case cooking = "Cooking Supplies"
    case emergency = "Emergency Food"
    
    var icon: String {
        switch self {
        case .breakfast: return "sunrise.fill"
        case .lunch: return "sun.max.fill"
        case .dinner: return "sunset.fill"
        case .snack: return "heart.fill"
        case .beverage: return "drop.fill"
        case .condiment: return "drop.circle.fill"
        case .cooking: return "flame.fill"
        case .emergency: return "exclamationmark.triangle.fill"
        }
    }
}

enum CookingMethod: String, CaseIterable, Codable {
    case noCook = "No Cook"
    case coldSoak = "Cold Soak"
    case boil = "Boil"
    case simmer = "Simmer"
    case fry = "Fry"
    case bake = "Bake"
    case grill = "Grill"
    case dehydrate = "Dehydrate"
    case freezeDry = "Freeze Dry"
    
    var icon: String {
        switch self {
        case .noCook: return "hand.raised.fill"
        case .coldSoak: return "drop.fill"
        case .boil: return "flame.fill"
        case .simmer: return "flame.circle.fill"
        case .fry: return "frying.pan.fill"
        case .bake: return "oven.fill"
        case .grill: return "grill.fill"
        case .dehydrate: return "sun.max.fill"
        case .freezeDry: return "snowflake.fill"
        }
    }
}
