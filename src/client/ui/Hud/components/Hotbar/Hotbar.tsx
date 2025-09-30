import { useCallback, useEffect, useMemo, useRef, useState } from "@rbxts/react";
import React from "@rbxts/react";
import { createPortal } from "@rbxts/react-roblox";
import { GuiService, Players, UserInputService } from "@rbxts/services";
import { HotbarSlot } from "./components/HotbarSlot";
import { inventoryManager } from "../../../../inventory/manager";
import { itemRepository } from "../../../../../shared/items/repository";
import { RARITY_COLORS } from "../../../../../shared/consts/colors";
import { MoveItemPacket, MoveItemResponse, PacketClass, PacketDirection, PayloadOf, ResponseOf } from "../../../../../shared/network";
import { ClientNet } from "../../../../network";
import { ItemInstance } from "../../../../../shared/items";
import { ItemViewport } from "../../../Inventory/components/ItemViewport";

interface DragState {
    originSlot: string;
    itemUuid: string;
}

const slotNums = [1,2,3,4,5,6,7,8,9,0]

export function Hotbar() {
    const [selected, setSelected] = useState<number>(1);
    const [dragState, setDragState] = useState<DragState | undefined>();
    const [dragPosition, setDragPosition] = useState(new Vector2(0, 0));
    const slotRefs = useRef(new Map<string, Frame>());
    const hotbarRef = useRef<Frame>();
    const dragStateRef = useRef<DragState | undefined>();

    useEffect(() => {
        dragStateRef.current = dragState;
    }, [dragState]);

    const adjustForInset = useCallback((position: Vector2) => {
        const [inset] = GuiService.GetGuiInset();
        return new Vector2(position.X - inset.X, position.Y - inset.Y);
    }, []);

    const requestMove = useCallback((slot: string, itemUuid: string) => {
        const payload = {
            slot,
            itemUuid: itemUuid,
        };

        const [success, result] = pcall(() =>
            ClientNet.requestServer(
                MoveItemPacket,
                payload,
            ),
        );

        if (!success) {
            warn(`[Hotbar] Equip request for ${slot} failed: ${result}`);
            return;
        }

        const response = result as MoveItemResponse;
        if (!response.ok && response.error) {
            warn(`[Hotbar] Equip request for ${slot} rejected: ${response.error}`);
            return;
        }

        print(`[Hotbar] Equip request accepted for ${slot}`);
    }, []);

    const findSlotUnderPoint = useCallback((position: Vector2) => {
        for (const [slotId, frame] of slotRefs.current) {
            const bottomLeft = frame.AbsolutePosition;
            const size = frame.AbsoluteSize;
            const left = bottomLeft.X;
            const right = left + size.X;
            const bottom = bottomLeft.Y;
            const top = bottomLeft.Y - size.Y;

            if (
                position.X >= left &&
                position.X <= right &&
                position.Y >= top &&
                position.Y <= bottom
            ) {
                return slotId;
            }
        }

        print(`[Hotbar] pointer (${position.X}, ${position.Y}) not over any slot`);
        for (const [slotId, frame] of slotRefs.current) {
            const pos = frame.AbsolutePosition;
            const size = frame.AbsoluteSize;
            print(`  slot ${slotId}: pos=(${pos.X}, ${pos.Y}) size=(${size.X}, ${size.Y})`);
        }
        return undefined;
    }, []);

    const finishDrag = useCallback((rawPosition: Vector2) => {
        const state = dragStateRef.current;
        if (!state) {
            return;
        }

        const position = adjustForInset(rawPosition);
        const targetSlot = findSlotUnderPoint(position);
        print(`[Hotbar] drop raw=(${rawPosition.X}, ${rawPosition.Y}) adjusted=(${position.X}, ${position.Y}) target=${targetSlot}`);
        setDragState(undefined);

        if (!targetSlot || targetSlot === state.originSlot) {
            print(`[Hotbar] drag cancelled -> target=${targetSlot}`);
            return;
        }

        const draggedItem = inventoryManager.getItem(state.itemUuid);
        if (!draggedItem) {
            warn(`[Hotbar] dragged item ${state.itemUuid} missing`);
            return;
        }

        const targetItem = inventoryManager.getItemInSlot(targetSlot);

        task.spawn(() => {
            if (targetItem && targetItem.uuid !== state.itemUuid) {
                print(`[Hotbar] swapping ${draggedItem.id} (${state.originSlot}) with ${targetItem.id} (${targetSlot})`);
                requestMove(state.originSlot, targetItem.uuid);
            }

            print(`[Hotbar] moving ${draggedItem.id} to ${targetSlot}`);
            requestMove(targetSlot, state.itemUuid);
        });

        const digits = string.match(targetSlot, "hotbar_(%d+)");
        const slotNumber = digits !== undefined ? tonumber(digits) ?? selected : selected;
        setSelected(slotNumber);
    }, [adjustForInset, findSlotUnderPoint, requestMove, selected]);

    useEffect(() => {
        if (!dragState) {
            return;
        }

        const moveConn = UserInputService.InputChanged.Connect((input) => {
            if (input.UserInputType === Enum.UserInputType.MouseMovement) {
                // Adjust for inset not necessary for this event, raw position is returned by default.
                const pointer = new Vector2(input.Position.X, input.Position.Y);
                setDragPosition(pointer);
                print(`[Hotbar] move -> (${pointer.X}, ${pointer.Y})`);
            }
        });

        const upConn = UserInputService.InputEnded.Connect((input) => {
            if (input.UserInputType === Enum.UserInputType.MouseButton1) {
                finishDrag(new Vector2(input.Position.X, input.Position.Y));
            }
        });

        return () => {
            moveConn.Disconnect();
            upConn.Disconnect();
        };
    }, [adjustForInset, dragState, finishDrag]);

    const registerSlot = useCallback((slotId: string, frame: Frame) => {
        slotRefs.current.set(slotId, frame);
    }, []);

    const unregisterSlot = useCallback((slotId: string) => {
        slotRefs.current.delete(slotId);
    }, []);

    const handleSlotSelected = useCallback((slotNum: number) => {
        setSelected(slotNum);
    }, []);

    const startDrag = useCallback((slotId: string, item: ItemInstance, pointerPosition: Vector2, frame: Frame) => {
        const adjustedPointer = adjustForInset(pointerPosition);
        const [inset] = GuiService.GetGuiInset();
        const framePos = frame.AbsolutePosition;
        print(`[Hotbar] startDrag slot=${slotId}, item=${item.id}, raw=(${pointerPosition.X}, ${pointerPosition.Y}), inset=(${inset.X}, ${inset.Y}), frame=(${framePos.X}, ${framePos.Y})`);
        if (inventoryManager.getVersion() === 0) {
            warn("[Hotbar] inventory version 0, abort drag");
            return;
        }

        setDragState({
            originSlot: slotId,
            itemUuid: item.uuid,
        });
        setDragPosition(adjustedPointer);
    }, [adjustForInset]);

    const dragOverlay = useMemo(() => {
        const playerGui = Players.LocalPlayer!.WaitForChild("PlayerGui") as PlayerGui;
        let overlay = playerGui.FindFirstChild("HotbarDragOverlay") as ScreenGui | undefined;
        if (!overlay) {
            overlay = new Instance("ScreenGui");
            overlay.Name = "HotbarDragOverlay";
            overlay.DisplayOrder = 1000;
            overlay.IgnoreGuiInset = true;
            overlay.ResetOnSpawn = false;
            overlay.ZIndexBehavior = Enum.ZIndexBehavior.Sibling;
            overlay.Parent = playerGui;
        }
        return overlay;
    }, []);

    useEffect(() => () => {
        if (dragOverlay && dragOverlay.Parent) {
            dragOverlay.Destroy();
        }
    }, [dragOverlay]);

    const renderDragGhost = () => {
        const state = dragState;
        if (!state) {
            return undefined;
        }

        const item = inventoryManager.getItem(state.itemUuid);
        if (!item) {
            return undefined;
        }

        const itemDef = itemRepository.get(item.id);
        const color = itemDef ? RARITY_COLORS[itemDef.rarity] : Color3.fromHex("#f5f5f5");
        const screenPosition = new Vector2(dragPosition.X - 25, dragPosition.Y + 25);

        return (
            <frame
                key="DragGhost"
                Size={UDim2.fromOffset(50, 50)}
                Position={UDim2.fromOffset(screenPosition.X, screenPosition.Y)}
                BackgroundColor3={color}
                BackgroundTransparency={0.4}
                BorderSizePixel={0}
                ZIndex={10}
                Active={false}
            >
                <uistroke Color={color} Transparency={0.1} />
                <uicorner CornerRadius={new UDim(0, 3)} />
                <ItemViewport item={item} />
                {item.stack > 1 && (
                    <textlabel
                        BackgroundTransparency={1}
                        Size={UDim2.fromOffset(18, 14)}
                        AnchorPoint={new Vector2(1, 1)}
                        Position={UDim2.fromOffset(48, 48)}
                        FontFace={Font.fromName("Balthazar")}
                        Text={`${item.stack}`}
                        TextColor3={color}
                        TextXAlignment={Enum.TextXAlignment.Right}
                        TextYAlignment={Enum.TextYAlignment.Bottom}
                        ZIndex={11}
                    />
                )}
            </frame>
        );
    };

    const ghost = renderDragGhost();

    return (
        <>
            <frame
                key={"Hotbar"}
                ref={hotbarRef}
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
                        Padding={new UDim(0,5)}
                    />

                    {slotNums.map((num) => (
                        <HotbarSlot
                            key={`hotbar_${num}`}
                            num={num}
                            selected={selected === num}
                            onSelected={() => handleSlotSelected(num)}
                            onDragStart={startDrag}
                            registerSlot={registerSlot}
                            unregisterSlot={unregisterSlot}
                            isDragging={dragState !== undefined}
                        />
                    ))}
                </frame>
            </frame>

            {ghost && createPortal(ghost, dragOverlay)}
        </>
    )
}
