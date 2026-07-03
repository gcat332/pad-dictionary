# Skill-text Inline Icons + Attribute Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render `{Token}` markup in skill descriptions as small inline icons (orb / gimmick-orb / type / awoken), and replace the color-dot attribute selector in the filter with attribute orb images.

**Architecture:** Pure tokenizer + resolver map `{Token}` → an icon kind; an image producer crops the needed cell from an existing sprite sheet (`icon-orbs.png` new, `awoken.png` / `icon-type.svg` existing) and resizes it; a SwiftUI `SkillTextView` builds one wrapping `Text` by concatenating text runs with `Text(Image(uiImage:))` icon runs. Unmatched tokens fall back to plain text (braces stripped). One new sprite sheet (`icon-orbs.png`) is vendored through the existing `update-data.sh` + `GitHubSyncService` sync path.

**Tech Stack:** Swift / SwiftUI, XCTest. Xcode project uses `PBXFileSystemSynchronizedRootGroup` — new `.swift` files under the target folder are auto-compiled, **no `.pbxproj` edits needed**.

## Global Constraints

- Platform: iOS SwiftUI app only. Do **not** touch the web viewer (`dict.js` / `dict.css`).
- Sprite geometry (verified): `icon-orbs.png` = 72×360, **36px cells**, 2 cols × 10 rows. `awoken.png` = 32px cells, column 0, row = awakening id. Attribute/orb index order: `0 Fire, 1 Water, 2 Wood, 3 Light, 4 Dark, 5 Heal, 6 Jammers, 7 Poison, 8 Lethal Poison, 9 Bombs`.
- Orb token → (col,row) in `icon-orbs.png`: `Fire(0,0) Water(0,1) Wood(0,2) Light(0,3) Dark(0,4) Heal(0,5) Jammers(0,6) Poison(0,7) "Lethal Poison"(0,8) Bombs(0,9) locks(1,1)`.
- Type token → id: `Balanced 1, Physical 2, Healer 3, Dragon 4, God 5, Attacker 6, Devil 7, Machine 8, "Enhance Material" 14`.
- The 18 unmatched tokens (`Combo`, `* Surge`, `Change Sub Attribute: *`, etc.) render as plain text with braces stripped. No alias map.
- Sprites load from the app Documents dir via `SpriteSheetCache.shared.image(relativePath:)`; the app must have run a data sync first (icons show a text fallback until then — same as existing awoken/type icons).
- Test command (adjust simulator name if needed):
  ```
  xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:PADDictionaryTests/<TestClass> 2>&1 | tail -30
  ```
- Commit after each task.

---

## File Structure

- **Create** `ios/PADDictionary/PADDictionary/Models/SkillTextTokenizer.swift` — pure tokenizer (`SkillTextRun`) + resolver (`SkillTokenKind`, `SkillToken.resolve`). No UIKit.
- **Create** `ios/PADDictionary/PADDictionary/Sprites/SpriteCrop.swift` — pure cell-crop helper + `UIImage.resized(toHeight:)`.
- **Create** `ios/PADDictionary/PADDictionary/Sprites/SkillTokenImage.swift` — token name → resized `UIImage` (cached), wiring resolver to sheets.
- **Create** `ios/PADDictionary/PADDictionary/Sprites/OrbIconSprite.swift` — SwiftUI view cropping one `icon-orbs.png` cell (used by filter attribute buttons).
- **Create** `ios/PADDictionary/PADDictionary/Views/SkillTextView.swift` — SwiftUI view building the inline-icon `Text`.
- **Modify** `ios/PADDictionary/PADDictionary/Sprites/AwakeningNames.swift` — add reverse lookup `id(forName:)`.
- **Modify** `ios/PADDictionary/PADDictionary/Views/CardDetailView.swift:163` — use `SkillTextView`.
- **Modify** `ios/PADDictionary/PADDictionary/Views/FilterView.swift:209` — use `OrbIconSprite`.
- **Modify** `update-data.sh` — add `icon-orbs.png` to sparse patterns + copy step.
- **Modify** `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift:59-62` — add `icon-orbs.png` to `fixedImageFiles`.
- **Create** `ios/PADDictionary/PADDictionaryTests/SkillTextTokenizerTests.swift`
- **Create** `ios/PADDictionary/PADDictionaryTests/SpriteCropTests.swift`

---

## Task 1: Vendor `icon-orbs.png` + wire it into the sync path

**Files:**
- Modify: `update-data.sh`
- Modify: `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift:59-62`
- Adds: `images/icon-orbs.png` (fetched from upstream)

**Interfaces:**
- Produces: the file `images/icon-orbs.png` present in the repo, and downloaded to the app Documents dir on sync. Consumed by Tasks 3–5 via `SpriteSheetCache.shared.image(relativePath: "images/icon-orbs.png")`.

- [ ] **Step 1: Add `icon-orbs.png` to the sparse-checkout patterns in `update-data.sh`**

Find this line:
```bash
$DATA_ONLY || patterns+=(/images/cards_ja /images/awoken.png /images/icon-type.svg /images/CARDFRAME2.png /images/CARDFRAMEW.png)
```
Replace with:
```bash
$DATA_ONLY || patterns+=(/images/cards_ja /images/awoken.png /images/icon-orbs.png /images/icon-type.svg /images/CARDFRAME2.png /images/CARDFRAMEW.png)
```

- [ ] **Step 2: Add the copy step in `update-data.sh`**

Find:
```bash
  cp "$TMP/images/awoken.png"     images/awoken.png      # awakening icons (32px cells, ids 0–143)
```
Add immediately below it:
```bash
  cp "$TMP/images/icon-orbs.png"  images/icon-orbs.png   # orb + gimmick-orb icons (36px cells, 2x10; col0 rows0-9 = attr 0-9)
```

- [ ] **Step 3: Fetch the file**

Run:
```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
curl -sL "https://raw.githubusercontent.com/Mapaler/PADDashFormation/master/images/icon-orbs.png" -o images/icon-orbs.png
sips -g pixelWidth -g pixelHeight images/icon-orbs.png
```
Expected: `pixelWidth: 72`, `pixelHeight: 360`.

- [ ] **Step 4: Add `icon-orbs.png` to `GitHubSyncService.fixedImageFiles`**

In `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift`, change:
```swift
    private static let fixedImageFiles = [
        "images/awoken.png", "images/icon-type.svg",
        "images/CARDFRAME2.png", "images/CARDFRAMEW.png"
    ]
```
to:
```swift
    private static let fixedImageFiles = [
        "images/awoken.png", "images/icon-orbs.png", "images/icon-type.svg",
        "images/CARDFRAME2.png", "images/CARDFRAMEW.png"
    ]
```

- [ ] **Step 5: Verify**

Run:
```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
test -f images/icon-orbs.png && echo "asset present"
grep -c 'icon-orbs.png' update-data.sh ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift
```
Expected: `asset present`, and each file reports `2` and `1` hits respectively.

- [ ] **Step 6: Commit**

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
git add images/icon-orbs.png update-data.sh ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift
git commit -m "Vendor icon-orbs.png sprite sheet + wire into data sync"
```

---

## Task 2: Tokenizer + resolver (pure logic) + awoken reverse lookup

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/SkillTextTokenizer.swift`
- Modify: `ios/PADDictionary/PADDictionary/Sprites/AwakeningNames.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/SkillTextTokenizerTests.swift`

**Interfaces:**
- Produces:
  - `enum SkillTextRun: Equatable { case text(String); case token(String) }`
  - `enum SkillTextTokenizer { static func parse(_ s: String) -> [SkillTextRun] }`
  - `enum SkillTokenKind: Equatable { case orb(col: Int, row: Int); case type(Int); case awoken(Int) }`
  - `enum SkillToken { static func resolve(_ name: String) -> SkillTokenKind? }`
  - `AwakeningNames.id(forName name: String) -> Int?`
- Consumed by: Task 3 (`SkillTokenImage`) and Task 4 (`SkillTextView`).

- [ ] **Step 1: Add the awoken reverse lookup to `AwakeningNames.swift`**

The existing `names` is `[String: String]` = `[idString: name]`. Add after the `names` property:
```swift
    private static let idByName: [String: Int] = {
        var map: [String: Int] = [:]
        for (idStr, name) in names { if let id = Int(idStr) { map[name] = id } }
        return map
    }()

    /// Reverse of `name(for:)`: awakening name → id (exact match), or nil.
    static func id(forName name: String) -> Int? { idByName[name] }
```

- [ ] **Step 2: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/SkillTextTokenizerTests.swift`:
```swift
import XCTest
@testable import PADDictionary

final class SkillTextTokenizerTests: XCTestCase {
    func testParseSplitsTextAndTokens() {
        let runs = SkillTextTokenizer.parse("Deal {Fire} damage {Two-Pronged Attack}!")
        XCTAssertEqual(runs, [
            .text("Deal "), .token("Fire"), .text(" damage "),
            .token("Two-Pronged Attack"), .text("!"),
        ])
    }

    func testParsePlainTextHasNoTokens() {
        XCTAssertEqual(SkillTextTokenizer.parse("no tokens here"), [.text("no tokens here")])
    }

    func testResolveOrb() {
        XCTAssertEqual(SkillToken.resolve("Fire"), .orb(col: 0, row: 0))
        XCTAssertEqual(SkillToken.resolve("Bombs"), .orb(col: 0, row: 9))
        XCTAssertEqual(SkillToken.resolve("Lethal Poison"), .orb(col: 0, row: 8))
        XCTAssertEqual(SkillToken.resolve("locks"), .orb(col: 1, row: 1))
    }

    func testResolveType() {
        XCTAssertEqual(SkillToken.resolve("Devil"), .type(7))
        XCTAssertEqual(SkillToken.resolve("Enhance Material"), .type(14))
    }

    func testResolveAwoken() {
        // "Two-Pronged Attack" is a known awakening name in awoken_names.json
        guard let id = AwakeningNames.id(forName: "Two-Pronged Attack") else {
            return XCTFail("expected a known awakening id")
        }
        XCTAssertEqual(SkillToken.resolve("Two-Pronged Attack"), .awoken(id))
    }

    func testResolveUnknownReturnsNil() {
        XCTAssertNil(SkillToken.resolve("Change Sub Attribute: Light"))
        XCTAssertNil(SkillToken.resolve("Combo"))
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run:
```
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:PADDictionaryTests/SkillTextTokenizerTests 2>&1 | tail -30
```
Expected: FAIL — `cannot find 'SkillTextTokenizer' in scope` (and `SkillToken`).

- [ ] **Step 4: Write the implementation**

Create `ios/PADDictionary/PADDictionary/Models/SkillTextTokenizer.swift`:
```swift
import Foundation

/// One segment of a skill description: literal text, or a `{Token}` name (braces stripped).
enum SkillTextRun: Equatable {
    case text(String)
    case token(String)
}

enum SkillTextTokenizer {
    // Matches `{...}` with no nested braces. Splits the string into ordered text/token runs.
    private static let regex = try! NSRegularExpression(pattern: #"\{([^}]+)\}"#)

    static func parse(_ s: String) -> [SkillTextRun] {
        let ns = s as NSString
        var runs: [SkillTextRun] = []
        var cursor = 0
        for m in regex.matches(in: s, range: NSRange(location: 0, length: ns.length)) {
            if m.range.location > cursor {
                runs.append(.text(ns.substring(with: NSRange(location: cursor, length: m.range.location - cursor))))
            }
            runs.append(.token(ns.substring(with: m.range(at: 1))))
            cursor = m.range.location + m.range.length
        }
        if cursor < ns.length {
            runs.append(.text(ns.substring(from: cursor)))
        }
        return runs
    }
}

/// What kind of icon a `{Token}` maps to. `orb` col/row index into `icon-orbs.png` (36px cells).
enum SkillTokenKind: Equatable {
    case orb(col: Int, row: Int)
    case type(Int)
    case awoken(Int)
}

enum SkillToken {
    // col 0 rows 0-9 = attr 0-9; `locks` is the lock state overlay at col 1 row 1.
    private static let orbs: [String: (col: Int, row: Int)] = [
        "Fire": (0, 0), "Water": (0, 1), "Wood": (0, 2), "Light": (0, 3), "Dark": (0, 4),
        "Heal": (0, 5), "Jammers": (0, 6), "Poison": (0, 7), "Lethal Poison": (0, 8),
        "Bombs": (0, 9), "locks": (1, 1),
    ]
    private static let types: [String: Int] = [
        "Balanced": 1, "Physical": 2, "Healer": 3, "Dragon": 4, "God": 5,
        "Attacker": 6, "Devil": 7, "Machine": 8, "Enhance Material": 14,
    ]

    static func resolve(_ name: String) -> SkillTokenKind? {
        if let o = orbs[name] { return .orb(col: o.col, row: o.row) }
        if let t = types[name] { return .type(t) }
        if let a = AwakeningNames.id(forName: name) { return .awoken(a) }
        return nil
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:
```
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:PADDictionaryTests/SkillTextTokenizerTests 2>&1 | tail -30
```
Expected: PASS (all 6 tests).

- [ ] **Step 6: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SkillTextTokenizer.swift \
        ios/PADDictionary/PADDictionary/Sprites/AwakeningNames.swift \
        ios/PADDictionary/PADDictionaryTests/SkillTextTokenizerTests.swift
git commit -m "Add skill-text tokenizer + token->icon resolver + awoken reverse lookup"
```

---

## Task 3: Sprite crop helper + token image producer + OrbIconSprite view

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Sprites/SpriteCrop.swift`
- Create: `ios/PADDictionary/PADDictionary/Sprites/SkillTokenImage.swift`
- Create: `ios/PADDictionary/PADDictionary/Sprites/OrbIconSprite.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/SpriteCropTests.swift`

**Interfaces:**
- Consumes: `SkillTokenKind` / `SkillToken.resolve` (Task 2), `AwakeningSprite.yOffset(forAwakeningId:) -> Double?`, `TypeIconCache.shared.icon(forType:) -> UIImage?`, `SpriteSheetCache.shared.image(relativePath:) -> UIImage?`.
- Produces:
  - `enum SpriteCrop { static func cell(from: UIImage, x: Int, y: Int, size: Int) -> UIImage? }`
  - `extension UIImage { func resized(toHeight: CGFloat) -> UIImage }`
  - `enum SkillTokenImage { static func image(for name: String, height: CGFloat) -> UIImage? }`
  - `struct OrbIconSprite: View { init(col: Int, row: Int, size: CGFloat = 20); init(attr: Int, size: CGFloat = 20) }`
- Consumed by: Task 4 (`SkillTextView` uses `SkillTokenImage`), Task 5 (`FilterView` uses `OrbIconSprite`).

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/SpriteCropTests.swift`:
```swift
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:PADDictionaryTests/SpriteCropTests 2>&1 | tail -30
```
Expected: FAIL — `cannot find 'SpriteCrop' in scope`.

- [ ] **Step 3: Write `SpriteCrop.swift`**

Create `ios/PADDictionary/PADDictionary/Sprites/SpriteCrop.swift`:
```swift
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
```

- [ ] **Step 4: Write `SkillTokenImage.swift`**

Create `ios/PADDictionary/PADDictionary/Sprites/SkillTokenImage.swift`:
```swift
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
```

- [ ] **Step 5: Write `OrbIconSprite.swift`**

Create `ios/PADDictionary/PADDictionary/Sprites/OrbIconSprite.swift`:
```swift
import SwiftUI

/// A single 36px cell from `icon-orbs.png`, rendered at `size`. Falls back to an empty
/// rounded rect if the sheet hasn't synced yet.
struct OrbIconSprite: View {
    let col: Int
    let row: Int
    var size: CGFloat = 20

    /// Convenience for attribute orbs (attr 0-4 -> col 0, rows 0-4).
    init(attr: Int, size: CGFloat = 20) { self.init(col: 0, row: attr, size: size) }
    init(col: Int, row: Int, size: CGFloat = 20) { self.col = col; self.row = row; self.size = size }

    var body: some View {
        if let sheet = SpriteSheetCache.shared.image(relativePath: "images/icon-orbs.png"),
           let cell = SpriteCrop.cell(from: sheet, x: col * 36, y: row * 36, size: 36) {
            Image(uiImage: cell).resizable().frame(width: size, height: size)
        } else {
            RoundedRectangle(cornerRadius: size * 0.2)
                .fill(Color.secondary.opacity(0.2))
                .frame(width: size, height: size)
        }
    }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:PADDictionaryTests/SpriteCropTests 2>&1 | tail -30
```
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Sprites/SpriteCrop.swift \
        ios/PADDictionary/PADDictionary/Sprites/SkillTokenImage.swift \
        ios/PADDictionary/PADDictionary/Sprites/OrbIconSprite.swift \
        ios/PADDictionary/PADDictionaryTests/SpriteCropTests.swift
git commit -m "Add sprite crop helper, skill-token image producer, and OrbIconSprite view"
```

---

## Task 4: `SkillTextView` + wire into card detail

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Views/SkillTextView.swift`
- Modify: `ios/PADDictionary/PADDictionary/Views/CardDetailView.swift` (the `Text(resolved.description)` at ~line 163)

**Interfaces:**
- Consumes: `SkillTextTokenizer.parse`, `SkillTextRun`, `SkillTokenImage.image(for:height:)`.
- Produces: `struct SkillTextView: View { init(_ text: String, fontSize: CGFloat = 13) }`.

- [ ] **Step 1: Write `SkillTextView.swift`**

Create `ios/PADDictionary/PADDictionary/Views/SkillTextView.swift`:
```swift
import SwiftUI

/// Renders a skill description, replacing `{Token}` markup with inline icons where one exists.
/// Unmatched tokens render as plain text (braces stripped). Builds a single `Text` so the
/// result flows and line-wraps naturally.
struct SkillTextView: View {
    let text: String
    var fontSize: CGFloat = 13

    init(_ text: String, fontSize: CGFloat = 13) {
        self.text = text
        self.fontSize = fontSize
    }

    var body: some View {
        content
            .font(.system(size: fontSize))
            .foregroundStyle(Color.padDesc)
    }

    private var content: Text {
        // Icon height tracks the font's cap height so glyphs and icons sit at the same scale.
        let iconHeight = fontSize + 2
        return SkillTextTokenizer.parse(text).reduce(Text("")) { acc, run in
            switch run {
            case .text(let s):
                return acc + Text(s)
            case .token(let name):
                if let icon = SkillTokenImage.image(for: name, height: iconHeight) {
                    // ponytail: -2 baseline nudge tuned by eye; adjust if icons ride high/low
                    return acc + Text(Image(uiImage: icon)).baselineOffset(-2)
                }
                return acc + Text(name)   // no icon -> plain text, braces already stripped
            }
        }
    }
}
```

- [ ] **Step 2: Wire it into `CardDetailView.swift`**

Find (around line 161-166):
```swift
            if let resolved, !resolved.description.isEmpty {
                HStack(alignment: .top, spacing: 6) {
                    Text(resolved.description)
                        .font(.system(size: 13))
                        .lineSpacing(3)
                        .foregroundStyle(Color.padDesc)
```
Replace the `Text(resolved.description) ... .foregroundStyle(Color.padDesc)` chain with:
```swift
            if let resolved, !resolved.description.isEmpty {
                HStack(alignment: .top, spacing: 6) {
                    SkillTextView(resolved.description)
                        .lineSpacing(3)
```
(Leave the surrounding `HStack`, the `translated` badge, and the `else` branch unchanged. `SkillTextView` already applies font + color.)

- [ ] **Step 3: Build to verify it compiles**

Run:
```
xcodebuild build -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' 2>&1 | tail -15
```
Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Run the app and verify icons render (manual, via /run or Xcode)**

Launch the app on the simulator, run a data sync (Sync tab) so `icon-orbs.png` downloads, open any card with orb-changing / awakening skills, and confirm `{Fire}`/`{Two-Pronged Attack}`/`{Devil}` show as inline icons and unknown tokens like `Combo` show as plain text without braces.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Views/SkillTextView.swift \
        ios/PADDictionary/PADDictionary/Views/CardDetailView.swift
git commit -m "Render skill-text {tokens} as inline icons in card detail"
```

---

## Task 5: Attribute images in the filter

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Views/FilterView.swift` (the `AttributeDotView(attr: value, size: 28)` at ~line 209)

**Interfaces:**
- Consumes: `OrbIconSprite(attr:size:)` (Task 3).

Note: `AttributeDotView` is also used in `CardDetailView.swift:31` for the card's own attribute dots — leave that usage unchanged (out of scope). Only the filter selector changes.

- [ ] **Step 1: Swap the swatch in `FilterView.swift`**

Find:
```swift
                        AttributeDotView(attr: value, size: 28)
```
Replace with:
```swift
                        OrbIconSprite(attr: value, size: 28)
```

- [ ] **Step 2: Build to verify it compiles**

Run:
```
xcodebuild build -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' 2>&1 | tail -15
```
Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 3: Run and verify (manual)**

Open the Filters sheet → Attr 1/2/3 sections now show the five attribute orb images instead of flat color dots; selecting one still toggles the filter (the selected-ring overlay still shows).

- [ ] **Step 4: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Views/FilterView.swift
git commit -m "Use attribute orb images in filter attribute selector"
```

---

## Self-Review

**Spec coverage:**
- Skill-text orb/gimmick-orb icons → Tasks 2 (resolve orb) + 3 (image) + 4 (render). ✓
- Skill-text type icons → Task 2 (type map) + 3 (`TypeIconCache`) + 4. ✓
- Skill-text awoken icons → Task 2 (`AwakeningNames.id(forName:)`) + 3 (crop `awoken.png`) + 4. ✓
- 18 unmatched → plain text via `resolve` returning nil → Task 4 fallback. ✓
- Filter attribute images → Task 5. ✓
- Asset vendored + synced → Task 1. ✓
- No web changes; no `.pbxproj` edits (synchronized groups). ✓

**Type consistency:** `SkillTextRun`, `SkillTokenKind`, `SkillToken.resolve`, `SkillTokenImage.image(for:height:)`, `OrbIconSprite(attr:size:)` / `(col:row:size:)`, `AwakeningNames.id(forName:)`, `SpriteCrop.cell(from:x:y:size:)`, `UIImage.resized(toHeight:)` — names match across tasks. ✓ `AwakeningSprite.yOffset` returns negative Double (`-32*id`); Task 3 negates it for the crop y. ✓

**Placeholder scan:** No TBD/TODO; every code step has full code. ✓
