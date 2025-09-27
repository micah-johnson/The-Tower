import React from "@rbxts/react";
import { createPortal, createRoot } from "@rbxts/react-roblox";
import { Players } from "@rbxts/services";
import App from "./components/App";

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

const root = createRoot(new Instance("Folder"));

root.render(createPortal(<App />, playerGui));

print("Client started!");