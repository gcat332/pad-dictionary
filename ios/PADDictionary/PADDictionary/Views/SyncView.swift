import SwiftUI
import Combine

enum SyncState: Equatable {
    case idle
    case triggering
    case running
    case downloading
    case done
    case error(String)
}

@MainActor
final class SyncViewModel: ObservableObject {
    @Published private(set) var state: SyncState = .idle

    private let syncService: GitHubSyncing
    private let dataStore: DataStore
    private let documentsDirectory: URL

    init(syncService: GitHubSyncing, dataStore: DataStore, documentsDirectory: URL) {
        self.syncService = syncService
        self.dataStore = dataStore
        self.documentsDirectory = documentsDirectory
    }

    func startSync() async {
        state = .triggering
        do {
            try await syncService.triggerUpdate()
            state = .running
            let conclusion = try await syncService.pollRunStatus()
            guard conclusion == .success else {
                state = .error("The update workflow finished with: \(conclusion.rawValue).")
                return
            }
            state = .downloading
            try await syncService.downloadLatestData(to: documentsDirectory)
            dataStore.reload()
            dataStore.markSynced(at: Date())
            state = .done
        } catch GitHubSyncError.missingToken {
            state = .error("No GitHub token set. Add one in Settings.")
        } catch GitHubSyncError.unauthorized {
            state = .error("GitHub rejected the token. Check it in Settings.")
        } catch {
            state = .error(error.localizedDescription)
        }
    }
}

struct SyncView: View {
    @ObservedObject var dataStore: DataStore
    @StateObject private var viewModel: SyncViewModel

    init(dataStore: DataStore, syncService: GitHubSyncing) {
        self.dataStore = dataStore
        let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        _viewModel = StateObject(wrappedValue: SyncViewModel(syncService: syncService, dataStore: dataStore, documentsDirectory: documentsDirectory))
    }

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "arrow.triangle.2.circlepath.circle")
                .font(.system(size: 48))
                .foregroundStyle(.tint)

            if let lastSynced = dataStore.lastSyncedAt {
                Text("Last updated \(lastSynced.formatted(date: .abbreviated, time: .shortened))")
                    .foregroundStyle(Color.padDim)
            } else {
                Text("No data yet — run an update to get started.")
                    .foregroundStyle(Color.padDim)
            }

            Text("\(dataStore.cards.count) cards cached")
                .font(.caption)
                .foregroundStyle(Color.padDim)

            statusView

            Button {
                Task { await viewModel.startSync() }
            } label: {
                Label("Update Data", systemImage: "square.and.arrow.down")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isBusy)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.padBackground)
        .navigationTitle("Sync")
    }

    private var isBusy: Bool {
        switch viewModel.state {
        case .triggering, .running, .downloading: return true
        default: return false
        }
    }

    @ViewBuilder
    private var statusView: some View {
        switch viewModel.state {
        case .idle, .done:
            EmptyView()
        case .triggering:
            ProgressView("Starting update on GitHub…")
        case .running:
            ProgressView("Update running on GitHub…")
        case .downloading:
            ProgressView("Downloading refreshed data…")
        case .error(let message):
            Text(message)
                .foregroundStyle(.red)
                .multilineTextAlignment(.center)
        }
    }
}
