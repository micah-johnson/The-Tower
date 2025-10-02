import { combatHandler, playerRepository } from "../container";
import { createItemToolInstance } from "../tools";

// Equipped Item Handler
playerRepository.Added.Connect(player => {
    player.inventoryState.Changed.Connect(() => {
        print("Changed!!")
        if (!player.player.Character) {
            return {
                ok: false,
                error: "Player character does not exist."
            }
        }

        const item = player.inventoryState.getEquippedItem()

        print(item)

        if (!item) {
            // Unequip all tools
            for (const child of player.player.Character.GetChildren()) {
                if (child.IsA("Tool")) {
                    child.Destroy()
                }
            }

            return {
                ok: true
            }
        }

        const tool = createItemToolInstance(item, combatHandler)

        if (!tool) {
            return {
                ok: false,
                error: "Unable to create tool instance."
            }
        }

        combatHandler.register(tool)

        // Handle equipped tools
        for (const child of player.player.Character.GetChildren()) {
            if (child.IsA("Tool")) {
                if (child.GetAttribute("uuid") === item.uuid) { // If tool already equipped, return
                    return {
                        ok: true
                    }
                }

                child.Destroy() // Otherwise destroy equipped tool
            }
        }

        tool.Parent = player.player.Character
    })
})
