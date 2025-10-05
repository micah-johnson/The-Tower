import React from "@rbxts/react";
import { createRoot } from "@rbxts/react-roblox";
import { Players, RunService, StarterGui } from "@rbxts/services";
import "./network/handlers";
import "../shared/items/enchants/register";
import App from "./ui/App";
import { setupKeybinds } from "./keybinds";

const IS_STUDIO = RunService.IsStudio();

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

const root = createRoot(playerGui);

function disableCoreGUIs() {
    StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false);
}

setupKeybinds()
root.render(<App />)
disableCoreGUIs()

print("[The Tower] Client started!");
