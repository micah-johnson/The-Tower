import { TweenService, RunService } from "@rbxts/services";
import { Signal } from "../../shared/utils/signal";

const SLOWDOWN_TIME = 0.3;
const SPEEDUP_TIME = 1;

export type MovementModifierId = "block" | "effect" | string;

export interface MovementModifier {
    id: MovementModifierId;
    priority?: number;
    compute(baseSpeed: number): number;
}

export class ServerMovementState {
    readonly WalkSpeedChanged = new Signal<[number]>();

    private humanoid?: Humanoid;
    private baseSpeed = 16;
    private modifiers = new Array<MovementModifier>();
    private activeModifierIds = new Set<MovementModifierId>();
    private targetSpeed = this.baseSpeed;
    private lastAppliedSpeed = this.baseSpeed;
    private tween?: Tween;

    constructor(private readonly player: Player) {}

    attachHumanoid(humanoid: Humanoid) {
        this.humanoid = humanoid;
        this.baseSpeed = humanoid.WalkSpeed;
        this.lastAppliedSpeed = humanoid.WalkSpeed;
        this.targetSpeed = humanoid.WalkSpeed;
        this.humanoid.Destroying.Once(() => this.detachHumanoid());
    }

    detachHumanoid() {
        this.humanoid = undefined;
        this.tween?.Cancel();
        this.tween = undefined;
    }

    setBaseSpeed(speed: number) {
        this.baseSpeed = speed;
        this.recomputeTarget();
    }

    setModifier(modifier: MovementModifier) {
        this.removeModifier(modifier.id);
        this.modifiers.push(modifier);
        this.modifiers.sort((a, b) => (b.priority ?? 0) < (a.priority ?? 0));
        this.activeModifierIds.add(modifier.id);
        this.recomputeTarget();
    }

    removeModifier(id: MovementModifierId) {
        if (!this.activeModifierIds.has(id)) {
            return;
        }

        this.activeModifierIds.delete(id);
        this.modifiers = this.modifiers.filter((mod) => mod.id !== id);
        this.recomputeTarget();
    }

    private recomputeTarget() {
        const humanoid = this.ensureHumanoid();
        if (!humanoid) {
            return;
        }

        let speed = this.baseSpeed;
        for (const modifier of this.modifiers) {
            speed = modifier.compute(speed);
        }
        speed = math.max(speed, 0);

        const previousTarget = this.targetSpeed;
        this.targetSpeed = speed;

        const duration = this.chooseDuration(previousTarget, speed);
        this.applyTarget(humanoid, speed, duration);
    }

    private chooseDuration(previous: number, targetSpeed: number) {
        if (previous <= targetSpeed) {
            return SPEEDUP_TIME;
        }
        return SLOWDOWN_TIME;
    }

    private applyTarget(humanoid: Humanoid, speed: number, duration: number) {
        this.tween?.Cancel();

        if (duration <= 0) {
            humanoid.WalkSpeed = speed;
            this.lastAppliedSpeed = speed;
            this.WalkSpeedChanged.Fire(speed);
            return;
        }

        const tweenInfo = new TweenInfo(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);
        const tween = TweenService.Create(humanoid, tweenInfo, { WalkSpeed: speed });
        this.tween = tween;

        tween.Play();
        tween.Completed.Once(() => {
            if (this.tween === tween) {
                this.lastAppliedSpeed = humanoid.WalkSpeed;
                this.tween = undefined;
            }
        });

        RunService.Heartbeat.Once(() => {
            this.WalkSpeedChanged.Fire(humanoid.WalkSpeed);
        });
    }

    private ensureHumanoid() {
        if (this.humanoid) {
            return this.humanoid;
        }

        const character = this.player.Character;
        if (!character) {
            return undefined;
        }

        const humanoid = character.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
        if (!humanoid) {
            return undefined;
        }

        this.attachHumanoid(humanoid);
        return humanoid;
    }
}
