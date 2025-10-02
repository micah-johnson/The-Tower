import { ItemDef, ItemSubType, ItemType, SubTypeFor } from "../items";

enum AnimationAction {
    IDLE,
    USE
}

type AnimationDefinitions = {
  [T in ItemType]?: Partial<Record<string, Partial<Record<AnimationAction, string[]>>>>
};

export const ANIMATIONS: AnimationDefinitions = {
    [ItemType.WEAPON]: {
        [ItemSubType[ItemType.WEAPON].SWORD]: {
            [AnimationAction.USE]: ["rbxassetid://118626485121462"]
        }
    },
}

export function getAnimations(itemDef: ItemDef, action: AnimationAction) {
    if ("subtype" in itemDef) {
        return ANIMATIONS[itemDef.type]?.[itemDef.subtype as string]?.[action]
    }

    return 
}