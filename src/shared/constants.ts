export const GAME_NAME = "The Tower";
export const VERSION = "1.0.0";

export enum GameState {
	Lobby = "Lobby",
	Playing = "Playing",
	GameOver = "GameOver",
}

export interface PlayerData {
	userId: number;
	username: string;
	level: number;
	experience: number;
}