import React, { MutableRefObject, useEffect, useMemo, useRef, useState } from "@rbxts/react";
import { Players, TweenService, UserInputService } from "@rbxts/services";
import { ItemInstance } from "../../../shared/items";
import { RARITY_COLORS } from "../../../shared/consts/colors";
import { itemRepository } from "../../../shared/items/repository";
import { useTweenableState } from "../../hooks/tween";
import { keyCodeToString } from "../../../shared/utils/keycode";
import { ItemViewport } from "./ItemViewport";
import { ItemTooltip } from "./ItemTooltip";
import { useItemDragging } from "../context/ItemDraggingContext";
import { ClientNet } from "../../network";
import { EquipItemPacket, MoveItemRequest, MoveItemsPacket, PayloadOf } from "../../../shared/network";
import { useInventoryVersion } from "../../hooks/inventory";
import { playerInventory } from "../../inventory";


export function Slot(props: {
    slotId: string,
    keybind?: Enum.KeyCode,
    onActivated?: () => void
    children?: React.ReactNode
    onMouseDown?: (position: Vector2) => void;
    onMouseUp?: (position: Vector2) => void;
    forwardRef?: MutableRefObject<Frame | undefined>;
}) {
    const item = playerInventory.getItemInSlot(props.slotId)
    const selected = playerInventory.getEquippedSlot() === props.slotId

    const itemDef = useMemo(() => item ? itemRepository.get(item.id) : undefined, [item])
    
    const { dragState, setDragState } = useItemDragging();

    const defaultTransparency = selected ? 0.7 : 0.9
    const color = itemDef ? RARITY_COLORS[itemDef.rarity] : Color3.fromHex("#f5f5f5")

    const internalRef = useRef<Frame>()
    const ref = props.forwardRef ?? internalRef;
    const strokeRef = useRef<UIStroke>()

    const [backgroundColor, setBackgroundColor] = useTweenableState(ref, "BackgroundColor3", color, new TweenInfo(0.1, Enum.EasingStyle.Linear))
    const [borderColor, setBorderColor] = useTweenableState(strokeRef, "Color", color, new TweenInfo(0.1, Enum.EasingStyle.Linear))

    const [transparency, setTransparency] = useTweenableState(ref, "BackgroundTransparency", 0.9, new TweenInfo(0.05, Enum.EasingStyle.Linear))

    function handleActivate() {
        if (selected) {
            ClientNet.requestServer(
                EquipItemPacket,
                {
                    slot: undefined
                }
            )
        } else {
            ClientNet.requestServer(
                EquipItemPacket,
                {
                    slot: props.slotId
                }
            )
        }
    }

    function handleMouseDown(position: Vector2) {
        // Invoke parent handler
        props.onMouseDown?.(position)

        if (item && !dragState) {
            setDragState({
                originSlot: props.slotId,
                itemUuid: item.uuid
            })
        }
    }

    function handleMouseUp(position: Vector2) {
        props.onMouseUp?.(position)

        // Initiate transfer
        if (dragState) {
            const moves: MoveItemRequest = []
            if (item) { // slot has item, set up for swap
                moves.push({
                    slot: dragState.originSlot,
                    itemUuid: item.uuid,
                });
            }

            moves.push({
                slot: props.slotId,
                itemUuid: dragState.itemUuid,
            });

            const [success, result] = pcall(() =>
                ClientNet.requestServer(
                    MoveItemsPacket,
                    moves,
                ),
            );

            if (!success) {
                warn(`[Hotbar] Equip request for ${props.slotId} failed: ${result}`);
                return;
            }

            const response = result;
            if (!response.ok && response.error) {
                warn(`[Hotbar] Equip request for ${props.slotId} rejected: ${response.error}`);
                return;
            }

            print(`[Hotbar] Equip request accepted for ${props.slotId}`);
        }
    }

    useEffect(() => {
        if (!props.keybind) {
            return;
        }

        const connection = UserInputService.InputBegan.Connect(input => {
            if (input.UserInputType === Enum.UserInputType.Keyboard && input.KeyCode === props.keybind) {
                handleActivate()
            }
        });

        return () => connection.Disconnect();
    }, [props.keybind, props.onActivated]);

    useEffect(() => {
        setTransparency(defaultTransparency)
    }, [selected])

    useEffect(() => {
        setBackgroundColor(color)
        setBorderColor(color)
    }, [color])

    const stack = item?.stack;

    return (
        <frame 
            ref={ref}
            key={"Slot"}
            Size={UDim2.fromOffset(50, 50)} 
            Position={UDim2.fromOffset(0, -5)}
            AnchorPoint={new Vector2(0, 1)}
            BackgroundColor3={backgroundColor}
            BackgroundTransparency={transparency}
            Active
            Event={{
                MouseEnter: () => setTransparency(0.8),
                MouseLeave: () => setTransparency(defaultTransparency),
            }}
        >
            {item && <ItemTooltip item={item} itemDef={itemDef} /> }
            <uistroke ref={strokeRef} Color={borderColor} Transparency={item ? 0 : 0.3} />
            <uicorner CornerRadius={new UDim(0,3)}/>

            {/* Keybind Label */}
            {props.keybind && (
                <textlabel 
                    key="KeybindLabel" 
                    TextSize={12} 
                    Text={`${keyCodeToString(props.keybind)}`} 
                    Transparency={item ? 0 : 0.3} 
                    FontFace={Font.fromName("Balthazar")} 
                    TextColor3={color} 
                    Position={UDim2.fromOffset(5,5)} /> 
            )}

            {/* Display stack count */}
            {stack !== undefined && stack > 1 && (
                <textlabel
                    key="StackLabel"
                    BackgroundTransparency={1}
                    Text={`${stack}`}
                    TextSize={12}
                    Size={UDim2.fromOffset(18, 14)}
                    AnchorPoint={new Vector2(1, 1)}
                    Position={UDim2.fromOffset(48, 48)}
                    FontFace={Font.fromName("Balthazar")}
                    TextColor3={color}
                    TextXAlignment={Enum.TextXAlignment.Right}
                    TextYAlignment={Enum.TextYAlignment.Bottom}
                />
            )}

            {/* Render item model */}
            <ItemViewport item={item} />

            {/* Button for interaction */}
            <textbutton
                BackgroundTransparency={1}
                key="HotbarSlotButton"
                Text=""
                Size={UDim2.fromScale(1, 1)}
                Event={{
                    MouseButton1Click: (_rbx) => handleActivate(),
                    MouseButton1Down: (_rbx, x, y) => handleMouseDown(new Vector2(x, y)),
                    MouseButton1Up: (_rbx, x, y) => handleMouseUp(new Vector2(x,y))
                }}
            />
            {props.children}
        </frame>
    )
}
