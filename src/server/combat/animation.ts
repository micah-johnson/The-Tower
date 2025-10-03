import { AnimationAction, getAnimations } from "../../shared/consts/animations";
import { ItemDef, ItemInstance } from "../../shared/items"

export function playAnimation(player: Player, item: ItemDef, action: AnimationAction, index: number, targetLength: number) {
    print(player, item, action, index, targetLength)
    const humanoid = player?.Character?.FindFirstChild("Humanoid") as Humanoid | undefined

    if (!humanoid) return

    let animator = humanoid.FindFirstChild("Animator") as Animator | undefined

    if (!animator) {
        animator = new Instance("Animator")
        animator.Parent = humanoid
    }

    const animationId = getAnimations(item, action)?.[index]

    print(animationId)
    
    if (!animationId) return

    const animation = new Instance("Animation");
	animation.AnimationId = animationId;

    const track = animator.LoadAnimation(animation)

    if (track.Length === 0) {
        print("Waiting For Metadata")
        track.GetPropertyChangedSignal("Length").Wait(); // wait until metadata loads
    }

    print("Metadata")

	const animationLength = track.Length; // seconds at speed=1

    const ratio = (animationLength * 1000) / targetLength // convert animation length to ms

    track.Priority = Enum.AnimationPriority.Action

    print(ratio, track.Animation?.AnimationId)
    
    track.Play(0, undefined, ratio)
}