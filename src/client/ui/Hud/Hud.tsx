import React from "@rbxts/react";
import { Health } from "./components/Health";
import { Hotbar } from "./components/Hotbar";
import { Crosshair } from "./components/Crosshair";

export function Hud() {
    return (
        <>
            <Crosshair />
            <Hotbar />
            <Health />
        </>
    )
}
