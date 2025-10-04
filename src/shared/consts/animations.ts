import { ItemDef, ItemSubType, ItemType, SubTypeFor } from "../items";

export enum AnimationAction {
    IDLE,
    LMB,
    RMB
}

type AnimationDefinitions = {
  [T in ItemType]?: Partial<Record<string, Partial<Record<AnimationAction, string[]>>>>
};

export const ANIMATIONS: AnimationDefinitions = {
    [ItemType.WEAPON]: {
        [ItemSubType[ItemType.WEAPON].SWORD]: {
            [AnimationAction.LMB]: ["rbxassetid://118626485121462"],
            [AnimationAction.RMB]: ["rbxassetid://73420867539276"]
        }
    },
}

export function getAnimations(itemDef: ItemDef, action: AnimationAction) {
    if ("subtype" in itemDef) {
        return ANIMATIONS[itemDef.type]?.[itemDef.subtype as string]?.[action]
    }

    return 
}