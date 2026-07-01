import UIKit

final class SpriteSheetCache {
    static let shared = SpriteSheetCache()

    private let cache = NSCache<NSString, UIImage>()
    private let baseDirectory: URL

    init(baseDirectory: URL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]) {
        self.baseDirectory = baseDirectory
    }

    func image(relativePath: String) -> UIImage? {
        let key = relativePath as NSString
        if let cached = cache.object(forKey: key) { return cached }
        guard let loaded = UIImage(contentsOfFile: baseDirectory.appendingPathComponent(relativePath).path) else { return nil }
        cache.setObject(loaded, forKey: key)
        return loaded
    }
}
