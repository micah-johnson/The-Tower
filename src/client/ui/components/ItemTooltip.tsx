import React, { useMemo, useRef, useState, useEffect } from "@rbxts/react";
import { UserInputService, Players, Workspace } from "@rbxts/services";
import { ItemDef, ItemInstance } from "../../../shared/items";
import { RARITY_COLORS } from "../../../shared/consts/colors";
import { itemRepository } from "../../../shared/items/repository";

export function ItemTooltip(props: {
    item: ItemInstance
    itemDef?: ItemDef
}) {
    const hoveringRef = useRef(false);
    
    const [visible, setVisible] = useState(false)
    const delayHandle = useRef<thread | undefined>();

    const itemDef = useMemo(() => itemRepository.get(props.item.id), [props.item, props.itemDef])
    const tooltipRef = useRef<Frame>()

    if (!itemDef) {
        return <></>
    }

    const onEnter = () => {
        hoveringRef.current = true;

        if (delayHandle.current) task.cancel(delayHandle.current);
        delayHandle.current = task.delay(0.15, () => {
            setVisible(hoveringRef.current)
        });
    };

    const onLeave = () => {
        hoveringRef.current = false;

        if (delayHandle.current) task.cancel(delayHandle.current);

        setVisible(false);
    };

    const color = RARITY_COLORS[itemDef.rarity]

    return (
        <>
            <frame
                key="TooltipInteraction"
                Size={UDim2.fromScale(1,1)} 
                Transparency={1}
                BackgroundTransparency={1}
                Event={{
                    MouseEnter: onEnter,
                    MouseLeave: onLeave
                }}
            />

            <frame
                ref={tooltipRef}
                Visible={visible}
                key="Tooltip"
                Size={UDim2.fromOffset(0, 0)}
                Position={UDim2.fromOffset(0, -6)}
                AnchorPoint={new Vector2(0, 1)}
                AutomaticSize={Enum.AutomaticSize.XY}
                BackgroundColor3={color.Lerp(new Color3(0, 0, 0), 0.9)} // Darken rarity color (interpolate 90% to black)
                ZIndex={1000}
            >
                <uipadding PaddingTop={new UDim(0, 6)} PaddingBottom={new UDim(0, 6)} PaddingLeft={new UDim(0, 6)} PaddingRight={new UDim(0, 6)} />
                <uistroke Color={color} />
                <uicorner CornerRadius={new UDim(0,3)} />

                <textlabel
                    RichText
                    Size={UDim2.fromOffset(200, 0)}   // lock width at 200px, height expands
                    AutomaticSize={Enum.AutomaticSize.Y}
                    BackgroundTransparency={1}
                    FontFace={Font.fromName("Balthazar")}
                    TextColor3={Color3.fromHex("#f5f5f5")}
                    TextSize={14}
                    TextWrapped={true}
                    ZIndex={1002}
                    Text={`<font color="#${RARITY_COLORS[itemDef.rarity].ToHex()}">${itemDef.name}${props.item.stack > 0 ? ` (x${props.item.stack})` : ""}</font>\n${itemDef.description}`}
                />
            </frame>
        </>
    )
}