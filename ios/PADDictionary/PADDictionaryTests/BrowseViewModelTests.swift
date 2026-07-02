import XCTest
@testable import PADDictionary

final class BrowseViewModelTests: XCTestCase {
    private var tempDir: URL!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try! FileManager.default.createDirectory(at: tempDir.appendingPathComponent("monsters-info"), withIntermediateDirectories: true)
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        super.tearDown()
    }

    private func writeCards(_ json: String) throws {
        try Data(json.utf8).write(to: tempDir.appendingPathComponent("monsters-info/mon_ja.json"))
        try Data("[]".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_ja.json"))
        try Data("[]".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_en.json"))
        try Data("{}".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_tr.json"))
    }

    @MainActor
    func testSearchTextFiltersByIdSubstring() throws {
        try writeCards(#"[{"id":1,"name":"A","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0},{"id":21,"name":"B","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0}]"#)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = BrowseViewModel(dataStore: dataStore)
        viewModel.searchText = "2"
        XCTAssertEqual(viewModel.cards.map(\.id), [21])
    }

    @MainActor
    func testEmptyAndDisabledCardsAreExcluded() throws {
        try writeCards(#"[{"id":1,"name":"A","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0},{"id":2,"name":"B","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":true,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0},{"id":3,"name":"C","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":false,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0}]"#)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = BrowseViewModel(dataStore: dataStore)
        XCTAssertEqual(viewModel.cards.map(\.id), [1])
    }

    @MainActor
    func testDefaultSortIsIdDescending() throws {
        try writeCards(#"[{"id":1,"name":"A","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0},{"id":2,"name":"B","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0}]"#)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = BrowseViewModel(dataStore: dataStore)
        XCTAssertEqual(viewModel.cards.map(\.id), [2, 1])
    }

    @MainActor
    func testToggleDirectionReversesOrder() throws {
        try writeCards(#"[{"id":1,"name":"A","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0},{"id":2,"name":"B","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0}]"#)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = BrowseViewModel(dataStore: dataStore)
        viewModel.isDescending = false
        XCTAssertEqual(viewModel.cards.map(\.id), [1, 2])
    }

    @MainActor
    func testFilterStateNarrowsResults() throws {
        try writeCards(#"[{"id":1,"name":"A","attrs":[0],"types":[1],"rarity":5,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0},{"id":2,"name":"B","attrs":[1],"types":[1],"rarity":5,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0}]"#)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = BrowseViewModel(dataStore: dataStore)
        viewModel.filterState.attr[0] = [1]
        XCTAssertEqual(viewModel.cards.map(\.id), [2])
    }
}
