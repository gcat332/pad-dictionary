import Foundation
import UIKit

final class TypeIconCache {
    static let shared = TypeIconCache()

    private var icons: [Int: UIImage] = [:]
    private var isLoaded = false
    private let baseDirectory: URL

    init(baseDirectory: URL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]) {
        self.baseDirectory = baseDirectory
    }

    func icon(forType type: Int) -> UIImage? {
        loadIfNeeded()
        return icons[type]
    }

    private func loadIfNeeded() {
        guard !isLoaded else { return }
        isLoaded = true
        guard let content = try? String(contentsOf: baseDirectory.appendingPathComponent("images/icon-type.svg"), encoding: .utf8) else { return }
        icons = Self.parse(content)
    }

    static func parse(_ content: String) -> [Int: UIImage] {
        guard let regex = try? NSRegularExpression(pattern: #"<symbol id="type-(\d+)"[^>]*>.*?base64,([^"]+)""#, options: [.dotMatchesLineSeparators]) else {
            return [:]
        }
        let nsContent = content as NSString
        var result: [Int: UIImage] = [:]
        for match in regex.matches(in: content, range: NSRange(location: 0, length: nsContent.length)) {
            guard match.numberOfRanges == 3,
                  let typeId = Int(nsContent.substring(with: match.range(at: 1))),
                  let data = Data(base64Encoded: nsContent.substring(with: match.range(at: 2))),
                  let image = UIImage(data: data) else { continue }
            result[typeId] = image
        }
        return result
    }
}
