import React from "@rbxts/react";
import { ItemInstance } from "../../../../../../shared/items";
import { Slot } from "../../../../components/Slot";
import { useInventoryVersion } from "../../../../../hooks/inventory";

// const EquipItemEvent = folder.WaitForChild("EquipItem") as RemoteEvent;

const keyMap: Partial<Record<number, Enum.KeyCode>> = {
    1: Enum.KeyCode.One,
    2: Enum.KeyCode.Two,
    3: Enum.KeyCode.Three,
    4: Enum.KeyCode.Four,
    5: Enum.KeyCode.Five,
    6: Enum.KeyCode.Six,
    7: Enum.KeyCode.Seven,
    8: Enum.KeyCode.Eight,
    9: Enum.KeyCode.Nine,
    0: Enum.KeyCode.Zero,
};

export function HotbarSlot(props: {
    num: number,
    selected: boolean,
    item?: ItemInstance,
    onSelected: () => void
}) {
    // Listen to inventory changes
    useInventoryVersion();

    return (
        <Slot id={`hotbar_${props.num}`} keybind={keyMap[props.num]} selected={props.selected} onActivated={props.onSelected} />
    )
}