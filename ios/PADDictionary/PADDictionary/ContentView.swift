import SwiftUI

struct ContentView: View {
    @StateObject private var dataStore = DataStore(
        documentsDirectory: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    )

    var body: some View {
        NavigationStack {
            SyncView(dataStore: dataStore, syncService: GitHubSyncService())
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        NavigationLink {
                            SettingsView()
                        } label: {
                            Image(systemName: "gearshape")
                        }
                    }
                }
        }
    }
}
