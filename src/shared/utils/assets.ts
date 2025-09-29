import { t } from "@rbxts/t";

export type AssetId = string & { [assetBrand: string]: void };

const ASSET_REGEX = "^rbxassetid://%d+$";

export function isAssetId(v: unknown): v is AssetId {
    if (typeOf(v) !== "string") return false;
    return string.match(v as string, ASSET_REGEX) !== undefined;
}

export function assertAssetId(v: unknown): AssetId {
    if (!isAssetId(v)) throw `Invalid AssetId ${tostring(v)} (expected rbxassetid://<number>)`;
    return v as AssetId;
}

// fapp fap shit fard fard
export const asset = assertAssetId;
// am shidding farrrrdddfa
const tAssetId: t.check<AssetId> = (v): v is AssetId => isAssetId(v);