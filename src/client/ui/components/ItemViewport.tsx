import React, { useEffect, useRef } from "@rbxts/react";
import { ItemDef, ItemInstance } from "../../../shared/items";
import { getItemTool } from "../../../shared/items/util";

export function ItemViewport(props: {item: ItemDef | ItemInstance | undefined}) {
    const ref = useRef<ViewportFrame>()

    useEffect(() => {
        if (!ref.current || !props.item) return;

        ref.current.ClearAllChildren();

        const tool = getItemTool(props.item);
        if (!tool) return;

        const world = new Instance("WorldModel");
        world.Parent = ref.current;

        const clone = tool.Clone();
        stripInteractiveDescendants(clone);
        clone.Parent = world;

        const [cf, size] = (clone as Model).GetBoundingBox();
        const maxDim = math.max(size.X, size.Y, size.Z);

        const cam = new Instance("Camera");
        const camPos = cf.Position.add(new Vector3(0, 0, maxDim));
        cam.CFrame = new CFrame(camPos, cf.Position); // look at model center
        cam.Parent = ref.current;

        ref.current.CurrentCamera = cam;

        // Cleanup
        return () => {
            ref.current?.ClearAllChildren();
        };
    }, [props.item]);

    if (!props.item) {
        return (<></>)
    }

    return (
        <viewportframe key="ItemViewport" ImageTransparency={0.25} Size={UDim2.fromScale(1,1)} ref={ref} BackgroundTransparency={1} />
    )
}

function stripInteractiveDescendants(instance: Instance) {
    for (const descendant of instance.GetDescendants()) {
        if (descendant.IsA("BaseScript") || descendant.IsA("RemoteFunction") || descendant.IsA("RemoteEvent")) {
            descendant.Destroy();
        }
    }
}
