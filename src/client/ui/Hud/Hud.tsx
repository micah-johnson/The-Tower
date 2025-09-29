import React from "@rbxts/react";
import { Health } from "./components/Health";
import { Hotbar } from "./components/Hotbar/Hotbar";

export function Hud() {
    return (
        <>
            <Hotbar />
            <Health />
        </>
    )
}