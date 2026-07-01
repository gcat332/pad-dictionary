import SwiftUI

@MainActor
final class SettingsViewModel: ObservableObject {
    @Published var tokenInput: String = ""
    @Published private(set) var isSaved: Bool

    private let keychain: KeychainStore

    init(keychain: KeychainStore = KeychainStore()) {
        self.keychain = keychain
        self.isSaved = keychain.read() != nil
    }

    func save() {
        guard !tokenInput.isEmpty else { return }
        keychain.save(token: tokenInput)
        tokenInput = ""
        isSaved = true
    }

    func clear() {
        keychain.delete()
        isSaved = false
    }
}

struct SettingsView: View {
    @StateObject private var viewModel = SettingsViewModel()

    var body: some View {
        Form {
            Section {
                SecureField("GitHub personal access token", text: $viewModel.tokenInput)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Button("Save Token") { viewModel.save() }
                    .disabled(viewModel.tokenInput.isEmpty)
            } header: {
                Text("GitHub Access")
            } footer: {
                Text(viewModel.isSaved ? "A token is saved in Keychain." : "No token saved yet.")
            }

            if viewModel.isSaved {
                Section {
                    Button("Remove Saved Token", role: .destructive) { viewModel.clear() }
                }
            }
        }
        .navigationTitle("Settings")
    }
}
