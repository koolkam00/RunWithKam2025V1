import Foundation

// MARK: - API Response Models
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T
    let count: Int
    let message: String?
}

// MARK: - API Service for RunWithKam
class APIService: ObservableObject {
    static let shared = APIService()
    private let baseURL = "http://localhost:3000/api"
    
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private init() {}
    
    // MARK: - Fetch all runs
    func fetchRuns() async throws -> [ScheduledRun] {
        guard let url = URL(string: "\(baseURL)/runs") else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        let apiResponse = try decoder.decode(APIResponse<[ScheduledRun]>.self, from: data)
        return apiResponse.data
    }
    
    // MARK: - Create new run
    func createRun(_ run: ScheduledRun) async throws -> ScheduledRun {
        guard let url = URL(string: "\(baseURL)/runs") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(run)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 201 else {
            throw APIError.serverError
        }
        
        let apiResponse = try JSONDecoder().decode(APIResponse<ScheduledRun>.self, from: data)
        return apiResponse.data
    }
    
    // MARK: - Update existing run
    func updateRun(_ run: ScheduledRun) async throws -> ScheduledRun {
        guard let url = URL(string: "\(baseURL)/runs/\(run.id)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(run)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError
        }
        
        let apiResponse = try JSONDecoder().decode(APIResponse<ScheduledRun>.self, from: data)
        return apiResponse.data
    }
    
    // MARK: - Delete run
    func deleteRun(id: UUID) async throws -> Bool {
        guard let url = URL(string: "\(baseURL)/runs/\(id)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError
        }
        
        return true
    }
    
    // MARK: - Start real-time updates
    func startRealTimeUpdates() {
        // Poll for updates every 10 seconds
        Timer.scheduledTimer(withTimeInterval: 10.0, repeats: true) { _ in
            Task {
                await self.checkForUpdates()
            }
        }
    }
    
    // MARK: - Check for updates
    private func checkForUpdates() async {
        do {
            let newRuns = try await fetchRuns()
            // Notify observers of new data
            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: .runsUpdated,
                    object: newRuns
                )
            }
        } catch {
            print("Failed to check for updates: \(error)")
        }
    }
}

// MARK: - API Errors
enum APIError: Error, LocalizedError {
    case invalidURL
    case serverError
    case decodingError
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .serverError:
            return "Server error occurred"
        case .decodingError:
            return "Failed to decode response"
        case .networkError:
            return "Network error occurred"
        }
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let runsUpdated = Notification.Name("runsUpdated")
}
