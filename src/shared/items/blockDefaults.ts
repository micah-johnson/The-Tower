import { BlockConfig, BlockOutcome, BlockReactionType, ItemSubType, ItemType } from ".";

export type PartialBlockConfig = Partial<Omit<BlockConfig, "parry" | "block">> & {
    parry?: Partial<BlockOutcome>;
    block?: Partial<BlockOutcome>;
};

const NONE_REACTION = { type: BlockReactionType.NONE } as const;

const BASE_CONFIG: BlockConfig = {
    enabled: false,
    parryWindowMs: 150,
    defenderPriority: undefined,
    parry: {
        damageMultiplier: 0,
        counterDamage: 0,
        reaction: NONE_REACTION,
    },
    block: {
        damageMultiplier: 1,
        counterDamage: 0,
        reaction: NONE_REACTION,
    },
};

function normalizeOutcome(base: BlockOutcome, overrides?: Partial<BlockOutcome>): BlockOutcome {
    return {
        damageMultiplier: overrides?.damageMultiplier ?? base.damageMultiplier ?? 0,
        counterDamage: overrides?.counterDamage ?? base.counterDamage ?? 0,
        reaction: overrides?.reaction ? { ...overrides.reaction } : base.reaction ? { ...base.reaction } : { ...NONE_REACTION },
    };
}

export function cloneBlockConfig(config: BlockConfig): BlockConfig {
    const parry = (config.parry ?? BASE_CONFIG.parry) as BlockOutcome;
    const block = (config.block ?? BASE_CONFIG.block) as BlockOutcome;
    return {
        enabled: config.enabled ?? BASE_CONFIG.enabled,
        parryWindowMs: config.parryWindowMs ?? BASE_CONFIG.parryWindowMs,
        defenderPriority: config.defenderPriority,
        parry: normalizeOutcome(parry),
        block: normalizeOutcome(block),
    };
}

function mergeConfig(base: BlockConfig, overrides?: PartialBlockConfig): BlockConfig {
    const result = cloneBlockConfig(base);

    if (!overrides) {
        return result;
    }

    result.enabled = overrides.enabled ?? result.enabled;
    result.parryWindowMs = overrides.parryWindowMs ?? result.parryWindowMs;
    result.defenderPriority = overrides.defenderPriority ?? result.defenderPriority;
    const parryBase = (result.parry ?? BASE_CONFIG.parry) as BlockOutcome;
    const blockBase = (result.block ?? BASE_CONFIG.block) as BlockOutcome;

    result.parry = normalizeOutcome(parryBase, overrides.parry);
    result.block = normalizeOutcome(blockBase, overrides.block);

    return result;
}

const TYPE_DEFAULTS: Partial<Record<ItemType, BlockConfig>> = {
    [ItemType.WEAPON]: mergeConfig(BASE_CONFIG, {
        enabled: true,
        parry: {
            damageMultiplier: 0,
            counterDamage: 20,
        },
        block: {
            damageMultiplier: 0.5,
        },
    }),
    [ItemType.TOOL]: mergeConfig(BASE_CONFIG, {
        enabled: true,
        block: {
            damageMultiplier: 0.7,
        },
    }),
};

const SUBTYPE_DEFAULTS: Partial<Record<ItemType, Partial<Record<string, BlockConfig>>>> = {
    [ItemType.WEAPON]: {
        [ItemSubType[ItemType.WEAPON].SWORD]: mergeConfig(TYPE_DEFAULTS[ItemType.WEAPON]!),
        [ItemSubType[ItemType.WEAPON].BOW]: mergeConfig(TYPE_DEFAULTS[ItemType.WEAPON]!, {
            parryWindowMs: 100,
            parry: {
                counterDamage: 5,
            },
            block: {
                damageMultiplier: 0.85,
                reaction: { type: BlockReactionType.DISABLE, duration: 2, durabilityDamage: 4 },
            },
        }),
    },
};

export function getDefaultBlockConfig(itemType: ItemType, itemSubtype?: string): BlockConfig | undefined {
    const subtypeDefaults = itemSubtype ? SUBTYPE_DEFAULTS[itemType]?.[itemSubtype] : undefined;
    if (subtypeDefaults) {
        return cloneBlockConfig(subtypeDefaults);
    }

    const typeDefault = TYPE_DEFAULTS[itemType];
    if (typeDefault) {
        return cloneBlockConfig(typeDefault);
    }

    return cloneBlockConfig(BASE_CONFIG);
}

export function buildBlockConfig(itemType: ItemType, itemSubtype: string | undefined, overrides?: PartialBlockConfig): BlockConfig {
    const base = getDefaultBlockConfig(itemType, itemSubtype) ?? cloneBlockConfig(BASE_CONFIG);
    return mergeConfig(base, overrides);
}
