import SwiftUI

struct ProfileView: View {
    @AppStorage("firstName") private var firstName: String = ""
    @AppStorage("lastName") private var lastName: String = ""
    @AppStorage("username") private var username: String = ""

    @State private var bio: String = ""
    @State private var pace: String = ""
    @State private var favoritePier: String = ""

    @State private var isSaving = false
    @State private var message: String?

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Profile")) {
                    TextField("First Name", text: $firstName)
                    TextField("Last Name", text: $lastName)
                    TextField("Username", text: $username)
                        .disabled(true)
                    TextField("Bio", text: $bio)
                    TextField("Pace (e.g. 8:30/mile)", text: $pace)
                    TextField("Favorite Pier", text: $favoritePier)
                }

                if let message = message {
                    Section {
                        Text(message)
                            .font(.footnote)
                            .foregroundColor(.secondary)
                    }
                }

                Section {
                    Button(action: saveProfile) {
                        if isSaving { ProgressView() } else { Text("Save Profile") }
                    }
                    .disabled(isSaving)
                }
            }
            .navigationTitle("Profile")
        }
        .onAppear(perform: preload)
    }

    private func preload() {
        // No fetch endpoint for profile yet; prefill from stored defaults
    }

    private func saveProfile() {
        guard !firstName.isEmpty, !lastName.isEmpty else { message = "First and last name required"; return }
        isSaving = true
        Task {
            defer { isSaving = false }
            do {
                // Find userId by loading full leaderboard (includeAll) and matching username
                let users = try await APIService.shared.fetchLeaderboard(includeAll: true)
                if let me = users.first(where: { ($0.username ?? "").lowercased() == username.lowercased() }) {
                    _ = try await APIService.shared.updateLeaderboardUser(
                        userId: me.id,
                        firstName: firstName,
                        lastName: lastName,
                        totalRuns: me.totalRuns,
                        totalMiles: me.totalMiles,
                        appUserId: nil,
                        isRegistered: true,
                        photoUrl: nil,
                        bio: bio,
                        pace: pace,
                        favoritePier: favoritePier
                    )
                    message = "Profile saved."
                } else {
                    message = "Could not find your profile. Make sure you created an account first."
                }
            } catch {
                message = error.localizedDescription
            }
        }
    }
}

#Preview {
    ProfileView()
}


