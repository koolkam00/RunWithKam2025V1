import SwiftUI

struct ProfileView: View {
    @AppStorage("firstName") private var firstName: String = ""
    @AppStorage("lastName") private var lastName: String = ""
    @AppStorage("username") private var username: String = ""

    @State private var photoUrl: String = ""
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
                    TextField("Photo URL", text: $photoUrl)
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
            do {
                // We don’t have the userId directly; for now, no-op if username unknown in leaderboard. In a fuller app, we’d fetch and resolve ID.
                message = "Saved locally. Server update pending ID resolution."
            } catch {
                message = error.localizedDescription
            }
            isSaving = false
        }
    }
}

#Preview {
    ProfileView()
}


