import SwiftUI
import Combine

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
    @AppStorage("appTheme") private var appTheme: AppTheme = .system

    var body: some View {
        Form {
            Section {
                Picker("Theme", selection: $appTheme) {
                    ForEach(AppTheme.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)
            } header: {
                Text("Appearance")
            }
            .listRowBackground(Color.padPanel)

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
            .listRowBackground(Color.padPanel)

            if viewModel.isSaved {
                Section {
                    Button("Remove Saved Token", role: .destructive) { viewModel.clear() }
                }
                .listRowBackground(Color.padPanel)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.padBackground)
        .navigationTitle("Settings")
    }
}
