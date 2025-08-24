import Foundation
import UserNotifications
import UIKit

// MARK: - API Response Models
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T
    let count: Int
    let message: String?
}

// MARK: - API Service for RunWithKam
class APIService: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let shared = APIService()
    private let baseURL = "http://localhost:3000/api"
    
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private override init() {
        super.init()
        // Request notification permissions when service is initialized
        requestNotificationPermissions()
        UNUserNotificationCenter.current().delegate = self
        
        // Listen for app becoming active to clear badges
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }
    
    // MARK: - Fetch all runs
    func fetchRuns() async throws -> [ScheduledRun] {
        guard let url = URL(string: "\(baseURL)/runs") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        
        // Add cache-busting headers to ensure fresh data
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        request.setValue("no-cache", forHTTPHeaderField: "Pragma")
        request.setValue("0", forHTTPHeaderField: "Expires")
        
        // Add timestamp to prevent caching
        let timestamp = Date().timeIntervalSince1970
        request.setValue("\(timestamp)", forHTTPHeaderField: "X-Timestamp")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError
        }
        
        // Add debugging for date parsing
        print("📱 iOS App: Attempting to decode API response...")
        print("📱 iOS App: Raw data length: \(data.count) bytes")
        
        // Try to print the raw JSON for debugging
        if let jsonString = String(data: data, encoding: .utf8) {
            print("📱 iOS App: Raw JSON response: \(jsonString)")
        }
        
        do {
            // Use our custom ScheduledRun decoder instead of the default JSONDecoder
            let apiResponse = try decodeAPIResponse(from: data)
            print("📱 iOS App: Successfully decoded \(apiResponse.data.count) runs")
            
            // Log the first run's date for debugging
            if let firstRun = apiResponse.data.first {
                print("📱 iOS App: First run date: \(firstRun.date)")
                print("📱 iOS App: First run date type: \(type(of: firstRun.date))")
            }
            
            return apiResponse.data
        } catch {
            print("❌ iOS App: Decoding error: \(error)")
            throw error
        }
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
    
    // MARK: - Custom decoder for robust date parsing
    private func decodeAPIResponse(from data: Data) throws -> APIResponse<[ScheduledRun]> {
        // First try to decode the basic structure
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let json = json,
              let success = json["success"] as? Bool,
              let dataArray = json["data"] as? [[String: Any]],
              let message = json["message"] as? String else {
            throw APIError.serverError
        }
        
        // Manually decode each ScheduledRun to use our custom initializer
        var runs: [ScheduledRun] = []
        for (index, runData) in dataArray.enumerated() {
            do {
                let run = try ScheduledRun(from: runData)
                runs.append(run)
            } catch {
                print("❌ iOS App: Failed to decode run at index \(index): \(error)")
                print("❌ iOS App: Run data: \(runData)")
                // Continue with other runs instead of failing completely
            }
        }
        
        return APIResponse(success: success, data: runs, count: runs.count, message: message)
    }
    
    // MARK: - Clear cache and force fresh data
    func clearCacheAndForceRefresh() {
        // Clear any cached data
        URLCache.shared.removeAllCachedResponses()
        
        // Force a fresh fetch
        Task {
            do {
                let freshRuns = try await fetchRuns()
                print("📱 iOS App: Cache cleared, fetched \(freshRuns.count) fresh runs")
            } catch {
                print("❌ iOS App: Failed to fetch fresh data after cache clear: \(error)")
            }
        }
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
            
            // Check for new runs and show notifications
            await checkForNewRunsAndNotify(newRuns)
            
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
    
    // MARK: - Notification Methods
    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, error in
            if granted {
                print("🔔 iOS App: Notification permissions granted")
                // Clear any existing badges
                DispatchQueue.main.async {
                    UIApplication.shared.applicationIconBadgeNumber = 0
                }
            } else if let error = error {
                print("❌ iOS App: Notification permission error: \(error)")
            } else {
                print("🔔 iOS App: Notification permissions denied")
            }
        }
    }
    
    private func checkForNewRunsAndNotify(_ newRuns: [ScheduledRun]) async {
        // Get the last known run count from UserDefaults
        let lastRunCount = UserDefaults.standard.integer(forKey: "lastRunCount")
        let currentRunCount = newRuns.count
        
        // If we have more runs than before, some are new
        if currentRunCount > lastRunCount {
            let newRunsCount = currentRunCount - lastRunCount
            
            // Show notification for new runs
            if newRunsCount == 1 {
                if let newRun = newRuns.last {
                    showNewRunNotification(for: newRun)
                }
            } else {
                showMultipleRunsNotification(count: newRunsCount)
            }
            
            // Update the stored count
            UserDefaults.standard.set(currentRunCount, forKey: "lastRunCount")
        }
    }
    
    private func showNewRunNotification(for run: ScheduledRun) {
        let content = UNMutableNotificationContent()
        content.title = "New Run Scheduled! 🏃‍♂️"
        content.body = "Run with Kam at \(run.location) on \(formatDate(run.date)) at \(run.time)"
        content.sound = .default
        content.badge = NSNumber(value: 0) // Explicitly set to 0 to prevent iOS from showing badges
        
        // Add run details to notification
        content.userInfo = [
            "runId": run.id,
            "location": run.location,
            "date": run.date.timeIntervalSince1970,
            "time": run.time
        ]
        
        let request = UNNotificationRequest(
            identifier: "new-run-\(run.id)",
            content: content,
            trigger: nil
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ iOS App: Failed to show notification: \(error)")
            } else {
                print("🔔 iOS App: New run notification shown for \(run.location)")
                // Clear badge after showing notification
                DispatchQueue.main.async {
                    UIApplication.shared.applicationIconBadgeNumber = 0
                }
            }
        }
        
        // Also show in-app alert for foreground notifications
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: .showInAppNotification,
                object: run
            )
        }
    }
    
    private func showMultipleRunsNotification(count: Int) {
        let content = UNMutableNotificationContent()
        content.title = "New Runs Added! 🏃‍♂️"
        content.body = "\(count) new runs have been scheduled. Check the calendar!"
        content.sound = .default
        content.badge = NSNumber(value: 0) // Explicitly set to 0 to prevent iOS from showing badges
        
        let request = UNNotificationRequest(
            identifier: "multiple-runs-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ iOS App: Failed to show multiple runs notification: \(error)")
            } else {
                print("🔔 iOS App: Multiple runs notification shown for \(count) runs")
                // Clear badge after showing notification
                DispatchQueue.main.async {
                    UIApplication.shared.applicationIconBadgeNumber = 0
                }
            }
        }
        
        // Also show in-app alert
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: .showInAppNotification,
                object: nil
            )
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
    
    // MARK: - Test Notification (for debugging)
    func testNotification() {
        let content = UNMutableNotificationContent()
        content.title = "Test Notification! 🧪"
        content.body = "This is a test notification from RunWithKam"
        content.sound = .default
        content.badge = NSNumber(value: 0) // Explicitly set to 0 to prevent iOS from showing badges
        
        let request = UNNotificationRequest(
            identifier: "test-notification-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ iOS App: Failed to show test notification: \(error)")
            } else {
                print("🔔 iOS App: Test notification shown successfully")
                // Clear badge after showing notification
                DispatchQueue.main.async {
                    UIApplication.shared.applicationIconBadgeNumber = 0
                }
            }
        }
        
        // Also show in-app alert
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: .showInAppNotification,
                object: nil
            )
        }
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        // Handle notification tap
        print("🔔 iOS App: User tapped notification: \(response.notification.request.identifier)")
        completionHandler()
    }
    
    @objc private func appDidBecomeActive() {
        // Clear badge when app becomes active
        UIApplication.shared.applicationIconBadgeNumber = 0
        print("🔔 iOS App: App became active, cleared badge")
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
    static let showInAppNotification = Notification.Name("showInAppNotification")
}
