import React from "@rbxts/react";

export function Crosshair() {
    const color = Color3.fromHex("#f5f5f5");

    return (
        <frame
            key="Crosshair"
            AnchorPoint={new Vector2(0.5, 0.5)}
            Position={UDim2.fromScale(0.5, 0.5)}
            Size={UDim2.fromOffset(24, 24)}
            BackgroundTransparency={1}
            ZIndex={5}
        >
            <frame
                BackgroundColor3={color}
                BackgroundTransparency={0}
                Size={UDim2.fromOffset(16, 1)}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5, 0.5)}
            />
            <frame
                BackgroundColor3={color}
                BackgroundTransparency={0}
                Size={UDim2.fromOffset(1, 16)}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5, 0.5)}
            />
        </frame>
    );
}
