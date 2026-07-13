//
//  Trip.swift
//  GearPro2
//
//  Created on 10/21/2025.
//

import Foundation

struct Trip: Identifiable, Codable {
    let id: Int
    var name: String
    var date: Date
    var endDate: Date
    var status: TripStatus
    var location: String
    var bagAssignments: [String: [Int]] // bagId: [gearIds]
    var dateArchived: Date?
    
    init(id: Int, name: String, date: Date, endDate: Date, status: TripStatus, location: String, bagAssignments: [String: [Int]], dateArchived: Date? = nil) {
        self.id = id
        self.name = name
        self.date = date
        self.endDate = endDate
        self.status = status
        self.location = location
        self.bagAssignments = bagAssignments
        self.dateArchived = dateArchived
    }
}

enum TripStatus: String, Codable {
    case upcoming
    case active
    case completed
    case archived
}

