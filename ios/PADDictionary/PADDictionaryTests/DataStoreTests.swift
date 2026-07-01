import XCTest
@testable import PADDictionary

final class DataStoreTests: XCTestCase {
    private var tempDir: URL!
    private var defaults: UserDefaults!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try! FileManager.default.createDirectory(at: tempDir.appendingPathComponent("monsters-info"), withIntermediateDirectories: true)
        defaults = UserDefaults(suiteName: "DataStoreTests-\(UUID().uuidString)")
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        super.tearDown()
    }

    @MainActor
    func testReloadIsEmptyWhenNoCacheExists() {
        let store = DataStore(documentsDirectory: tempDir, userDefaults: defaults)
        XCTAssertTrue(store.cards.isEmpty)
        XCTAssertNil(store.lastSyncedAt)
    }

    @MainActor
    func testReloadDecodesCachedFiles() throws {
        let cardJSON = #"[{"id":1,"name":"Tyrra","attrs":[0],"types":[4],"rarity":2,"cost":2,"maxLevel":5,"isEmpty":false,"enabled":true,"hp":{"min":52,"max":144,"scale":1},"atk":{"min":57,"max":71,"scale":1},"rcv":{"min":8,"max":13,"scale":1},"activeSkillId":1,"leaderSkillId":51,"evoRootId":1929,"awakenings":[21,21],"superAwakenings":[],"canAssist":false}]"#
        try Data(cardJSON.utf8).write(to: tempDir.appendingPathComponent("monsters-info/mon_ja.json"))
        try Data("[]".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_ja.json"))
        try Data("[]".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_en.json"))
        try Data("{}".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_tr.json"))

        let store = DataStore(documentsDirectory: tempDir, userDefaults: defaults)
        XCTAssertEqual(store.cards.count, 1)
        XCTAssertEqual(store.cards[0].name, "Tyrra")
    }

    @MainActor
    func testMarkSyncedPersistsAcrossInstances() {
        let store = DataStore(documentsDirectory: tempDir, userDefaults: defaults)
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        store.markSynced(at: date)
        XCTAssertEqual(store.lastSyncedAt, date)

        let reloaded = DataStore(documentsDirectory: tempDir, userDefaults: defaults)
        XCTAssertEqual(reloaded.lastSyncedAt, date)
    }
}
