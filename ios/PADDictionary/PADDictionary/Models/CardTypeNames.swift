import Foundation

enum CardTypeNames {
    private static let names: [Int: String] = [
        0: "Evo Material", 1: "Balanced", 2: "Physical", 3: "Healer", 4: "Dragon", 5: "God",
        6: "Attacker", 7: "Devil", 8: "Machine", 12: "Awoken", 14: "Enhance", 15: "Redeemable",
    ]

    static func name(for type: Int) -> String {
        names[type] ?? "Type \(type)"
    }
}
