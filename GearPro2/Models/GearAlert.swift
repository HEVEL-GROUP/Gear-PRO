//
//  GearAlert.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import Foundation

struct GearAlert: Identifiable {
    let id: String
    let gearId: Int
    let gearName: String
    let type: AlertType
    let message: String
    let priority: AlertPriority
}

enum AlertType: String {
    case low
    case expired
    case expiring
    case check
}

enum AlertPriority: String, Comparable {
    case high
    case medium
    case low
    
    static func < (lhs: AlertPriority, rhs: AlertPriority) -> Bool {
        let order: [AlertPriority] = [.high, .medium, .low]
        guard let lhsIndex = order.firstIndex(of: lhs),
              let rhsIndex = order.firstIndex(of: rhs) else {
            return false
        }
        return lhsIndex < rhsIndex
    }
}

