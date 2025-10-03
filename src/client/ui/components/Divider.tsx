import React from "@rbxts/react";

export function Divider(props: { color?: Color3, ZIndex?: number, PaddingTop?: UDim, PaddingBottom?: UDim }) {
    return (
        <frame
            Size={UDim2.fromScale(1,0)} 
            Position={UDim2.fromScale(0.5,0)} 
            BackgroundTransparency={1}
            AutomaticSize={Enum.AutomaticSize.Y}
            AnchorPoint={new Vector2(0.5, 0)}
            ZIndex={props.ZIndex}
        >
            <uipadding PaddingTop={props.PaddingTop} PaddingBottom={props.PaddingBottom} />
            <frame
                Size={UDim2.fromScale(1,0).add(UDim2.fromOffset(0, 1))} 
                Position={UDim2.fromScale(0.5,0)} 
                BackgroundColor3={props.color ?? Color3.fromHex("#f5f5f5")} 
                AnchorPoint={new Vector2(0.5, 0)}
                ZIndex={props.ZIndex}
            />
        </frame>
    )
}