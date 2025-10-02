import ProfileStore from "@rbxts/profile-store";
import { Players } from "@rbxts/services";
import { ItemInstance } from "../shared/items";
import { InventorySnapshot } from "../shared/network";
import { playerRepository } from "./player/repository";

const PROFILE_TEMPLATE: {
    cum: number,
    inventory: InventorySnapshot,
} = {
    cum: 0,
    inventory: {
        _version: 0,
        slots: {},
        items: {},
    },
};

const PlayerStore = ProfileStore.New("PlayerStore", PROFILE_TEMPLATE)

const profiles: Record<number, ReturnType<typeof PlayerStore.StartSessionAsync>> = {}

export type PlayerProfile = ReturnType<typeof PlayerStore.StartSessionAsync>;

export function getProfile(player: Player) {
    return profiles[player.UserId]
}

Players.PlayerAdded.Connect((player) => {
    const profile = PlayerStore.StartSessionAsync(`${player.UserId}`, {
        Cancel: () => player.Parent !== Players
    })

    if (!profile) {
        player.Kick("Profile failed to load, please rejoin")

        return;
    }

    profile.AddUserId(player.UserId)
    profile.Reconcile()

    profile.OnSessionEnd.Connect(() => {
        playerRepository.unbind(player);
        delete profiles[player.UserId]
        player.Kick("Session Ended, please reconnect")
    })

    if (player.Parent === Players) {
        profiles[player.UserId] = profile
        playerRepository.bind(player, profile)
    } else {
        // Player left before session started
        profile.EndSession()
    }
});