import { CombatState } from "../combat";
import { InventoryState } from "../inventory";
import { Attribute, AttributeModifier } from "../items";
import { itemRepository } from "../items/repository";
import { State } from "../state";

// Shared Player Class
export abstract class PlayerState<C extends CombatState, I extends InventoryState> extends State {
    readonly combatState: C
    readonly inventoryState: I
    
    protected readonly attributes = new Map<Attribute, number>()

    constructor(combatState: C, inventory: I) {
        super()

        this.combatState = combatState
        this.inventoryState = inventory

        this.addDependency(this.inventoryState)
    }

    getAttributeValue(attr: Attribute) {
        let value = 0;
        
        const equippedItem = this.inventoryState.getEquippedItem()

        const attributes = [
            ...DEFAULT_ATTR, 
            ...(equippedItem?.attr ?? []),
            ...(equippedItem ? itemRepository.get(equippedItem.id)?.attr ?? [] : [])
        ].filter(mod => mod.attribute === attr)

        if (attributes.some(mod => mod.type === "absolute")) {
            attributes.filter(mod => mod.type === "absolute").forEach(mod => {
                value = mod.value
            })
        } else {
            // Apply additive modifiers
            attributes.filter(mod => mod.type === "additive").forEach(mod => {
                value += mod.value
            })

            // Apply multiplicative modifiers
            attributes.filter(mod => mod.type === "multiplicative").forEach(mod => {
                value *= mod.value
            })
        }

        return value
    }
}

// Default Attribute Modifiers
export const DEFAULT_ATTR: AttributeModifier[] = [{
    attribute: Attribute.HEALTH,
    type: "additive",
    value: 100
}]