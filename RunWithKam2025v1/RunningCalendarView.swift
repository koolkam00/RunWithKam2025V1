import SwiftUI
import Foundation

struct RunningCalendarView: View {
    @AppStorage("firstName") private var firstName: String = ""
    @AppStorage("lastName") private var lastName: String = ""
    
    @State private var selectedDate = Date()
    @State private var runs: [ScheduledRun] = []
    @StateObject private var apiService = APIService.shared
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 10) {
                    Text("Running Calendar")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                    
                    Text("View scheduled runs")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)
                
                // Test Notification Button (for debugging)
                HStack(spacing: 12) {
                    Button(action: {
                        apiService.testNotification()
                    }) {
                        HStack {
                            Image(systemName: "bell.badge")
                            Text("Test Notification")
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.orange)
                        .cornerRadius(8)
                    }
                    
                    Button(action: {
                        checkForNewRuns()
                    }) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Check for New Runs")
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.green)
                        .cornerRadius(8)
                    }
                }
                .padding(.bottom, 10)
                
                // Calendar View
                VStack(spacing: 15) {
                    // Month/Year Header
                    HStack {
                        Button(action: previousMonth) {
                            Image(systemName: "chevron.left")
                                .foregroundColor(.blue)
                                .font(.title2)
                        }
                        
                        Spacer()
                        
                        Text(monthYearString)
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        Button(action: nextMonth) {
                            Image(systemName: "chevron.right")
                                .foregroundColor(.blue)
                                .font(.title2)
                        }
                    }
                    .padding(.horizontal, 40)
                    
                    // Calendar Grid
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                        // Day headers
                        ForEach(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], id: \.self) { day in
                            Text(day)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                        }
                        
                        // Calendar days
                        ForEach(Array(calendarDays.enumerated()), id: \.offset) { index, date in
                            if let date = date {
                                CalendarDayView(
                                    date: date,
                                    isSelected: Calendar.current.isDate(date, inSameDayAs: selectedDate),
                                    hasRuns: hasRunsOnDate(date),
                                    isCurrentMonth: Calendar.current.isDate(date, equalTo: selectedDate, toGranularity: .month)
                                ) {
                                    selectedDate = date
                                }
                            } else {
                                Color.clear
                                    .frame(height: 40)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                }
                
                // Selected Date Runs
                VStack(alignment: .leading, spacing: 10) {
                    Text("Runs on \(selectedDateString)")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    if isLoading {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Loading runs...")
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding()
                    } else if let errorMessage = errorMessage {
                        VStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle")
                                .foregroundColor(.orange)
                                .font(.title2)
                            Text("Connection Error")
                                .font(.headline)
                                .foregroundColor(.orange)
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            Button("Retry") {
                                loadRunsFromAPI()
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding()
                    } else {
                        let runsOnDate = getRunsOnDate(selectedDate)
                        if !runsOnDate.isEmpty {
                            ForEach(runsOnDate, id: \.id) { run in
                                RunCardView(run: run)
                            }
                        } else {
                            Text("No runs scheduled")
                                .foregroundColor(.secondary)
                                .italic()
                        }
                    }
                }
                .padding(.horizontal, 20)
                
                Spacer()
            }
            .padding()
            .navigationBarHidden(true)

            .onAppear {
                loadRunsFromAPI()
                // Start real-time updates
                apiService.startRealTimeUpdates()
                
                // Listen for real-time updates
                NotificationCenter.default.addObserver(
                    forName: .runsUpdated,
                    object: nil,
                    queue: .main
                ) { notification in
                    if let updatedRuns = notification.object as? [ScheduledRun] {
                        runs = updatedRuns
                    }
                }
            }
        }
    }
    
    // MARK: - Calendar Functions
    
    private var monthYearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: selectedDate)
    }
    
    private var selectedDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: selectedDate)
    }
    
    private var calendarDays: [Date?] {
        let calendar = Calendar.current
        let startOfMonth = calendar.dateInterval(of: .month, for: selectedDate)?.start ?? selectedDate
        let firstWeekday = calendar.component(.weekday, from: startOfMonth)
        let daysInMonth = calendar.range(of: .day, in: .month, for: selectedDate)?.count ?? 0
        
        var days: [Date?] = []
        
        // Add empty days for first week
        for _ in 1..<firstWeekday {
            days.append(nil)
        }
        
        // Add days of the month
        for day in 1...daysInMonth {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: startOfMonth) {
                days.append(date)
            }
        }
        
        return days
    }
    
    private func previousMonth() {
        if let newDate = Calendar.current.date(byAdding: .month, value: -1, to: selectedDate) {
            selectedDate = newDate
        }
    }
    
    private func nextMonth() {
        if let newDate = Calendar.current.date(byAdding: .month, value: 1, to: selectedDate) {
            selectedDate = newDate
        }
    }
    
    private func hasRunsOnDate(_ date: Date) -> Bool {
        return !getRunsOnDate(date).isEmpty
    }
    
    private func getRunsOnDate(_ date: Date) -> [ScheduledRun] {
        return runs.filter { run in
            Calendar.current.isDate(run.date, inSameDayAs: date)
        }
    }
    
    private func loadRunsFromAPI() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let fetchedRuns = try await apiService.fetchRuns()
                await MainActor.run {
                    runs = fetchedRuns
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}

// MARK: - Supporting Views

struct CalendarDayView: View {
    let date: Date
    let isSelected: Bool
    let hasRuns: Bool
    let isCurrentMonth: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 2) {
                Text("\(Calendar.current.component(.day, from: date))")
                    .font(.system(size: 16, weight: isSelected ? .bold : .medium))
                    .foregroundColor(isCurrentMonth ? .primary : .secondary)
                
                if hasRuns {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 6, height: 6)
                } else {
                    Color.clear
                        .frame(width: 6, height: 6)
                }
            }
            .frame(height: 40)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(isSelected ? Color.blue.opacity(0.2) : Color.clear)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct RunCardView: View {
    let run: ScheduledRun
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(run.time)
                        .font(.headline)
                        .foregroundColor(.blue)
                    
                    Text(run.location)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                }
                
                Spacer()
                
                Text(run.pace)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(8)
            }
            
            if !run.description.isEmpty {
                Text(run.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Data Models

struct ScheduledRun: Identifiable, Codable {
    let id: String
    let date: Date
    let time: String
    let location: String
    let pace: String
    let description: String
    
    // Custom coding keys to handle any potential date format issues
    enum CodingKeys: String, CodingKey {
        case id, date, time, location, pace, description
    }
    
    // Custom initializer to handle date parsing more robustly
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        id = try container.decode(String.self, forKey: .id)
        time = try container.decode(String.self, forKey: .time)
        location = try container.decode(String.self, forKey: .location)
        pace = try container.decode(String.self, forKey: .pace)
        description = try container.decode(String.self, forKey: .description)
        
        // Robust date parsing with multiple fallback strategies
        let dateString = try container.decode(String.self, forKey: .date)
        
        // Try multiple date parsing strategies
        if let parsedDate = ScheduledRun.parseDate(dateString) {
            date = parsedDate
        } else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: [],
                    debugDescription: "Unable to parse date string: \(dateString)"
                )
            )
        }
    }
    
    // Fallback initializer for creating runs programmatically
    init(id: String, date: Date, time: String, location: String, pace: String, description: String) {
        self.id = id
        self.date = date
        self.time = time
        self.location = location
        self.pace = pace
        self.description = description
    }
    
    // Custom initializer for dictionary data (used by our custom decoder)
    init(from dictionary: [String: Any]) throws {
        guard let id = dictionary["id"] as? String else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: [],
                    debugDescription: "Expected string id, got \(dictionary["id"] ?? "nil")"
                )
            )
        }
        
        guard let time = dictionary["time"] as? String else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: [],
                    debugDescription: "Expected string time, got \(dictionary["time"] ?? "nil")"
                )
            )
        }
        
        guard let location = dictionary["location"] as? String else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: [],
                    debugDescription: "Expected string location, got \(dictionary["location"] ?? "nil")"
                )
            )
        }
        
        guard let pace = dictionary["pace"] as? String else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: [],
                    debugDescription: "Expected string pace, got \(dictionary["pace"] ?? "nil")"
                )
            )
        }
        
        let description = dictionary["description"] as? String ?? ""
        
        guard let dateString = dictionary["date"] as? String else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: [],
                    debugDescription: "Could not parse date string: \(dictionary["date"] ?? "nil")"
                )
            )
        }
        
        // Use our robust date parsing (static method)
        guard let parsedDate = ScheduledRun.parseDate(dateString) else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: [],
                    debugDescription: "Could not parse date string: \(dateString)"
                )
            )
        }
        
        self.id = id
        self.date = parsedDate
        self.time = time
        self.location = location
        self.pace = pace
        self.description = description
    }
    
    // Robust date parsing function (static to avoid initialization issues)
    private static func parseDate(_ dateString: String) -> Date? {
        // Strategy 1: Try ISO8601 with fractional seconds
        let iso8601Formatter = ISO8601DateFormatter()
        iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso8601Formatter.date(from: dateString) {
            return date
        }
        
        // Strategy 2: Try ISO8601 without fractional seconds
        iso8601Formatter.formatOptions = [.withInternetDateTime]
        if let date = iso8601Formatter.date(from: dateString) {
            return date
        }
        
        // Strategy 3: Try DateFormatter with multiple formats
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(abbreviation: "UTC")
        
        let formats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            "yyyy-MM-dd'T'HH:mm:ssZ"
        ]
        
        for format in formats {
            dateFormatter.dateFormat = format
            if let date = dateFormatter.date(from: dateString) {
                return date
            }
        }
        
        // Strategy 4: Try parsing as Date directly (last resort)
        if let date = ISO8601DateFormatter().date(from: dateString) {
            return date
        }
        
        return nil
    }
}

// MARK: - Notification Handling
extension RunningCalendarView {
    func checkForNewRuns() {
        Task {
            do {
                let newRuns = try await apiService.fetchRuns()
                print("🔔 iOS App: Checked for new runs, found \(newRuns.count)")
                
                // The APIService will automatically show notifications for new runs
                // This method is for manual checking
            } catch {
                print("❌ iOS App: Failed to check for new runs: \(error)")
            }
        }
    }
}

#Preview {
    RunningCalendarView()
}

