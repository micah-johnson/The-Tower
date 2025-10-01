import React from "@rbxts/react";
import { ReactNode, useEffect, useState } from "@rbxts/react";
import { UserInputService } from "@rbxts/services";

export function Toggleable(props: { children: ReactNode, keybind: Enum.KeyCode, default?: boolean }) {
    const [visible, setVisible] = useState(props.default ?? false)

    useEffect(() => {
        const connection = UserInputService.InputBegan.Connect(input => {
            if (input.UserInputType === Enum.UserInputType.Keyboard && input.KeyCode === props.keybind) {
                setVisible(prev => !prev)
            }
        });

        return () => connection.Disconnect();
    }, [])

    if (!visible) {
        return (<></>)
    }

    return (
        <>
            {props.children}
        </>
    )
}