import { PlayerRepository } from "./player/repository";
import { CombatHandler } from "./combat/handler";
import { ServerDamageCoordinator } from "./combat/damageCoordinator";

export const damageCoordinator = new ServerDamageCoordinator();
export const playerRepository = new PlayerRepository(damageCoordinator);
export const combatHandler = new CombatHandler(playerRepository, damageCoordinator);
