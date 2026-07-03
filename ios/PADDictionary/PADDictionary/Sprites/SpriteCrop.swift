import UIKit

/// Crops one square cell out of a sprite sheet. `x`/`y`/`size` are in points (image scale applied).
enum SpriteCrop {
    static func rect(from image: UIImage, x: Int, y: Int, w: Int, h: Int) -> UIImage? {
        guard let cg = image.cgImage else { return nil }
        let s = image.scale
        let r = CGRect(x: CGFloat(x) * s, y: CGFloat(y) * s, width: CGFloat(w) * s, height: CGFloat(h) * s)
        guard let cropped = cg.cropping(to: r) else { return nil }
        return UIImage(cgImage: cropped, scale: s, orientation: .up)
    }

    static func cell(from image: UIImage, x: Int, y: Int, size: Int) -> UIImage? {
        rect(from: image, x: x, y: y, w: size, h: size)
    }

    /// Draws `over` on top of `base` (both assumed same size). Used for orb + state overlays.
    static func composite(base: UIImage, over: UIImage) -> UIImage {
        UIGraphicsImageRenderer(size: base.size).image { _ in
            base.draw(in: CGRect(origin: .zero, size: base.size))
            over.draw(in: CGRect(origin: .zero, size: base.size))
        }
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
