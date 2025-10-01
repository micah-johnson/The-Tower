import React from "@rbxts/react";

export function Divider() {
    return (
        <frame 
            Size={UDim2.fromScale(1,0).add(UDim2.fromOffset(0, 1))} 
            Position={UDim2.fromScale(0.5,0)} 
            BackgroundColor3={Color3.fromHex("#f5f5f5")} 
            AnchorPoint={new Vector2(0.5, 0)}
        >
            <uipadding PaddingTop={new UDim(0,5)} PaddingBottom={new UDim(0,5)} />
        </frame>
    )
}