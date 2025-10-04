import { combatHandler, playerRepository } from "../container";
import { createItemToolInstance } from "../tools";

// Equipped Item Handler
playerRepository.Added.Connect((playerState) => {
    playerState.inventoryState.Changed.Connect(() => {
        const character = playerState.player.Character;
        if (!character) {
            warn(`[Inventory] Unable to sync tools for ${playerState.player.Name}: no character`);
            return;
        }

        const item = playerState.inventoryState.getEquippedItem();
        if (!item) {
            for (const child of character.GetChildren()) {
                if (child.IsA("Tool")) {
                    child.Destroy();
                }
            }
            return;
        }

        let alreadyEquipped = false;
        for (const child of character.GetChildren()) {
            if (!child.IsA("Tool")) {
                continue;
            }

            if (child.GetAttribute("uuid") === item.uuid) {
                alreadyEquipped = true;
                continue;
            }

            child.Destroy();
        }

        if (alreadyEquipped) {
            return;
        }

        const tool = createItemToolInstance(item, combatHandler);
        if (!tool) {
            warn(`[Inventory] Failed to create tool instance for ${item.id}`);
            return;
        }

        combatHandler.register(tool);
        tool.Parent = character;
    });
});
