import UIKit

/// Resolves a `{Token}` name to a small icon `UIImage` (cropped from a sprite sheet, resized, cached).
/// Returns nil when the token has no icon (caller renders plain text).
enum SkillTokenImage {
    private static var cache: [String: UIImage] = [:]

    static func image(for name: String, height: CGFloat) -> UIImage? {
        let key = "\(name)@\(height)"
        if let cached = cache[key] { return cached }
        guard let kind = SkillToken.resolve(name), let raw = rawImage(for: kind) else { return nil }
        let sized = raw.resized(toHeight: height)
        cache[key] = sized
        return sized
    }

    private static func rawImage(for kind: SkillTokenKind) -> UIImage? {
        switch kind {
        case .orb(let col, let row):
            guard let sheet = SpriteSheetCache.shared.image(relativePath: "images/icon-orbs.png") else { return nil }
            return SpriteCrop.cell(from: sheet, x: col * 36, y: row * 36, size: 36)
        case .awoken(let id):
            guard let y = AwakeningSprite.yOffset(forAwakeningId: id),
                  let sheet = SpriteSheetCache.shared.image(relativePath: "images/awoken.png") else { return nil }
            return SpriteCrop.cell(from: sheet, x: 0, y: Int(-y), size: 32)  // yOffset is negative (-32*id)
        case .type(let id):
            return TypeIconCache.shared.icon(forType: id)
        }
    }
}
