import React from "@rbxts/react";
import { createRoot } from "@rbxts/react-roblox";
import { Players, RunService, StarterGui } from "@rbxts/services";
import App from "./ui/App";

const IS_STUDIO = RunService.IsStudio();

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

const host = new Instance("Folder")
host.Name = "Root"
host.Parent = playerGui

const root = createRoot(host);

function disableCoreGUIs() {
    StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false);
}

root.render(<App />)
disableCoreGUIs()

print("Client started!");