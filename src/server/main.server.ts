import { Players } from "@rbxts/services";
import "./network/handlers";
import "./profiles";

Players.PlayerAdded.Connect((player) => {
	print(`Player ${player.Name} joined the game!`);
});

print("Server started!");
