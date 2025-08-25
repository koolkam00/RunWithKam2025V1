import Foundation

// MARK: - Leaderboard User Model
struct LeaderboardUser: Codable, Identifiable {
    let id: String
    let firstName: String
    let lastName: String
    let totalRuns: Int
    let totalMiles: Double
    let rank: Int?
    let lastUpdated: Date
    
    var fullName: String {
        "\(firstName) \(lastName)"
    }
    
    var displayMiles: String {
        String(format: "%.1f", totalMiles)
    }
    
    var displayRuns: String {
        "\(totalRuns) runs"
    }
}

// MARK: - Leaderboard Response Model
struct LeaderboardResponse: Codable {
    let success: Bool
    let data: [LeaderboardUser]
    let message: String?
    let timestamp: String?
    let version: String?
}

// MARK: - Update User Stats Request
struct UpdateUserStatsRequest: Codable {
    let userId: String
    let totalRuns: Int
    let totalMiles: Double
}

// MARK: - Update User Stats Response
struct UpdateUserStatsResponse: Codable {
    let success: Bool
    let data: LeaderboardUser?
    let message: String?
    let timestamp: String?
    let version: String?
}
