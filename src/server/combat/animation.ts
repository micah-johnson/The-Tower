import { AnimationAction, getAnimations } from "../../shared/consts/animations";
import { ItemDef, ItemInstance } from "../../shared/items"

export function playAnimation(props: {
    player: Player, 
    item: ItemDef, 
    action: AnimationAction, 
    index: number, 
    targetLength?: number, 
    reverse?: boolean
}) {
    const humanoid = props.player?.Character?.FindFirstChild("Humanoid") as Humanoid | undefined

    if (!humanoid) return

    let animator = humanoid.FindFirstChild("Animator") as Animator | undefined

    if (!animator) {
        animator = new Instance("Animator")
        animator.Parent = humanoid
    }

    const animationId = getAnimations(props.item, props.action)?.[props.index]

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

	const animationLength = track.Length;

    const ratio = props.targetLength ? (animationLength * 1000) / props.targetLength : 1

    track.Priority = Enum.AnimationPriority.Action
    
    if (props.reverse) track.TimePosition = track.Length
    
    track.Play(0, undefined, props.reverse ? -ratio : ratio)
}