import { Debris, Players, RunService } from "@rbxts/services";
import { Attribute } from "../../shared/items";
import type { PlayerRepository } from "../player/repository";
import { ServerPlayerState } from "../player";
import type { ServerDamageContext } from "./damageCoordinator";
import { ServerDamageCoordinator } from "./damageCoordinator";
import { playAnimation } from "./animation";
import { AnimationAction } from "../../shared/consts/animations";
import { itemRepository } from "../../shared/items/repository";
import { t } from "@rbxts/t";

export class CombatHandler {
    constructor(
        private readonly playerRepository: PlayerRepository,
        private readonly coordinator: ServerDamageCoordinator,
    ) {}

    register(tool: Tool) {
        tool.Equipped.Connect(() => {
            const handle = tool.FindFirstChild("Handle") as Part | undefined

            if (!handle || !handle.IsA("Part")) return;

            const owner = getPlayerFromChild(tool)

            if (!owner) return

            const ownerState = this.playerRepository.getByPlayer(owner)

            if (!ownerState) return;

            const activationHandler = tool.Activated.Connect(() => this.handleActivation(handle, ownerState))

            tool.Unequipped.Once(() => activationHandler.Disconnect())
        })
    }

    handleActivation(handle: Part, player: ServerPlayerState) {
        if (!this.canSwing(player)) return;

        const baseAttackSpeed = math.max(player.getAttributeValue(Attribute.ATTACK_SPEED), 50);
        const boostMultiplier = player.combatState.consumeNextSwingSpeedMultiplier() ?? 1;
        const effectiveAttackSpeed = math.max(50, baseAttackSpeed / math.max(boostMultiplier, 1e-3));

        player.combatState.setLastSwing(DateTime.now().UnixTimestampMillis, effectiveAttackSpeed);

        const track = playAnimation({
            player: player.player,
            item: itemRepository.get(player.inventoryState.getEquippedItem()!.id)!,
            action: AnimationAction.LMB,
            index: 0,
            targetLength: effectiveAttackSpeed,
        });

        if (!track) return;

        // --- compute real-time windows correctly ---
        const nowMs = DateTime.now().UnixTimestampMillis;
        const speed = math.max(1e-6, math.abs(track.Speed)); // avoid div-by-zero
        const pos = track.TimePosition;                       // seconds

        const tStart = track.GetTimeOfKeyframe("DamageStart"); // seconds on clip
        const tEnd   = track.GetTimeOfKeyframe("DamageEnd");

        // time until each marker in seconds, then to ms
        const startDelayMs = math.max(0, ((tStart - pos) / speed) * 1000);
        const endDelayMs   = math.max(0, ((tEnd   - pos) / speed) * 1000);

        const startWindow = nowMs + startDelayMs;
        const endWindow   = nowMs + endDelayMs;

        let trail = handle.FindFirstChild("Trail") as Trail | undefined;

        let windowOpened = false

        let conn = RunService.Heartbeat.Connect(() => {
            if (DateTime.now().UnixTimestampMillis >= endWindow) {
                if (trail) trail.Enabled = false
                conn.Disconnect()
            } else if (DateTime.now().UnixTimestampMillis >= startWindow) {
                if (trail) trail.Enabled = true

                if (!windowOpened) {
                    for (const other of handle.GetTouchingParts()) {
                        const victim = getPlayerFromChild(other)

                        if (!victim || victim === player.player) continue;

                        const victimState = this.playerRepository.getByPlayer(victim)

                        if (!player || !victimState) continue;

                        this.handleTouch(player, victimState)
                    }
                }

                windowOpened = true
            }
        });

        const listener = handle.Touched.Connect(other => {
            if (DateTime.now().UnixTimestampMillis > startWindow && DateTime.now().UnixTimestampMillis < endWindow) {
                const victim = getPlayerFromChild(other)

                if (!victim) return;

                const victimState = this.playerRepository.getByPlayer(victim)

                if (!player || !victimState) return;

                this.handleTouch(player, victimState)
            }
        })

        track.Ended.Connect(() => {
            listener.Disconnect()
        })
    }

    isSwinging(player: ServerPlayerState) {
        const baseAttackSpeed = math.max(player.getAttributeValue(Attribute.ATTACK_SPEED), 50);
        const cooldown = player.combatState.getLastSwingCooldown() ?? baseAttackSpeed;
        return DateTime.now().UnixTimestampMillis - player.combatState.getLastSwing() < cooldown;
    }

    canSwing(player: ServerPlayerState) {
        return player.inventoryState.getEquippedItem() && !this.isSwinging(player) && !player.blockState.isBlockingActive()
    }

    canAttack(attacker: ServerPlayerState, victim: ServerPlayerState) {
        const lastDamaged = victim.combatState.getLastDamaged(attacker.player) ?? -1

        const baseAttackSpeed = math.max(attacker.getAttributeValue(Attribute.ATTACK_SPEED), 50);
        const cooldown = attacker.combatState.getLastSwingCooldown() ?? baseAttackSpeed;
        return DateTime.now().UnixTimestampMillis - lastDamaged > cooldown
    }

    handleTouch(attacker: ServerPlayerState, victim: ServerPlayerState) {
        if (!this.isSwinging(attacker)) return

        if (!this.canAttack(attacker, victim)) return

        const baseDamage = attacker.getAttributeValue(Attribute.DAMAGE)

        const context: ServerDamageContext = {
            attacker,
            victim,
            baseDamage,
            finalDamage: baseDamage,
            cancelled: false,
        }

        const result = this.coordinator.apply(context)

        if (result.applied) {
            this.applyKnockback(attacker.player, victim.player)
            victim.combatState.setLastDamaged(attacker.player, DateTime.now().UnixTimestampMillis)
        }
    }

    applyKnockback(
        attacker: Player,
        victim: Player,
        opts?: { horizontal?: number; vertical?: number; duration?: number },
    ) {
        const victimRoot = victim.Character?.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
        const attackerRoot = attacker.Character?.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
        if (!victimRoot || !attackerRoot) return;

        const horizontal = opts?.horizontal ?? 0.1; // how hard to push back
        const vertical = opts?.vertical ?? 1;     // upward lift
        const duration = opts?.duration ?? 0.1;   // seconds to keep the push

        // Direction from attacker -> victim (fallback to attacker's facing if overlapping)
        const offset = victimRoot.Position.sub(attackerRoot.Position);
        const dir = offset.Magnitude > 1e-3 ? offset.Unit : attackerRoot.CFrame.LookVector;

        // Attachment + LinearVelocity for a brief burst
        const attachment = new Instance("Attachment");
        attachment.Parent = victimRoot;

        const lv = new Instance("LinearVelocity");
        lv.Attachment0 = attachment;
        lv.MaxForce = math.huge; // unlimited for the brief burst
        lv.VectorVelocity = dir.mul(horizontal).add(new Vector3(0, vertical, 0));
        lv.Parent = victimRoot;

        // Auto-cleanup after the burst
        Debris.AddItem(lv, duration);
        Debris.AddItem(attachment, duration);
    }
}

// Attempts to grab player from child object under player model
export function getPlayerFromChild(part: Instance) {
    const model = part.Parent as Model | undefined;
    const humanoid = model?.FindFirstChildOfClass("Humanoid");
    if (!humanoid) return;

    const player = Players.GetPlayerFromCharacter(model);
    if (!player) return;

    return player
}
