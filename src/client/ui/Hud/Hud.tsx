import React from "@rbxts/react";
import { Health } from "./components/Health";
import { Hotbar } from "./components/Hotbar";
import { Crosshair } from "./components/Crosshair";
import { MovementSpeed } from "./components/MovementSpeed";

export function Hud() {
    return (
        <>
            <Crosshair />
            <Hotbar />
            <Health />
            <MovementSpeed />
        </>
    )
}
