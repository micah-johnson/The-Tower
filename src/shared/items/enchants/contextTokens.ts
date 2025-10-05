import { createContextToken } from ".";

import type { ServerInventoryState } from "../../../server/inventory";
import type { ServerPlayerState } from "../../../server/player";
import type { ServerDamageCoordinator } from "../../../server/combat/damageCoordinator";
import type { ServerMovementState } from "../../../server/movement";

export const MovementContextToken = createContextToken<ServerMovementState>("server.movementState");
export const InventoryContextToken = createContextToken<ServerInventoryState>("server.inventoryState");
export const PlayerContextToken = createContextToken<ServerPlayerState>("server.playerState");
export const DamageCoordinatorContextToken = createContextToken<ServerDamageCoordinator>("server.damageCoordinator");

