import { WorldRegion } from './WorldRegion';

/** Three-bucket macro-region grouping used for regional roll-ups. */
export enum MacroRegion {
    APAC = 'APAC',
    AMERICAS = 'Americas',
    EMEIA = 'EMEIA',
}

export const MACRO_REGION_VALUES: readonly string[] = Object.values(MacroRegion);

const WORLD_REGION_TO_MACRO: Partial<Record<WorldRegion, MacroRegion>> = {
    [WorldRegion.NORTH_AMERICA]: MacroRegion.AMERICAS,
    [WorldRegion.LATIN_AMERICA]: MacroRegion.AMERICAS,
    [WorldRegion.CARIBBEAN]: MacroRegion.AMERICAS,
    [WorldRegion.CENTRAL_AMERICA]: MacroRegion.AMERICAS,
    [WorldRegion.EUROPE]: MacroRegion.EMEIA,
    [WorldRegion.EU]: MacroRegion.EMEIA,
    [WorldRegion.MENA]: MacroRegion.EMEIA,
    [WorldRegion.SUB_SAHARAN_AFRICA]: MacroRegion.EMEIA,
    [WorldRegion.SOUTH_ASIA]: MacroRegion.APAC,
    [WorldRegion.EAST_ASIA]: MacroRegion.APAC,
    [WorldRegion.SOUTHEAST_ASIA]: MacroRegion.APAC,
    [WorldRegion.CENTRAL_ASIA]: MacroRegion.APAC,
    [WorldRegion.OCEANIA]: MacroRegion.APAC,
    // WorldRegion.OTHER is intentionally unmapped — excluded from regional roll-ups.
};

/** Maps a country's WorldRegion to its macro-region bucket (APAC / Americas / EMEIA), or null if unmapped. */
export function toMacroRegion(region: string): MacroRegion | null {
    return WORLD_REGION_TO_MACRO[region as WorldRegion] ?? null;
}
