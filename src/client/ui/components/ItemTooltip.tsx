import React, { useMemo, useRef, useState } from "@rbxts/react";
import { TextService, UserInputService } from "@rbxts/services";
import { Attribute, AttributeModifier, ItemDef, ItemInstance } from "../../../shared/items";
import { RARITY_COLORS } from "../../../shared/consts/colors";
import { itemRepository } from "../../../shared/items/repository";
import { Divider } from "./Divider";
import { getEnchantLoreEntries } from "../../../shared/items/enchants/lore";

const H_PADDING = 6;
const MIN_WIDTH = 160;
const MAX_WIDTH = 260;

function measureTextWidth(text: string, size: number) {
    const result = TextService.GetTextSize(text, size, Enum.Font.Gotham, new Vector2(1000, 1000));
    return result.X;
}

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

    const enchantLore = useMemo(() => getEnchantLoreEntries(itemDef.enchant), [itemDef]);

    const tooltipWidth = useMemo(() => {
        const texts = new Array<[string, number]>();

        const nameText = `${itemDef.name}${props.item.stack > 1 ? ` (x${props.item.stack})` : ""}`;
        texts.push([nameText, 14]);
        texts.push([itemDef.description, 14]);

        itemDef.attr.forEach((attr) => {
            texts.push([attr.attribute, 14]);
        });

        props.item.attr.forEach((attr) => {
            texts.push([attr.attribute, 14]);
            texts.push([formatModText(attr), 14]);
        });

        enchantLore.forEach((entry) => {
            texts.push([`${entry.name} (Tier ${entry.tier})`, 14]);
            texts.push([entry.description, 13]);
        });

        let maxTextWidth = 0;
        for (const [text, size] of texts) {
            maxTextWidth = math.max(maxTextWidth, measureTextWidth(text, size));
        }

        const padded = maxTextWidth + H_PADDING * 2;
        return math.clamp(padded, MIN_WIDTH, MAX_WIDTH);
    }, [itemDef, props.item, enchantLore]);

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
                Size={UDim2.fromOffset(tooltipWidth, 0)}
                Position={UDim2.fromOffset(0, -6)}
                AnchorPoint={new Vector2(0, 1)}
                AutomaticSize={Enum.AutomaticSize.Y}
                BackgroundColor3={color.Lerp(new Color3(0, 0, 0), 0.9)} // Darken rarity color (interpolate 90% to black)
                ZIndex={1000}
            >
                <uipadding PaddingTop={new UDim(0, 6)} PaddingBottom={new UDim(0, 6)} PaddingLeft={new UDim(0, 6)} PaddingRight={new UDim(0, 6)} />
                <uistroke Color={color} />
                <uicorner CornerRadius={new UDim(0,3)} />
                <uilistlayout FillDirection={Enum.FillDirection.Vertical} ItemLineAlignment={"Center"} SortOrder={"LayoutOrder"} Padding={new UDim(0,5 )}/>

                <frame Size={UDim2.fromOffset(tooltipWidth - H_PADDING * 2,0)} AutomaticSize={Enum.AutomaticSize.Y} BackgroundTransparency={1}>
                    <uilistlayout FillDirection={Enum.FillDirection.Vertical} SortOrder={"LayoutOrder"} Padding={new UDim(0,5)}/>
                    <uipadding PaddingBottom={new UDim(0,5)} />
                    <textlabel
                        RichText
                        Size={UDim2.fromOffset(tooltipWidth - H_PADDING * 2,0)}
                        AutomaticSize={Enum.AutomaticSize.Y}
                        BackgroundTransparency={1}
                        TextXAlignment={Enum.TextXAlignment.Center}
                        FontFace={Font.fromName("Balthazar")}
                        TextColor3={color}
                        TextSize={14}
                        TextWrapped={true}
                        ZIndex={1001}
                        Text={`${itemDef.name}${props.item.stack > 1 ? ` (x${props.item.stack})` : ""}`}
                    />

                    <textlabel
                        RichText
                        Size={UDim2.fromOffset(tooltipWidth - H_PADDING * 2,0)}
                        AutomaticSize={Enum.AutomaticSize.Y}
                        BackgroundTransparency={1}
                        TextXAlignment={Enum.TextXAlignment.Center}
                        FontFace={Font.fromName("Balthazar")}
                        TextColor3={Color3.fromHex("#f5f5f5")}
                        TextSize={14}
                        TextWrapped={true}
                        ZIndex={1001}
                        Text={itemDef.description}
                    />
                </frame>

                {itemDef.attr.map(attr => (
                    <ItemAttribute attr={attr} width={tooltipWidth - H_PADDING * 2} />
                ))}

                <Divider color={color} ZIndex={1001} PaddingTop={new UDim(0,5)} PaddingBottom={new UDim(0,5)}/>

                {props.item.attr.map(attr => (
                    <ItemAttribute attr={attr} width={tooltipWidth - H_PADDING * 2} />
                ))}

                {enchantLore.size() > 0 && (
                    <>
                        <Divider color={color} ZIndex={1001} PaddingTop={new UDim(0,5)} PaddingBottom={new UDim(0,5)} />
                        {enchantLore.map((entry) => (
                            <frame
                                Size={UDim2.fromOffset(tooltipWidth - H_PADDING * 2, 0)}
                                AutomaticSize={Enum.AutomaticSize.Y}
                                BackgroundTransparency={1}
                            >
                                <uilistlayout FillDirection={Enum.FillDirection.Vertical} Padding={new UDim(0,4)} />
                                <textlabel
                                    BackgroundTransparency={1}
                                    Size={UDim2.fromOffset(tooltipWidth - H_PADDING * 2, 0)}
                                    AutomaticSize={Enum.AutomaticSize.Y}
                                    Text={`${entry.name} (Tier ${entry.tier})`}
                                    TextColor3={color}
                                    FontFace={Font.fromName("Balthazar")}
                                    TextSize={14}
                                    ZIndex={1001}
                                    TextXAlignment={Enum.TextXAlignment.Left}
                                />
                                <textlabel
                                    BackgroundTransparency={1}
                                    Size={UDim2.fromOffset(tooltipWidth - H_PADDING * 2, 0)}
                                    AutomaticSize={Enum.AutomaticSize.Y}
                                    Text={entry.description}
                                    TextColor3={Color3.fromHex("#f5f5f5")}
                                    FontFace={Font.fromName("Balthazar")}
                                    TextSize={13}
                                    ZIndex={1001}
                                    TextWrapped
                                    TextXAlignment={Enum.TextXAlignment.Left}
                                />
                            </frame>
                        ))}
                    </>
                )}
            </frame>
        </>
    )
}



export function ItemAttribute(props: { attr: AttributeModifier; width: number }) {
    const modText = formatModText(props.attr)

    return (
        <frame Size={UDim2.fromOffset(props.width,0)} AutomaticSize={Enum.AutomaticSize.Y} BackgroundTransparency={1}>
            <uilistlayout FillDirection={Enum.FillDirection.Horizontal} HorizontalFlex={"SpaceBetween"} />
            <textlabel
                AutomaticSize={Enum.AutomaticSize.XY}
                Text={`${props.attr.attribute}`}
                TextColor3={Color3.fromHex("#f5f5f5")}
                ZIndex={1001}
                BackgroundTransparency={1}
                TextSize={14}
                FontFace={Font.fromName("Balthazar")}
            />

            <textlabel
                AutomaticSize={Enum.AutomaticSize.XY}
                Text={modText}
                TextColor3={Color3.fromHex("#f5f5f5")}
                ZIndex={1001}
                BackgroundTransparency={1}
                TextSize={14}
                FontFace={Font.fromName("Balthazar")}
            />
        </frame>
    )
}

export function formatModText(attr: AttributeModifier) {
    let modText = ""

    if (attr.type === "additive") {
        if (attr.value > 0) { 
            modText += "+"
        }

        // Format attack speed to seconds
        if (attr.attribute === Attribute.ATTACK_SPEED) {
            modText += `${math.round(attr.value / 100) / 10}s`
        } else {
            modText += attr.value
        }
    } else if (attr.type === "multiplicative") {
        modText += attr.value > 1 ? "+" : "-"
        modText += math.round((attr.value - 1) * 100)
        modText += "%"
    }

    return modText
}
