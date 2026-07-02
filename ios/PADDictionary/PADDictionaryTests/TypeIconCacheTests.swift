import XCTest
@testable import PADDictionary

final class TypeIconCacheTests: XCTestCase {
    // A single real 32x32 WebP icon extracted from the production images/icon-type.svg (type-5, God).
    private let sampleWebpBase64 = "UklGRr4DAABXRUJQVlA4TLEDAAAvH8AHEB/FkJEkQaXQCof9TscyEH8QCNlIUhVG4aCe9p1WwSDbSFWYwmO/5Ck4pG1biLbCVYgl2xRSCKEQ5iCMgKB4EDMAf4TwINwIIXkDLjmxQIxCDMwgAgnECIIRw3AkMGJIAhEMPoEjEIMERpAgmGFghgMxFCQYJBgKGQ6Yh8wwRiLIr2PQgD0swyDDUJBMMBzDwCARsGBw/hyJwZgBEUtumWAogrwP8CH6ITQbw2B2bu97uGHC/WOgsG3/0rb6Mx9sdUuF8s9YSTd28k/dvc2Zu1s11eTUm5XUNTp3375pSnKdj/D+IvpPNmmTtHvuYHj/+tPHNCYojZ9ev2MA3n6MT11K9fLk5TQNU/EPbxjeJb6rUhqVcZLSWLoXf8dex9VMkcbmb81IY35J/BV7OVXcDtEOiKZmgUcxv0B7k62jvbl84iVLjJviulcAJvx9j/aJfH3+qj8C6LsGTCRYYkaYZ5b9vc2kIbpPRIRlrZl6fft6hZhJsM8k8Lcqtk9R18UYAIDG9fA+xerzBWY/sy8zbmEWW9Hx6uL6izXnfqLmYn1x9Xh4v/y3cE9+SWK6hdagStBys1SdSM3J1WRJbdDcMA+YNQGXklF5cdoKjI1fGR8LLNPFygzZ5Tbx6IDfnmt1xrWIVZOrSABAuVVW+FqF55rnd5KvjzzWf3mN4ciYklGskUFUnCFfjYS9+WNW3cOvjGYD4Yv5VRELfm9Ts0dQc5PXbyFcm/9vODD3la1NWwiYGfqYFaaIBQARIgT0DFfAwvQa2/VbIctvKlJu7cWxAKaBsYs1ZZJs+g56dtl8Y2iaAF+DniFByc4iBSC13hfCNKFxni26RkPTRFhByFucT0RUjOkV2Fp8+gJbO18+bdNHKzcMAPCuENlKoP5aY3RL1leDL4hGvHX4ZQAubx1GXhAFVyulm2ts/QGX1ZHkAF9lsQGQ61HQlqHLxbfW2fotDjnv8Ubw8Y0gDA4YS8Ebj4Mbj3Nljp51tnObAwo1byz1mMMtHBDDZu/QBikyTwcKpLNDG/ddxAGiextDJGXwA3bY9m0nB+CQ8p5sPoWDO/Pvbw4WS3m2mO7tJA4OACTnD2z9cnD6vTVYLDt4Ks8HucMJgJOsbf22UZG802b/M3Zhs63IQUTkJNltkJN4q0xOW0mhe/MfdrR/q5Pbl6/kO4jylQL7edtW/yl28vTtzR/9dls7+wFqTan4sdmfeYLhuKR13E7xLhHhTkpElyEdYwBOHj186P95+MhJBgAA"

    private func sampleSvg() -> String {
        """
        <svg height="480" xmlns="http://www.w3.org/2000/svg">
        \t<symbol id="type-5" viewBox="0 0 32 32">
        \t\t<image width="32" height="32" href="data:image/webp;base64,\(sampleWebpBase64)"/>
        \t</symbol>
        \t<symbol id="type-12" viewBox="0 0 32 32">
        \t\t<image width="32" height="32" href="data:image/webp;base64,\(sampleWebpBase64)"/>
        \t</symbol>
        </svg>
        """
    }

    func testParseExtractsEveryTypeSymbol() {
        let icons = TypeIconCache.parse(sampleSvg())
        XCTAssertEqual(Set(icons.keys), [5, 12])
    }

    func testParseDecodesARealImage() {
        let icons = TypeIconCache.parse(sampleSvg())
        let image = icons[5]
        XCTAssertNotNil(image)
        XCTAssertEqual(image?.size.width, 32)
        XCTAssertEqual(image?.size.height, 32)
    }

    func testParseReturnsEmptyForMalformedContent() {
        XCTAssertTrue(TypeIconCache.parse("not an svg at all").isEmpty)
    }
}
