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
                        .foregroundColor(.red)
                    
                    Text("View scheduled runs")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)
                
                // Calendar View
                VStack(spacing: 15) {
                    // Month/Year Header
                    HStack {
                        Button(action: previousMonth) {
                            Image(systemName: "chevron.left")
                                .foregroundColor(.red)
                                .font(.title2)
                        }
                        
                        Spacer()
                        
                        Text(monthYearString)
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        Button(action: nextMonth) {
                            Image(systemName: "chevron.right")
                                .foregroundColor(.red)
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
                        ForEach(calendarDays, id: \.self) { date in
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
                        .fill(Color.red)
                        .frame(width: 6, height: 6)
                } else {
                    Color.clear
                        .frame(width: 6, height: 6)
                }
            }
            .frame(height: 40)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(isSelected ? Color.red.opacity(0.2) : Color.clear)
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
                        .foregroundColor(.red)
                    
                    Text(run.location)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                }
                
                Spacer()
                
                Text(run.pace)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.red.opacity(0.1))
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
    let id: String  // Changed from UUID to String to match backend
    let date: Date
    let time: String
    let location: String
    let pace: String
    let description: String
}

#Preview {
    RunningCalendarView()
}

