import { useEffect, useState } from "@rbxts/react"
import { HotbarSlot } from "./components/HotbarSlot";
import React from "@rbxts/react";

const slotNums = [1,2,3,4,5,6,7,8,9,0]

export function Hotbar() {
    const [selected, setSelected] = useState<number>(1);
    
    return (
        <frame 
            key={"Hotbar"}
            AnchorPoint={new Vector2(0.5, 1)}
            Position={UDim2.fromScale(0.5, 1).add(UDim2.fromOffset(0,-5))}
            Size={UDim2.fromOffset(0, 0)}
            AutomaticSize={Enum.AutomaticSize.XY}
            BackgroundTransparency={0}
            BackgroundColor3={Color3.fromHex("#171717")}
        >
            <uicorner CornerRadius={new UDim(0,3)}/>
            <uistroke Color={Color3.fromHex("#f5f5f5")} />
            <uipadding PaddingTop={new UDim(0,3)} PaddingBottom={new UDim(0,3)} PaddingLeft={new UDim(0,3)} PaddingRight={new UDim(0,3)} />
            <uilistlayout
                FillDirection={Enum.FillDirection.Horizontal}
                HorizontalAlignment={Enum.HorizontalAlignment.Center}
                HorizontalFlex={"SpaceBetween"}
                Padding={new UDim(0,5)}
            />
        
            {
                slotNums.map(num => 
                    <HotbarSlot num={num} selected={selected === num} onSelected={() => setSelected(num)}/>
                )
            }
        </frame>
    )
}