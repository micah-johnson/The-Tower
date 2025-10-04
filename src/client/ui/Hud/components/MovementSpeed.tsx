import React, { useEffect, useState, useRef } from "@rbxts/react";
import { Players, RunService } from "@rbxts/services";

const player = Players.LocalPlayer;

function getCurrentSpeed() {
    const character = player.Character;
    if (!character) {
        return 0;
    }

    const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
    if (!root) {
        return 0;
    }

    return math.round(root.AssemblyLinearVelocity.Magnitude * 100) / 100;
}

export function MovementSpeed() {
    const [speed, setSpeed] = useState(getCurrentSpeed());
    const speedRef = useRef(speed);

    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);

    useEffect(() => {
        const connection = RunService.Heartbeat.Connect(() => {
            const current = getCurrentSpeed();
            if (math.abs(current - speedRef.current) > 0.01) {
                setSpeed(current);
            }
        });

        return () => connection.Disconnect();
    }, []);

    const label = string.format("%.2f", speed);

    return (
        <textlabel
            key="MovementSpeed"
            Size={UDim2.fromOffset(120, 24)}
            AnchorPoint={new Vector2(0, 1)}
            Position={UDim2.fromScale(0, 1).add(UDim2.fromOffset(10, -10))}
            BackgroundTransparency={1}
            TextColor3={Color3.fromHex("#f5f5f5")}
            TextXAlignment={Enum.TextXAlignment.Left}
            TextYAlignment={Enum.TextYAlignment.Center}
            FontFace={Font.fromName("Balthazar")}
            TextSize={16}
            Text={`M/s: ${label}`}
        />
    );
}
