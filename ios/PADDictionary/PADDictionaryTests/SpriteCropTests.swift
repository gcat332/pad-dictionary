import XCTest
import UIKit
@testable import PADDictionary

final class SpriteCropTests: XCTestCase {
    // Build a 72x72 (scale 1) image: top-left red, bottom-right blue.
    private func makeSheet() -> UIImage {
        let fmt = UIGraphicsImageRendererFormat.default(); fmt.scale = 1
        return UIGraphicsImageRenderer(size: CGSize(width: 72, height: 72), format: fmt).image { ctx in
            UIColor.red.setFill();  ctx.fill(CGRect(x: 0,  y: 0,  width: 36, height: 36))
            UIColor.blue.setFill(); ctx.fill(CGRect(x: 36, y: 36, width: 36, height: 36))
        }
    }

    private func centerColor(_ img: UIImage) -> UIColor {
        let px = UIGraphicsImageRenderer(size: CGSize(width: 1, height: 1)).image { _ in
            img.draw(in: CGRect(x: -img.size.width/2 + 0.5, y: -img.size.height/2 + 0.5,
                                width: img.size.width, height: img.size.height))
        }
        var d = [UInt8](repeating: 0, count: 4)
        let cs = CGColorSpaceCreateDeviceRGB()
        let c = CGContext(data: &d, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4,
                          space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        c.draw(px.cgImage!, in: CGRect(x: 0, y: 0, width: 1, height: 1))
        return UIColor(red: CGFloat(d[0])/255, green: CGFloat(d[1])/255, blue: CGFloat(d[2])/255, alpha: 1)
    }

    func testCropTopLeftCell() throws {
        let cell = try XCTUnwrap(SpriteCrop.cell(from: makeSheet(), x: 0, y: 0, size: 36))
        XCTAssertEqual(cell.size, CGSize(width: 36, height: 36))
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        centerColor(cell).getRed(&r, green: &g, blue: &b, alpha: &a)
        XCTAssertGreaterThan(r, 0.8); XCTAssertLessThan(b, 0.2)   // red cell
    }

    func testCropBottomRightCell() throws {
        let cell = try XCTUnwrap(SpriteCrop.cell(from: makeSheet(), x: 36, y: 36, size: 36))
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        centerColor(cell).getRed(&r, green: &g, blue: &b, alpha: &a)
        XCTAssertGreaterThan(b, 0.8); XCTAssertLessThan(r, 0.2)   // blue cell
    }

    func testResizedToHeightKeepsAspect() {
        let img = makeSheet().resized(toHeight: 18)
        XCTAssertEqual(img.size.height, 18, accuracy: 0.01)
        XCTAssertEqual(img.size.width, 18, accuracy: 0.01)       // square sheet stays square
    }
}
