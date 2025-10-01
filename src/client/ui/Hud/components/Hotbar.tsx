import { useRef, useState } from "@rbxts/react";
import React from "@rbxts/react";
import { Slot } from "../../components/Slot";
import { HOTBAR_SLOTS } from "../../../../shared/items/util";
import { useInventoryVersion } from "../../../hooks/inventory";

interface DragState {
    originSlot: string;
    itemUuid: string;
}

const keyMap: Record<string, Enum.KeyCode> = {
    "hotbar_1": Enum.KeyCode.One,
    "hotbar_2": Enum.KeyCode.Two,
    "hotbar_3": Enum.KeyCode.Three,
    "hotbar_4": Enum.KeyCode.Four,
    "hotbar_5": Enum.KeyCode.Five,
    "hotbar_6": Enum.KeyCode.Six,
    "hotbar_7": Enum.KeyCode.Seven,
    "hotbar_8": Enum.KeyCode.Eight,
    "hotbar_9": Enum.KeyCode.Nine,
    "hotbar_0": Enum.KeyCode.Zero,
};

export function Hotbar() {
    useInventoryVersion()

    return (
        <frame
            key={"Hotbar"}
            AnchorPoint={new Vector2(0.5, 1)}
            Position={UDim2.fromScale(0.5, 1).add(UDim2.fromOffset(0, -5))}
            Size={UDim2.fromOffset(0, 0)}
            AutomaticSize={Enum.AutomaticSize.XY}
            BackgroundTransparency={0}
            BackgroundColor3={Color3.fromHex("#171717")}
        >
            <uicorner CornerRadius={new UDim(0,3)}/>
            <uistroke Color={Color3.fromHex("#f5f5f5")} />
            <uipadding PaddingTop={new UDim(0,3)} PaddingBottom={new UDim(0,3)} PaddingLeft={new UDim(0,3)} PaddingRight={new UDim(0,3)} />
            <frame
                BackgroundTransparency={1}
                AutomaticSize={Enum.AutomaticSize.XY}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Horizontal}
                    HorizontalAlignment={Enum.HorizontalAlignment.Center}
                    HorizontalFlex={"SpaceBetween"}
                    SortOrder={"LayoutOrder"}
                    Padding={new UDim(0,5)}
                />

                {HOTBAR_SLOTS.map((slot) => (
                    <Slot
                        slotId={slot}
                        keybind={keyMap[slot]}
                    />
                ))}
            </frame>
        </frame>
    )
}