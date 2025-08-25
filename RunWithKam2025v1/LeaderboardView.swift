import SwiftUI

struct LeaderboardView: View {
    @StateObject private var apiService = APIService.shared
    @State private var leaderboardUsers: [LeaderboardUser] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 10) {
                    Text("🏆 Leaderboard")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                    
                    Text("Ranked by total miles")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)
                
                // Leaderboard Content
                if isLoading {
                    ProgressView("Loading leaderboard...")
                        .progressViewStyle(CircularProgressViewStyle())
                        .scaleEffect(1.2)
                } else if let errorMessage = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)
                        
                        Text("Error Loading Leaderboard")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text(errorMessage)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button("Retry") {
                            loadLeaderboard()
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color.blue)
                        .cornerRadius(8)
                    }
                    .padding()
                } else if leaderboardUsers.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "trophy")
                            .font(.system(size: 50))
                            .foregroundColor(.yellow)
                        
                        Text("No Users Yet")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("Be the first to join the leaderboard!")
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    // Leaderboard List
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(Array(leaderboardUsers.enumerated()), id: \.element.id) { index, user in
                                LeaderboardRowView(user: user, rank: index + 1)
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                }
                
                Spacer()
            }
            .navigationBarHidden(true)
            .onAppear {
                loadLeaderboard()
            }
            .refreshable {
                await refreshLeaderboard()
            }
        }
    }
    
    private func loadLeaderboard() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let users = try await apiService.fetchLeaderboard()
                await MainActor.run {
                    leaderboardUsers = users
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
    
    private func refreshLeaderboard() async {
        do {
            let users = try await apiService.fetchLeaderboard()
            await MainActor.run {
                leaderboardUsers = users
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Leaderboard Row View
struct LeaderboardRowView: View {
    let user: LeaderboardUser
    let rank: Int
    
    private var rankColor: Color {
        switch rank {
        case 1: return .yellow
        case 2: return .gray
        case 3: return .orange
        default: return .blue
        }
    }
    
    private var rankIcon: String {
        switch rank {
        case 1: return "🥇"
        case 2: return "🥈"
        case 3: return "🥉"
        default: return "\(rank)"
        }
    }
    
    var body: some View {
        HStack(spacing: 16) {
            // Rank
            ZStack {
                Circle()
                    .fill(rankColor.opacity(0.2))
                    .frame(width: 50, height: 50)
                
                Text(rankIcon)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(rankColor)
            }
            
            // User Info
            VStack(alignment: .leading, spacing: 4) {
                Text(user.fullName)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                
                HStack(spacing: 16) {
                    Label(user.displayRuns, systemImage: "figure.run")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Label(user.displayMiles, systemImage: "map")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // Stats
            VStack(alignment: .trailing, spacing: 4) {
                Text(user.displayMiles)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.blue)
                
                Text("miles")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
}

#Preview {
    LeaderboardView()
}
