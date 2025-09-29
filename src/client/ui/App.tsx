import React, { useState } from "@rbxts/react";
import { Hud } from "./Hud/Hud";

interface AppProps {}

function App({}: AppProps) {
	return (
		<screengui ResetOnSpawn={false} IgnoreGuiInset={true}>
			<Hud />
		</screengui>
	);
}

export default App;