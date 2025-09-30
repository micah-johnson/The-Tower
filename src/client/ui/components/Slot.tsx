import React, { MutableRefObject, useEffect, useMemo, useRef, useState } from "@rbxts/react";
import { Players, TweenService, UserInputService } from "@rbxts/services";
import { ItemInstance } from "../../../shared/items";
import { RARITY_COLORS } from "../../../shared/consts/colors";
import { itemRepository } from "../../../shared/items/repository";
import { useTweenableState } from "../../hooks/tween";
import { keyCodeToString } from "../../../shared/utils/keycode";
import { ItemViewport } from "./ItemViewport";
import { inventoryManager } from "../../inventory/manager";
import { ItemTooltip } from "./ItemTooltip";


export function Slot(props: {
    id: string,
    keybind?: Enum.KeyCode,
    selected?: boolean,
    onActivated?: () => void
    children?: React.ReactNode
    onInputBegan?: (input: InputObject) => void;
    onMouseDown?: (position: Vector2) => void;
    forwardRef?: MutableRefObject<Frame | undefined>;
}) {
    const item = inventoryManager.getItemInSlot(props.id)

    const itemDef = useMemo(() => item ? itemRepository.get(item.id) : undefined, [item])

    const defaultTransparency = props.selected ? 0.7 : 0.9
    const color = itemDef ? RARITY_COLORS[itemDef.rarity] : Color3.fromHex("#f5f5f5")

    const internalRef = useRef<Frame>()
    const ref = props.forwardRef ?? internalRef;
    const strokeRef = useRef<UIStroke>()

    const [backgroundColor, setBackgroundColor] = useTweenableState(ref, "BackgroundColor3", color, new TweenInfo(0.1, Enum.EasingStyle.Linear))
    const [borderColor, setBorderColor] = useTweenableState(strokeRef, "Color", color, new TweenInfo(0.1, Enum.EasingStyle.Linear))

    const [transparency, setTransparency] = useTweenableState(ref, "BackgroundTransparency", 0.9, new TweenInfo(0.05, Enum.EasingStyle.Linear))

    useEffect(() => {
        if (!props.keybind) {
            return;
        }

        const connection = UserInputService.InputBegan.Connect(input => {
            if (input.UserInputType === Enum.UserInputType.Keyboard && input.KeyCode === props.keybind) {
                props.onActivated?.()
            }
        });

        return () => connection.Disconnect();
    }, [props.keybind, props.onActivated]);

    useEffect(() => {
        setTransparency(defaultTransparency)
    }, [props.selected])

    useEffect(() => {
        setBackgroundColor(color)
        setBorderColor(color)
    }, [color])

    const stack = item?.stack;

    return (
        <frame 
            ref={ref}
            key="Slot"
            Size={UDim2.fromOffset(50, 50)} 
            Position={UDim2.fromOffset(0, -5)}
            AnchorPoint={new Vector2(0, 1)}
            BackgroundColor3={backgroundColor}
            BackgroundTransparency={transparency}
            Active
            Event={{
                MouseEnter: () => setTransparency(0.8),
                MouseLeave: () => setTransparency(defaultTransparency),
                InputBegan: (_rbx, input) => props.onInputBegan?.(input),
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
                    MouseButton1Click: props.onActivated,
                    MouseButton1Down: (_rbx, x, y) => props.onMouseDown?.(new Vector2(x, y)),
                }}
            />
            {props.children}
        </frame>
    )
}
