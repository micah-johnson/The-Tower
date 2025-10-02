import { Players, Workspace } from "@rbxts/services";
import "./network/handlers";
import "./profiles";
import { toolRegistry } from "./tools";
import { playerRepository } from "./player/repository";
import { Attribute } from "../shared/items";

import "./inventory/handler"

// Handle Player Loaded
playerRepository.Added.Connect(playerState => {
	// Health Listener
	playerState.Changed.Connect(() => {
		print(playerState.getAttributeValue(Attribute.HEALTH))

		const humanoid = playerState.player.Character?.FindFirstChild("Humanoid") as Humanoid | undefined

		if (!humanoid) return;
		

		const health = playerState.getAttributeValue(Attribute.HEALTH)

		if (humanoid.MaxHealth !== health) {
			humanoid.MaxHealth = health
			humanoid.Health = math.min(humanoid.Health, humanoid.MaxHealth)
		}
	})
})

Workspace.ChildAdded.Connect(child => {
	if (child.IsA("Tool")) {
		const uuid = child.GetAttribute("uuid") as string | undefined

		if (!uuid) return;

		const handle = child.FindFirstChild("Handle")

		if (!handle) return;

		const prompt = new Instance("ProximityPrompt")

		prompt.ActionText = "Pickup"
		prompt.KeyboardKeyCode = Enum.KeyCode.E
		prompt.Triggered.Connect(player => {
			const inv = playerRepository.getByPlayer(player)?.inventoryState
	
			if (!inv) return
	
			const item = toolRegistry.get(uuid)

			if (!item) return;

			child.Destroy()
	
			inv.addItem(item)
		})

		prompt.Parent = handle

		const touchInterest = handle.FindFirstChild("TouchInterest")

		if (touchInterest) touchInterest.Destroy()
	}
})

print("Server started!");
