import React, { useEffect, useRef } from "@rbxts/react";
import { ItemInstance } from "../../../../../../shared/items";
import { EquipItemPacket, MoveItemPacket, MoveItemResponse, PacketClass, PacketDirection } from "../../../../../../shared/network";
import { Slot } from "../../../../components/Slot";
import { useInventoryVersion } from "../../../../../hooks/inventory";
import { inventoryManager } from "../../../../../inventory/manager";
import { ClientNet } from "../../../../../network";

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
    onSelected: () => void;
    onDragStart: (slotId: string, item: ItemInstance, pointerPosition: Vector2, frame: Frame) => void;
    registerSlot: (slotId: string, frame: Frame) => void;
    unregisterSlot: (slotId: string) => void;
    isDragging: boolean;
}) {
    // Listen to inventory changes
    useInventoryVersion();

    const slotId = `hotbar_${props.num}`;
    const frameRef = useRef<Frame>();

    useEffect(() => {
        const frame = frameRef.current;
        if (!frame) {
            return;
        }

        props.registerSlot(slotId, frame);
        return () => props.unregisterSlot(slotId);
    }, []);

    const handleActivated = () => {
        if (props.isDragging) {
            return;
        }

        props.onSelected();
    };

    const handleInputBegan = (input: InputObject) => {
        if (input.UserInputType !== Enum.UserInputType.MouseButton1) {
            return;
        }

        print(`[HotbarSlot] InputBegan ${slotId}`);
        if (props.isDragging) {
            return;
        }

        const frame = frameRef.current;
        if (!frame) {
            warn(`[HotbarSlot] no frame ref for ${slotId}`);
            return;
        }

        const item = inventoryManager.getItemInSlot(slotId);
        if (!item) {
            warn(`[HotbarSlot] no item in ${slotId} for drag`);
            return;
        }

        const pointerPosition = new Vector2(input.Position.X, input.Position.Y);
        props.onDragStart(slotId, item, pointerPosition, frame);
    };

    const handleMouseDown = (position: Vector2) => {
        const frame = frameRef.current;
        if (!frame) {
            return;
        }

        const item = inventoryManager.getItemInSlot(slotId);
        if (!item) {
            return;
        }

        props.onDragStart(slotId, item, position, frame);
    };

    return (
        <Slot
            id={slotId}
            keybind={keyMap[props.num]}
            selected={props.selected}
            onActivated={handleActivated}
            onInputBegan={handleInputBegan}
            onMouseDown={handleMouseDown}
            forwardRef={frameRef}
        />
    )
}
