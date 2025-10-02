export interface PipelineContext {
	cancelled?: boolean;
}

export interface DamageContext<T = unknown, U = unknown> extends PipelineContext {
	attacker: T;
	victim: U;
	baseDamage: number;
	finalDamage: number;
	applied?: boolean;
	queueHit?: (context: DamageContext<T, U>) => void;
}
