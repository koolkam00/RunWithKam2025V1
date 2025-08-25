import SwiftUI

struct MainTabView: View {
    @AppStorage("firstName") private var firstName: String = ""
    @AppStorage("lastName") private var lastName: String = ""
    @State private var showingSettings = false
    
    var body: some View {
        NavigationView {
            TabView {
                // Request Run Tab
                RequestRunView()
                    .tabItem {
                        Image(systemName: "figure.run")
                        Text("Request Run")
                    }
                
                // Leaderboard Tab
                LeaderboardView()
                    .tabItem {
                        Image(systemName: "trophy")
                        Text("Leaderboard")
                    }
                
                // Running Calendar Tab
                RunningCalendarView()
                    .tabItem {
                        Image(systemName: "calendar")
                        Text("Running Calendar")
                    }

                ProfileView()
                    .tabItem {
                        Image(systemName: "person.crop.circle")
                        Text("Profile")
                    }
            }
            .navigationBarHidden(true)
                            .accentColor(.blue)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingSettings = true }) {
                        Image(systemName: "gearshape.fill")
                            .foregroundColor(.blue)
                    }
                }
            }
            .sheet(isPresented: $showingSettings) {
                SettingsView()
            }
        }
    }
}

#Preview {
    MainTabView()
}
