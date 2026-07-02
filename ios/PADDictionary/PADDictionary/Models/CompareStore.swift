import Foundation
import Combine

@MainActor
final class CompareStore: ObservableObject {
    @Published private(set) var ids: [Int] = []

    func add(_ id: Int) {
        guard !ids.contains(id) else { return }
        ids.append(id)
    }

    func remove(_ id: Int) {
        ids.removeAll { $0 == id }
    }

    func toggle(_ id: Int) {
        if ids.contains(id) {
            remove(id)
        } else {
            add(id)
        }
    }

    func clear() {
        ids.removeAll()
    }

    func contains(_ id: Int) -> Bool {
        ids.contains(id)
    }
}
