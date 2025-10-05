import type { DamageContext } from "../../combat";
import type { PipelineModifier } from "../../combat/pipeline";
import type { ItemDef, ItemInstance } from "..";
import { ItemSubType, ItemType } from "..";

export interface Property<T> {
	readonly resolve: (binding: EnchantBinding) => T | undefined;
}

export function createProperty<T>(
	resolver: (binding: EnchantBinding) => T | undefined,
): Property<T> {
	return {
		resolve: resolver,
	};
}

export function createClampedNumberProperty(
	opts: {
		readonly resolver: (binding: EnchantBinding) => number | undefined;
		readonly min: number;
		readonly max: number;
	},
): Property<number> {
	return createProperty((binding) => {
		const value = opts.resolver(binding);
		if (value === undefined) {
			return undefined;
		}
		return math.clamp(value, opts.min, opts.max);
	});
}

export function createEnumProperty<TValue>(
	allowed: ReadonlyArray<TValue>,
	resolver: (binding: EnchantBinding) => TValue | undefined,
): Property<TValue> {
	return createProperty((binding) => {
		const value = resolver(binding);
		if (value === undefined) {
			return undefined;
		}
		for (const entry of allowed) {
			if (entry === value) {
				return value;
			}
		}
		return undefined;
	});
}

export const EnchantPhase = {
	Attacker: 0,
	Defender: 1,
	PostHit: 2,
} as const;

export type EnchantPhaseId = typeof EnchantPhase[keyof typeof EnchantPhase];

export interface ContextToken<TValue> {
	readonly description: string;
}

export function createContextToken<TValue>(description: string): ContextToken<TValue> {
	return { description } as ContextToken<TValue>;
}

interface BindingContextWriter {
	set<TValue>(token: ContextToken<TValue>, value: TValue): void;
}

export interface EnchantBinding {
	readonly definition: ItemDef;
	readonly instance: ItemInstance;
	get<TValue>(property: Property<TValue>): TValue | undefined;
	getContext<TValue>(token: ContextToken<TValue>): TValue | undefined;
}

export type EnchantMatcher = (binding: EnchantBinding) => boolean;

export function allOf(...matchers: ReadonlyArray<EnchantMatcher>): EnchantMatcher {
	return (binding) => matchers.every((matcher) => matcher(binding));
}

export function anyOf(...matchers: ReadonlyArray<EnchantMatcher>): EnchantMatcher {
	return (binding) => matchers.some((matcher) => matcher(binding));
}

export function matchItemTypes(...types: ReadonlyArray<ItemType>): EnchantMatcher {
	return (binding) => {
		for (const itemType of types) {
			if (binding.definition.type === itemType) {
				return true;
			}
		}
		return false;
	};
}

export function excludeItemTypes(...types: ReadonlyArray<ItemType>): EnchantMatcher {
	const blocked = matchItemTypes(...types);
	return (binding) => !blocked(binding);
}

export function matchItemSubTypes<TType extends ItemType>(
	itemType: TType,
	...subtypes: ReadonlyArray<(typeof ItemSubType)[TType][keyof (typeof ItemSubType)[TType]]>
): EnchantMatcher {
	return (binding) => {
		if (binding.definition.type !== itemType) {
			return false;
		}
		if (!("subtype" in binding.definition)) {
			return false;
		}
		const definitionSubtype = (binding.definition as { subtype?: string }).subtype;
		for (const allowed of subtypes) {
			if (definitionSubtype === allowed) {
				return true;
			}
		}
		return false;
	};
}

export function excludeItemSubTypes<TType extends ItemType>(
	itemType: TType,
	...subtypes: ReadonlyArray<(typeof ItemSubType)[TType][keyof (typeof ItemSubType)[TType]]>
): EnchantMatcher {
	const blocked = matchItemSubTypes(itemType, ...subtypes);
	return (binding) => !blocked(binding);
}

export interface EnchantHook<TContext extends DamageContext<any, any>>
extends PipelineModifier<TContext> {
	readonly phase: EnchantPhaseId;
	dispose?(): void;
}

export type EnchantCtor<
	P extends EnchantPhaseId = EnchantPhaseId,
	TContext extends DamageContext<any, any> = DamageContext<any, any>,
> = new (
	binding: EnchantBinding,
	priority: number,
	phase: P,
) => EnchantHook<TContext>;

export interface EnchantContext<
	P extends EnchantPhaseId = EnchantPhaseId,
	TContext extends DamageContext<any, any> = DamageContext<any, any>,
> {
	readonly phase: P;
	readonly priority: number;
	readonly matcher: EnchantMatcher;
	readonly ctor: EnchantCtor<P, TContext>;
}

export interface EnchantOptions<P extends EnchantPhaseId> {
	readonly phase: P;
	readonly matcher: EnchantMatcher;
	readonly priority?: number;
}

const DEFAULT_PRIORITY = 50;

const contextsByCtor = new Map<EnchantCtor<any, any>, EnchantContext<any, any>>();
const contextsByPhase = new Map<EnchantPhaseId, EnchantContext<any, any>[]>();

function registerContext<P extends EnchantPhaseId, TContext extends DamageContext<any, any>>(
	context: EnchantContext<P, TContext>,
) {
	if (contextsByCtor.has(context.ctor)) {
		error(
			`Duplicate registration for ${(context.ctor as { name?: string }).name ?? "<anonymous>"}`,
		);
	}
	contextsByCtor.set(context.ctor, context);
	const bucket = contextsByPhase.get(context.phase) ?? [];
	bucket.push(context);
	bucket.sort((left, right) => left.priority > right.priority);
	contextsByPhase.set(context.phase, bucket);
}

export function Enchant<P extends EnchantPhaseId, TContext extends DamageContext<any, any> = DamageContext<any, any>>(
	options: EnchantOptions<P>,
) {
	return <C extends EnchantCtor<P, TContext>>(ctor: C) => {
		const context: EnchantContext<P, TContext> = {
			phase: options.phase,
			priority: options.priority ?? DEFAULT_PRIORITY,
			matcher: options.matcher,
			ctor,
		};
		registerContext(context);
		return ctor;
	};
}

export function getContextsByPhase<P extends EnchantPhaseId>(
	phase: P,
): ReadonlyArray<EnchantContext<P, any>> {
	return contextsByPhase.get(phase) ?? [];
}

export function getAllContexts(): ReadonlyArray<EnchantContext> {
	const contexts = new Array<EnchantContext>();
	contextsByCtor.forEach((context) => contexts.push(context));
	return contexts;
}

export function createBinding(
	definition: ItemDef,
	instance: ItemInstance,
	initializeContexts?: (writer: BindingContextWriter) => void,
): EnchantBinding {
	const cache = new Map<Property<unknown>, unknown>();
	const contexts = new Map<ContextToken<any>, unknown>();

	if (initializeContexts) {
		const writer: BindingContextWriter = {
			set(token, value) {
				contexts.set(token as ContextToken<any>, value as unknown);
			},
		};
		initializeContexts(writer);
	}

	const binding: EnchantBinding = {
		definition,
		instance,
		get<TValue>(property: Property<TValue>) {
			if (cache.has(property as Property<unknown>)) {
				return cache.get(property as Property<unknown>) as TValue | undefined;
			}
			const value = property.resolve(binding);
			cache.set(property as Property<unknown>, value as unknown);
			return value;
		},
		getContext<TValue>(token: ContextToken<TValue>) {
			if (!contexts.has(token as ContextToken<any>)) {
				return undefined;
			}
			return contexts.get(token as ContextToken<any>) as TValue | undefined;
		},
	};
	return binding;
}

export function instantiateEnchant<T extends DamageContext<any, any>>(
	context: EnchantContext<EnchantPhaseId, T>,
	binding: EnchantBinding,
): EnchantHook<T> {
	return new context.ctor(binding, context.priority, context.phase);
}

export function collectEnchantHooks<TContext extends DamageContext<any, any> = DamageContext<any, any>>(
	binding: EnchantBinding,
	phases?: ReadonlyArray<EnchantPhaseId>,
): ReadonlyArray<EnchantHook<TContext>> {
	const selected = new Array<EnchantContext<EnchantPhaseId, TContext>>();
	if (phases) {
		for (const phase of phases) {
			const bucket = contextsByPhase.get(phase);
			if (!bucket) continue;
			for (const context of bucket) {
				selected.push(context as EnchantContext<EnchantPhaseId, TContext>);
			}
		}
	} else {
		contextsByCtor.forEach((context) => {
			selected.push(context as EnchantContext<EnchantPhaseId, TContext>);
		});
	}
	const hooks = new Array<EnchantHook<TContext>>();
	for (const context of selected) {
		if (!context.matcher(binding)) {
			continue;
		}
		hooks.push(instantiateEnchant(context as EnchantContext<EnchantPhaseId, TContext>, binding));
	}
	return hooks;
}

export abstract class AbstractEnchant<
	T extends DamageContext<any, any>,
	P extends EnchantPhaseId = EnchantPhaseId,
> implements EnchantHook<T>
{
	readonly priority: number;
	protected readonly binding: EnchantBinding;
	readonly phase: P;

	protected constructor(binding: EnchantBinding, priority: number, phase: P) {
		this.binding = binding;
		this.priority = priority;
		this.phase = phase;
	}

	abstract apply(context: T): T | void;
}

export function resetEnchantRegistryForTesting() {
	contextsByCtor.clear();
	contextsByPhase.clear();
}
