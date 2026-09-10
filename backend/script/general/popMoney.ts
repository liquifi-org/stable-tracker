/** Parse published population strings ("23,600,776 (2025 est.)") into a count + year. */

export interface ParsedPopulation {
    value: number;
    year?: number;
}

const UNIT_MULTIPLIER: Record<string, number> = {
    thousand: 1e3,
    thousands: 1e3,
    million: 1e6,
    millions: 1e6,
    billion: 1e9,
    billions: 1e9,
};

export function parsePopulationCount(text: string): ParsedPopulation | null {
    const compact = text.replace(/,/g, '').replace(/\s+/g, ' ').trim();
    if (!compact) return null;

    const yearMatch = compact.match(/\((?:[A-Za-z]+ )?((?:19|20)\d{2})(?:\s*est\.?)?\)/)
        ?? compact.match(/\b((?:19|20)\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : undefined;

    const withUnit = compact.match(
        /([\d]+(?:\.\d+)?)\s*(thousand|million|billion|thousands|millions|billions)\b/i,
    );
    if (withUnit) {
        const amount = Number(withUnit[1]);
        const mult = UNIT_MULTIPLIER[withUnit[2].toLowerCase()];
        if (!Number.isFinite(amount) || !mult) return null;
        const value = amount * mult;
        if (value < 100 || value > 2e9) return null;
        return { value, year };
    }

    const plain = compact.match(/([\d]{3,11}(?:\.\d+)?)/);
    if (!plain) return null;
    const value = Number(plain[1]);
    if (!Number.isFinite(value) || value < 100 || value > 2e9) return null;
    return { value, year };
}

/** CIA Factbook "People and Society" → Population.total.text */
export function parseFactbookPopulation(node: unknown): ParsedPopulation | null {
    if (!node || typeof node !== 'object') return null;
    const record = node as Record<string, unknown>;
    const total = record.total;
    if (total && typeof total === 'object' && 'text' in total && typeof (total as { text?: unknown }).text === 'string') {
        return parsePopulationCount(String((total as { text: string }).text));
    }
    if (typeof record.text === 'string') {
        return parsePopulationCount(record.text);
    }
    return null;
}

const INFOBOX_KEYS = [
    'size_of_population',
    'population_estimate',
    'population',
    'pop',
];

/** Wikipedia demographics / country infobox → headcount. */
export function parseWikipediaPopulation(wikitext: string): ParsedPopulation | null {
    for (const key of INFOBOX_KEYS) {
        const re = new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]+)`, 'i');
        const match = wikitext.match(re);
        if (!match) continue;
        const parsed = parsePopulationCount(match[1].replace(/<ref[\s\S]*?<\/ref>/gi, '').replace(/\[\[|\]\]/g, ''));
        if (parsed) return parsed;
    }
    return null;
}
