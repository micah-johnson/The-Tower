import { GuiService } from "@rbxts/services";

export function adjustForInset(position: Vector2) {
    const [inset] = GuiService.GetGuiInset();
    return position.add(inset)
};