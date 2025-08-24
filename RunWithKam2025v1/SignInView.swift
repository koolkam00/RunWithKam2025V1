import SwiftUI

struct SignInView: View {
    @AppStorage("firstName") private var firstName: String = ""
    @AppStorage("lastName") private var lastName: String = ""
    
    @State private var firstNameInput: String = ""
    @State private var lastNameInput: String = ""
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Spacer()
                
                VStack(spacing: 20) {
                    Text("Run With Kam")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.red)
                    
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
                            .autocapitalization(.words)
                            .accessibilityLabel("First name text field")
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Last Name")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        TextField("Enter your last name", text: $lastNameInput)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.words)
                            .accessibilityLabel("Last name text field")
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
                        .background(Color.red)
                        .cornerRadius(25)
                }
                .padding(.horizontal, 40)
                .accessibilityLabel("Continue button")
                
                Spacer()
            }
            .padding()
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
        
        // Save to UserDefaults
        firstName = trimmedFirstName
        lastName = trimmedLastName
    }
}

#Preview {
    SignInView()
}
