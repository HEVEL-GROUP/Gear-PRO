//
//  Bag.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import Foundation
import SwiftUI

struct Bag: Identifiable, Codable {
    let id: String
    var name: String
    var color: BagColor
    var maxWeight: Double
    
    init(id: String, name: String, color: BagColor, maxWeight: Double = 35.0) {
        self.id = id
        self.name = name
        self.color = color
        self.maxWeight = maxWeight
    }
}

enum BagColor: String, Codable, CaseIterable {
    case blue, pink, green, orange, purple, gray
    
    var gradient: [Color] {
        switch self {
        case .blue: return [.blue, Color(red: 0.2, green: 0.4, blue: 0.8)]
        case .pink: return [.pink, Color(red: 0.9, green: 0.4, blue: 0.6)]
        case .green: return [.green, Color(red: 0.2, green: 0.7, blue: 0.4)]
        case .orange: return [.orange, Color(red: 0.9, green: 0.5, blue: 0.2)]
        case .purple: return [.purple, Color(red: 0.6, green: 0.3, blue: 0.8)]
        case .gray: return [.gray, Color(red: 0.5, green: 0.5, blue: 0.5)]
        }
    }
    
    var background: Color {
        switch self {
        case .blue: return Color.blue.opacity(0.1)
        case .pink: return Color.pink.opacity(0.1)
        case .green: return Color.green.opacity(0.1)
        case .orange: return Color.orange.opacity(0.1)
        case .purple: return Color.purple.opacity(0.1)
        case .gray: return Color.gray.opacity(0.1)
        }
    }
    
    var textColor: Color {
        switch self {
        case .blue: return .blue
        case .pink: return .pink
        case .green: return .green
        case .orange: return .orange
        case .purple: return .purple
        case .gray: return .gray
        }
    }
}

