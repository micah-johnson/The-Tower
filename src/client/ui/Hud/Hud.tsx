import React from "@rbxts/react";
import { Health } from "./components/Health";
import { Hotbar } from "./components/Hotbar";
import { MovementSpeed } from "./components/MovementSpeed";

export function Hud() {
    return (
        <>
            <Hotbar />
            <Health />
            <MovementSpeed />
        </>
    )
}
