import React, { useState } from "@rbxts/react";
import { Slot } from "../components/Slot";
import { Toggleable } from "../components/Toggleable";
import { useInventoryVersion } from "../../hooks/inventory";
import { useItemDragging } from "../context/ItemDraggingContext";
import { ClientNet } from "../../network";
import { MoveItemsPacket, ResponseOf } from "../../../shared/network";
import { Divider } from "../components/Divider";
import { TextInput } from "../components/interaction/TextInput";
import { itemRepository } from "../../../shared/items/repository";
import { getItemKeywords } from "../../../shared/items/util";
import { playerInventory } from "../../inventory";

export function Inventory() {
    useInventoryVersion() // Subscribe to inventory changes
    const { dragState } = useItemDragging()

    const [ search, setSearch ] = useState("")

    function handleMouseUp() {
        if (!dragState) {
            return;
        }

        const fallbackSlot = playerInventory.getNewInventorySlot();

        task.spawn(() => {
            const [success, result] = pcall(() =>
                ClientNet.requestServer(MoveItemsPacket, [
                    {
                        itemUuid: dragState.itemUuid,
                        slot: fallbackSlot,
                    },
                ]),
            );

            if (!success) {
                warn(`[Inventory] Failed to move dragged item: ${result}`);
                return;
            }

            const response = result as ResponseOf<typeof MoveItemsPacket>;
            if (!response.ok) {
                warn(`[Inventory] Move rejected: ${response.error ?? "unknown error"}`);
            }
        });
    }

    let slots = playerInventory.getInventorySlots()

    if (search) {
        const searchTerm = search.lower();

        slots = slots.filter(slot => {
            const item = playerInventory.getItemInSlot(slot)

            if (!item) return false

            const itemDef = itemRepository.get(item.id)

            if (!itemDef) return false;

            const keywords = getItemKeywords(itemDef)
            const [matchStart] = keywords.find(searchTerm, 1, true)

            return matchStart !== undefined
        })
    }

    return (
        <Toggleable keybind={Enum.KeyCode.Tab} >
            <frame
                key="Inventory" 
                Size={UDim2.fromOffset(551, 0)}
                AutomaticSize={Enum.AutomaticSize.Y}
                AnchorPoint={new Vector2(0.5,1)} 
                Position={UDim2.fromScale(0.5, 1).add(UDim2.fromOffset(0, -100))}
                BackgroundTransparency={0}
                BackgroundColor3={Color3.fromHex("#171717")}
            >
                <frame Size={UDim2.fromScale(1,0)} AutomaticSize={Enum.AutomaticSize.Y} BackgroundTransparency={1}>
                    <uicorner CornerRadius={new UDim(0,3)}/>
                    <uistroke Color={Color3.fromHex("#f5f5f5")} />
                    <uipadding PaddingTop={new UDim(0,3)} PaddingBottom={new UDim(0,3)} PaddingLeft={new UDim(0,3)} PaddingRight={new UDim(0,3)} />
                    <uilistlayout
                        FillDirection={Enum.FillDirection.Vertical}
                        HorizontalAlignment={Enum.HorizontalAlignment.Left}
                        Padding={new UDim(0,5)}
                    />

                    <frame Size={UDim2.fromScale(1, 0).add(UDim2.fromOffset(0,20))} BackgroundTransparency={1}>
                        <uilistlayout
                            FillDirection={Enum.FillDirection.Horizontal}
                            HorizontalAlignment={Enum.HorizontalAlignment.Left}
                            HorizontalFlex={"SpaceBetween"}
                            Padding={new UDim(0,5)}
                        />
                        <uipadding PaddingTop={new UDim(0,1)} PaddingBottom={new UDim(0,1)} PaddingLeft={new UDim(0,1)} PaddingRight={new UDim(0,1)} />
                        

                        <TextInput 
                            placeholder="Search"
                            value={search}
                            onChange={setSearch}
                            frameProps={{Size: new UDim2(0,200,1,0) }}
                        />
                    </frame>

                    <Divider/>

                    <frame
                        BackgroundTransparency={1}
                        AutomaticSize={Enum.AutomaticSize.XY}
                    >
                        <uilistlayout
                            FillDirection={Enum.FillDirection.Horizontal}
                            HorizontalAlignment={Enum.HorizontalAlignment.Left}
                            Wraps
                            Padding={new UDim(0,5)}
                        />

                        {slots.map((slot) => (
                            <Slot
                                slotId={slot}
                            />
                        ))}

                        {/* Ensures there is space to drop items */}
                        <frame key="inventory_zzzzzzzzz" Size={UDim2.fromOffset(50,50)} Transparency={1}/>
                    </frame>
                </frame>

                <textbutton 
                    Transparency={1}
                    Size={UDim2.fromScale(1,1)}
                    Event={{
                        MouseButton1Up: handleMouseUp
                    }}
                    ZIndex={-1}
                />
            </frame>
        </Toggleable>
    )
}
