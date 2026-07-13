//
//  GearItem.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import Foundation

struct GearItem: Identifiable, Codable {
    let id: Int
    var name: String
    var category: String
    var weight: Double
    var brand: String
    var condition: String
    var isBaseCamp: Bool
    var quantity: Int
    var isConsumable: Bool?
    var stockLevel: Int?
    var expirationDate: Date?
    var notes: String?
    
    init(id: Int, name: String, category: String, weight: Double, brand: String, condition: String = "good", isBaseCamp: Bool = false, quantity: Int = 1, isConsumable: Bool? = nil, stockLevel: Int? = nil, expirationDate: Date? = nil, notes: String? = nil) {
        self.id = id
        self.name = name
        self.category = category
        self.weight = weight
        self.brand = brand
        self.condition = condition
        self.isBaseCamp = isBaseCamp
        self.quantity = quantity
        self.isConsumable = isConsumable
        self.stockLevel = stockLevel
        self.expirationDate = expirationDate
        self.notes = notes
    }
}

