import React, { PropsWithChildren, useState } from "@rbxts/react";

export function TextInput(props: {
    placeholder?: string,
    frameProps: React.InstanceProps<Frame>
    value: string;
    onChange: (value: string) => void
}) {
    return (
        <frame BackgroundColor3={Color3.fromHex("#171717")} {...props.frameProps}>
            <uipadding PaddingLeft={new UDim(0,5)}/>
            <uicorner CornerRadius={new UDim(0,3)}/>
            <uistroke Color={Color3.fromHex("#f5f5f5")} />

            <textbox 
                TextSize={12} 
                Text={props.value}
                Change={{
                    Text: (box) => props.onChange(box.Text)
                }}
                FontFace={Font.fromName("Balthazar")} 
                PlaceholderText={props.placeholder ?? ""} 
                TextXAlignment={Enum.TextXAlignment.Left} 
                BackgroundTransparency={1} Size={UDim2.fromScale(1,1)} 
                TextColor3={Color3.fromHex("#f5f5f5")} 
            />
        </frame>
    )
}