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
                
                // Running Calendar Tab
                RunningCalendarView()
                    .tabItem {
                        Image(systemName: "calendar")
                        Text("Running Calendar")
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
