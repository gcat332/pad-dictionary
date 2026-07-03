import UIKit

/// Crops one square cell out of a sprite sheet. `x`/`y`/`size` are in points (image scale applied).
enum SpriteCrop {
    static func cell(from image: UIImage, x: Int, y: Int, size: Int) -> UIImage? {
        guard let cg = image.cgImage else { return nil }
        let s = image.scale
        let rect = CGRect(x: CGFloat(x) * s, y: CGFloat(y) * s,
                          width: CGFloat(size) * s, height: CGFloat(size) * s)
        guard let cropped = cg.cropping(to: rect) else { return nil }
        return UIImage(cgImage: cropped, scale: s, orientation: .up)
    }
}

extension UIImage {
    /// Returns a copy scaled to `height` points, preserving aspect ratio.
    func resized(toHeight height: CGFloat) -> UIImage {
        let width = size.width * (height / size.height)
        let target = CGSize(width: width, height: height)
        return UIGraphicsImageRenderer(size: target).image { _ in
            draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
