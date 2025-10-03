import React, { useState } from "@rbxts/react";
import { Hud } from "./Hud/Hud";
import { ItemProvider } from "./context/ItemDraggingContext";
import { ItemDragGhost } from "./components/ItemDragGhost";
import { Inventory } from "./Inventory/Inventory";
import { Cursor } from "./Cursor/Cursor";

interface AppProps {}

function App({}: AppProps) {
	return (
		<screengui ResetOnSpawn={false} IgnoreGuiInset={true}>
			<Cursor />
			<ItemProvider>
				<ItemDragGhost />
				<Inventory />
				<Hud />
			</ItemProvider>
		</screengui>
	);
}

export default App;