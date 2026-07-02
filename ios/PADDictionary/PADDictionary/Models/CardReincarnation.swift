import Foundation

func isReincarnated(_ card: Card, cardsById: [Int: Card]) -> Bool {
    guard card.is8Latent == true, card.isUltEvo == false else { return false }
    let baseOrRoot = card.evoBaseId != 0 ? card.evoBaseId : card.evoRootId
    guard baseOrRoot != card.id else { return false }
    if card.awakenings.contains(49) {
        guard let baseCard = cardsById[card.evoBaseId] else { return false }
        return isReincarnated(baseCard, cardsById: cardsById)
    }
    return true
}
