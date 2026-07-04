import SwiftUI

struct ContentView: View {
    @AppStorage("appTheme") private var appTheme: AppTheme = .system
    @StateObject private var dataStore = DataStore(
        documentsDirectory: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    )

    var body: some View {
        TabView {
            NavigationStack {
                InfoView(dataStore: dataStore)
            }
            .tabItem { Label("Info", systemImage: "info.circle") }

            BrowseView(dataStore: dataStore)
                .tabItem { Label("Browse", systemImage: "square.grid.2x2") }

            NavigationStack {
                SyncView(dataStore: dataStore, syncService: GitHubSyncService())
            }
            .tabItem { Label("Sync", systemImage: "arrow.triangle.2.circlepath") }

            NavigationStack {
                SettingsView()
            }
            .tabItem { Label("Settings", systemImage: "gearshape") }
        }
        .tint(Color.padAccent)
        .preferredColorScheme(appTheme.colorScheme)
    }
}
