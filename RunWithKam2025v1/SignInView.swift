import SwiftUI

struct SignInView: View {
    @AppStorage("firstName") private var firstName: String = ""
    @AppStorage("lastName") private var lastName: String = ""
    @AppStorage("username") private var username: String = ""
    
    @State private var firstNameInput: String = ""
    @State private var lastNameInput: String = ""
    @State private var usernameInput: String = ""
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 30) {
                    Spacer(minLength: 20)
                    
                    VStack(spacing: 20) {
                        Text("Run With Kam")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        
                        Text("Sign in to get started")
                            .font(.title2)
                            .foregroundColor(.secondary)
                    }
                    
                    VStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("First Name")
                                .font(.headline)
                                .foregroundColor(.primary)
                            
                            TextField("Enter your first name", text: $firstNameInput)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .textInputAutocapitalization(.words)
                                .accessibilityLabel("First name text field")
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Last Name")
                                .font(.headline)
                                .foregroundColor(.primary)
                            
                            TextField("Enter your last name", text: $lastNameInput)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .textInputAutocapitalization(.words)
                                .accessibilityLabel("Last name text field")
                        }
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Username")
                                .font(.headline)
                                .foregroundColor(.primary)
                            TextField("Choose a username", text: $usernameInput)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled(true)
                                .accessibilityLabel("Username text field")
                        }
                    }
                    .padding(.horizontal, 40)
                    
                    Button(action: continueAction) {
                        Text("Continue")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color.blue)
                            .cornerRadius(25)
                    }
                    .padding(.horizontal, 40)
                    .accessibilityLabel("Continue button")
                    
                    Spacer(minLength: 20)
                }
                .padding(.top, 40)
            }
            .scrollDismissesKeyboard(.interactively)
            .ignoresSafeArea(.keyboard, edges: .bottom)
            .alert("Error", isPresented: $showingAlert) {
                Button("OK") { }
            } message: {
                Text(alertMessage)
            }
        }
        .navigationBarHidden(true)
    }
    
    private func continueAction() {
        let trimmedFirstName = firstNameInput.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedLastName = lastNameInput.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedUsername = usernameInput.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        
        if trimmedFirstName.isEmpty {
            alertMessage = "Please enter your first name"
            showingAlert = true
            return
        }
        
        if trimmedLastName.isEmpty {
            alertMessage = "Please enter your last name"
            showingAlert = true
            return
        }
        if trimmedUsername.isEmpty {
            alertMessage = "Please choose a username"
            showingAlert = true
            return
        }
        if !NSPredicate(format: "SELF MATCHES %@", "[a-z0-9_.-]{3,32}").evaluate(with: trimmedUsername) {
            alertMessage = "Username must be 3-32 chars (letters, numbers, . _ -)"
            showingAlert = true
            return
        }
        
        Task {
            do {
                let user = try await APIService.shared.createAccount(firstName: trimmedFirstName, lastName: trimmedLastName, username: trimmedUsername)
                // Save to UserDefaults
                firstName = user.firstName
                lastName = user.lastName
                username = user.username ?? trimmedUsername
            } catch {
                alertMessage = (error as NSError).localizedDescription
                showingAlert = true
            }
        }
    }
}

#Preview {
    SignInView()
}
