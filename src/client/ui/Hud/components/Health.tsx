import React, { useRef } from "@rbxts/react";
import { useEffect, useState } from "@rbxts/react";
import { Players } from "@rbxts/services";

export function Health() {
    const [humanoid, setHumanoid] = useState<Humanoid>();
    const [health, setHealth] = useState(0);
    const [maxHealth, setMaxHealth] = useState(0);

    const healthBarRef = useRef<Frame>()

    useEffect(() => {
        Players.LocalPlayer.CharacterAdded.Connect((c) => {
            setHumanoid((c.WaitForChild("Humanoid") as Humanoid))
        })
    }, [])

    useEffect(() => {
        healthChanged(humanoid?.Health ?? 0)
        humanoid?.HealthChanged.Connect(healthChanged)
    }, [humanoid])

    function healthChanged(health: number) {
        if (!humanoid) return;

        setHealth(health)
        setMaxHealth(humanoid.MaxHealth)

        const ratio = math.clamp(health / humanoid.MaxHealth, 0, 1);

        if (healthBarRef.current) {
            healthBarRef.current.TweenSize(
                UDim2.fromScale(ratio, 1),
                Enum.EasingDirection.Out,
                Enum.EasingStyle.Quad,
                0.3,
                true
            )
        }
    }

    return (
        <frame key="Health" Size={UDim2.fromOffset(550, 14)} AnchorPoint={new Vector2(0.5, 1)} BackgroundColor3={Color3.fromHex("#171717")} Position={UDim2.fromScale(0.5, 1).add(UDim2.fromOffset(0, -70))}>
            <uistroke Color={Color3.fromHex("#f5f5f5")} Thickness={1} />
            <uicorner CornerRadius={new UDim(0,3)}/>
            <frame ref={healthBarRef} key="HealthBar" Size={UDim2.fromScale(1, 1)} BorderSizePixel={0}>
                <uicorner CornerRadius={new UDim(0,3)}/>
                <uigradient
                    Color={
                        new ColorSequence(Color3.fromHex("#b9324f"), Color3.fromHex("#ff272b"))
                    }
                />
            </frame>
            <textlabel FontFace={Font.fromName("Balthazar")} TextSize={16} Position={UDim2.fromScale(0.5, 0.5)} AnchorPoint={new Vector2(0.5, 0.5)} TextColor3={Color3.fromHex("#f5f5f5")} Text={`${health} / ${maxHealth}`} />
        </frame>
    )
}