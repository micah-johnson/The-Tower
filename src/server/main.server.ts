import { Players } from "@rbxts/services";

Players.PlayerAdded.Connect((player) => {
	print(`Player ${player.Name} joined the game!`);
});

print("Server started!");