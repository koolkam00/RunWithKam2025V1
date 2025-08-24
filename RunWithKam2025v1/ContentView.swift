import SwiftUI

struct ContentView: View {
    @AppStorage("firstName") private var firstName: String = ""
    @AppStorage("lastName") private var lastName: String = ""

    var body: some View {
        Group {
            if firstName.isEmpty || lastName.isEmpty {
                SignInView()
            } else {
                MainTabView()
            }
        }
    }
}

#Preview {
    ContentView()
}
