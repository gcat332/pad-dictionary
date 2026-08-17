import SwiftUI

struct SettingsView: View {
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
        }
        .scrollContentBackground(.hidden)
        .background(Color.padBackground)
        .navigationTitle("Settings")
    }
}
