import React from "@rbxts/react";
import { createRoot } from "@rbxts/react-roblox";
import { Players, RunService, StarterGui } from "@rbxts/services";
import "./network/handlers";
import "../shared/items/enchants/register";
import App from "./ui/App";
import { setupKeybinds } from "./keybinds";
import { setupEffects } from "./effects";

const IS_STUDIO = RunService.IsStudio();

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

const root = createRoot(playerGui);

function main() {
    // Render main app UI
    root.render(<App />)
    // Disable all core GUIs
    StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.All, false);
    // Setup any visual effects
    setupEffects()
    // Setup any keybinds
    setupKeybinds()
}

main()
print("[The Tower] Client started!");