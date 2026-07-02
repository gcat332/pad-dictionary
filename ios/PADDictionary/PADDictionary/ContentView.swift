import SwiftUI

struct ContentView: View {
    @StateObject private var dataStore = DataStore(
        documentsDirectory: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    )
    @StateObject private var compareStore = CompareStore()

    var body: some View {
        TabView {
            BrowseView(dataStore: dataStore, compareStore: compareStore)
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
    }
}
