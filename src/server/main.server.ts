import { Players, Workspace } from "@rbxts/services";
import "./network/handlers";
import "./profiles";
import { toolRegistry } from "./tools";
import { playerInventories } from "./inventory/service";

Players.PlayerAdded.Connect((player) => {
	print(`Player ${player.Name} joined the game!`);
});

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
			const inv = playerInventories.get(player.UserId)
	
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
