export enum WorldRegion {
    NORTH_AMERICA = 'North America',
    LATIN_AMERICA = 'Latin America',
    EUROPE = 'Europe',
    EU = 'EU', // European Union jurisdictions (passported licenses)
    MENA = 'MENA', // Middle East & North Africa
    SUB_SAHARAN_AFRICA = 'Sub-Saharan Africa',
    SOUTH_ASIA = 'South Asia',
    EAST_ASIA = 'East Asia',
    SOUTHEAST_ASIA = 'Southeast Asia',
    CENTRAL_ASIA = 'Central Asia',
    OCEANIA = 'Oceania',
    CARIBBEAN = 'Caribbean',
    CENTRAL_AMERICA = 'Central America',
    OTHER = 'Other',
}

export const WORLD_REGION_VALUES: readonly string[] = Object.values(WorldRegion);
