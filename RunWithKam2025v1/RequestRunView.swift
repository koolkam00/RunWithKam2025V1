import SwiftUI
import MessageUI

struct RequestRunView: View {
    @AppStorage("firstName") private var firstName: String = ""
    @AppStorage("lastName") private var lastName: String = ""
    
    private let phoneNumber: String = "9086039189"
    @State private var selectedDate = Date()
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var showingMessageComposer = false
    @State private var selectedPace: Double = 8.5 // Default to 8:30 pace
    
    private let minDate = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date()
    
    // Pace range: 7:00 to 10:30 per mile (in decimal format)
    private let minPace: Double = 7.0
    private let maxPace: Double = 10.5
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // Header
                VStack(spacing: 10) {
                    Text("Request a Run")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.red)
                    
                    Text("Welcome back, \(firstName)!")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)
                
                // Date & Time Picker
                VStack(alignment: .leading, spacing: 8) {
                    Text("Date & Time")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    DatePicker("Select date and time", selection: $selectedDate, in: minDate..., displayedComponents: [.date, .hourAndMinute])
                        .datePickerStyle(WheelDatePickerStyle())
                        .accessibilityLabel("Date and time picker")
                }
                .padding(.horizontal, 40)
                
                // Pace Preference Slider
                VStack(alignment: .leading, spacing: 8) {
                    Text("Pace Preference")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    VStack(spacing: 12) {
                        // Pace Slider
                        HStack {
                            Text("7:00")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Slider(
                                value: $selectedPace,
                                in: minPace...maxPace,
                                step: 0.1
                            )
                            .accentColor(.red)
                            
                            Text("10:30")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        // Current Pace Display
                        let paceString = formatPace(selectedPace)
                        let paceCategory = getPaceCategory(selectedPace)
                        
                        HStack {
                            Text(paceString)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.red)
                            
                            Text("/mile")
                                .font(.body)
                                .foregroundColor(.secondary)
                            
                            Spacer()
                            
                            Text("\(paceCategory.emoji) \(paceCategory.name)")
                                .font(.body)
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                        }
                        .padding(.horizontal, 8)
                    }
                }
                .padding(.horizontal, 40)
                
                Spacer()
                
                // Big Red Button
                Button(action: runWithKamAction) {
                    VStack(spacing: 10) {
                        Text("RUN WITH")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        Text("KAM")
                            .font(.largeTitle)
                            .fontWeight(.black)
                            .foregroundColor(.white)
                    }
                    .frame(width: 200, height: 200)
                    .background(
                        Circle()
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.red, Color.red.opacity(0.8)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)
                    )
                    .scaleEffect(1.0)
                    .animation(.easeInOut(duration: 0.1), value: 1.0)
                }
                .accessibilityLabel("Run with Kam button")
                .accessibilityHint("Double tap to send run invitation")
                
                Spacer()
            }
            .padding()
            .navigationBarHidden(true)
            .alert("Error", isPresented: $showingAlert) {
                Button("OK") { }
            } message: {
                Text(alertMessage)
            }
            .sheet(isPresented: $showingMessageComposer) {
                MessageComposeView(
                    phoneNumber: phoneNumber,
                    message: createMessage(),
                    isPresented: $showingMessageComposer
                )
            }
        }
    }
    
    private func runWithKamAction() {
        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .heavy)
        impactFeedback.impactOccurred()
        
        // Validate date is in the future
        if selectedDate <= Date() {
            alertMessage = "Please select a future date and time"
            showingAlert = true
            return
        }
        
        // Show message composer immediately
        showingMessageComposer = true
    }
    
    // MARK: - Pace Functions
    
    private func formatPace(_ pace: Double) -> String {
        let minutes = Int(pace)
        let seconds = Int((pace - Double(minutes)) * 60)
        return String(format: "%d:%02d", minutes, seconds)
    }
    
    private func getPaceCategory(_ pace: Double) -> (name: String, emoji: String) {
        if pace >= 10.0 {
            return ("Party Pace", "🎉")
        } else if pace >= 8.5 {
            return ("EZ Pace", "😌")
        } else if pace >= 7.5 {
            return ("Tough Pace", "💪")
        } else {
            return ("No Talking", "🤐")
        }
    }
    
    private func createMessage() -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEEE, MMMM d, yyyy 'at' h:mm a"
        let dateString = dateFormatter.string(from: selectedDate)
        
        let paceString = formatPace(selectedPace)
        let paceCategory = getPaceCategory(selectedPace)
        
        return "Run with Kam on \(dateString)?\n- \(firstName) \(lastName)\n- Pace: \(paceString)/mile (\(paceCategory.emoji) \(paceCategory.name))"
    }
}

// Message Compose View
struct MessageComposeView: UIViewControllerRepresentable {
    let phoneNumber: String
    let message: String
    @Binding var isPresented: Bool
    
    func makeUIViewController(context: Context) -> MFMessageComposeViewController {
        let controller = MFMessageComposeViewController()
        controller.messageComposeDelegate = context.coordinator
        controller.recipients = [phoneNumber]
        controller.body = message
        return controller
    }
    
    func updateUIViewController(_ uiViewController: MFMessageComposeViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, MFMessageComposeViewControllerDelegate {
        let parent: MessageComposeView
        
        init(_ parent: MessageComposeView) {
            self.parent = parent
        }
        
        func messageComposeViewController(_ controller: MFMessageComposeViewController, didFinishWith result: MessageComposeResult) {
            parent.isPresented = false
        }
    }
}

#Preview {
    RequestRunView()
}
