import React, { useEffect, useRef, useState } from "@rbxts/react"
import { ItemViewport } from "./ItemViewport"
import { GuiService, UserInputService } from "@rbxts/services"
import { RARITY_COLORS } from "../../../shared/consts/colors"
import { itemRepository } from "../../../shared/items/repository"
import { useTweenableState } from "../../hooks/tween"
import { useItemDragging } from "../context/ItemDraggingContext"
import { playerInventory } from "../../inventory"

function adjustForInset(position: Vector2) {
    const [inset] = GuiService.GetGuiInset();
    return new Vector2(position.X - inset.X, position.Y - inset.Y);
};

export function ItemDragGhost(){
    const { dragState, setDragState } = useItemDragging()
    const [ position, setPosition ] = useState<Vector2>(new Vector2())

    const ref = useRef<Frame>()
    const strokeRef = useRef<UIStroke>()

    const [color, setColor] = useState(Color3.fromHex("#f5f5f5"))
    const [transparency, setTransparency] = useTweenableState(ref, "Transparency", 1, new TweenInfo(0.1, Enum.EasingStyle.Linear))
    const [strokeTransparency, setStrokeTransparency] = useTweenableState(strokeRef, "Transparency", 1, new TweenInfo(0.1, Enum.EasingStyle.Linear))

    useEffect(() => {
        if (!dragState) {
            setTransparency(1)
            setStrokeTransparency(1)
        } else {
            const itemDef = item ? itemRepository.get(item.id) : undefined;
            const color = itemDef ? RARITY_COLORS[itemDef.rarity] : Color3.fromHex("#f5f5f5");

            setColor(color)

            setTransparency(0.1)
            setStrokeTransparency(0.1)

            // Track mouse movement
            setPosition(adjustForInset(UserInputService.GetMouseLocation()))

            const moveConn = UserInputService.InputChanged.Connect((input) => {
                if (input.UserInputType === Enum.UserInputType.MouseMovement) {
                    // Adjust for inset not necessary for this event, raw position is returned by default.
                    const pointer = new Vector2(input.Position.X, input.Position.Y);
                    setPosition(pointer);
                    print(`[Hotbar] move -> (${pointer.X}, ${pointer.Y})`);
                }
            });

            const upConn = UserInputService.InputEnded.Connect(input => {
                if (input.UserInputType === Enum.UserInputType.MouseButton1) {
                    // Adjust for inset not necessary for this event, raw position is returned by default.
                    setDragState(undefined)
                }
            })

            return () => {
                moveConn.Disconnect();
                upConn
            };
        }
    }, [dragState])

    const item = dragState ? playerInventory.getItem(dragState.itemUuid) : undefined

    const screenPosition = new Vector2(position.X - 25, position.Y + 25);

    return (
        <frame
            ref={ref}
            key="DragGhost"
            Size={UDim2.fromOffset(50, 50)}
            Position={UDim2.fromOffset(screenPosition.X, screenPosition.Y)}
            BackgroundColor3={color.Lerp(Color3.fromRGB(0,0,0), 0.7)}
            BackgroundTransparency={1}
            Transparency={transparency}
            BorderSizePixel={0}
            ZIndex={10}
            Active={false}
        >
            <uistroke ref={strokeRef} Color={color} Transparency={strokeTransparency} />
            <uicorner CornerRadius={new UDim(0, 3)} />
            <ItemViewport item={item} />
            {item && item.stack > 1 && (
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