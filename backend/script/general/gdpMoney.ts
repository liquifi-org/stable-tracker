/** Parse published GDP strings ("$884.39 billion (2025 est.)") into USD + year. */

export interface ParsedGdp {
    value: number;
    year?: number;
}

const UNIT_MULTIPLIER: Record<string, number> = {
    k: 1e3,
    thousand: 1e3,
    thousands: 1e3,
    m: 1e6,
    mn: 1e6,
    million: 1e6,
    millions: 1e6,
    b: 1e9,
    bn: 1e9,
    billion: 1e9,
    billions: 1e9,
    t: 1e12,
    tn: 1e12,
    trillion: 1e12,
    trillions: 1e12,
};

export function parseGdpAmount(text: string): ParsedGdp | null {
    const compact = text.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!compact) return null;

    const yearMatch = compact.match(/\((?:nominal[;,]\s*)?(?:ppp[;,]\s*)?(\d{4})(?:\s*est\.?)?\)/i)
        ?? compact.match(/\b((?:19|20)\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : undefined;

    const money = compact.match(
        /\$?\s*([\d]+(?:\.\d+)?)\s*(trillion|billion|million|thousand|trillions|billions|millions|thousands|tn|bn|mn|[tbm])\b/i,
    );
    if (money) {
        const amount = Number(money[1]);
        const unit = money[2].toLowerCase();
        const mult = UNIT_MULTIPLIER[unit];
        if (!Number.isFinite(amount) || !mult) return null;
        return { value: amount * mult, year };
    }

    // Infobox shorthand: "19.80 M" without a currency symbol.
    const short = compact.match(/([\d]+(?:\.\d+)?)\s*([tbm])\b/i);
    if (short) {
        const amount = Number(short[1]);
        const mult = UNIT_MULTIPLIER[short[2].toLowerCase()];
        if (!Number.isFinite(amount) || !mult) return null;
        return { value: amount * mult, year };
    }

    return null;
}

function pickYear(text: string, explicit?: number): number | undefined {
    if (explicit && explicit >= 1990 && explicit <= 2100) return explicit;
    return parseGdpAmount(text)?.year;
}

/** CIA Factbook "GDP (official exchange rate)" / PPP node → USD. */
export function parseFactbookGdp(node: unknown): ParsedGdp | null {
    if (!node || typeof node !== 'object') return null;
    const record = node as Record<string, unknown>;
    if (typeof record.text === 'string') {
        return parseGdpAmount(record.text);
    }
    let best: ParsedGdp | null = null;
    for (const [key, value] of Object.entries(record)) {
        if (key === 'note' || value == null) continue;
        const text = typeof value === 'string'
            ? value
            : typeof value === 'object' && value !== null && 'text' in value
            ? String((value as { text?: unknown }).text ?? '')
            : '';
        if (!text) continue;
        const parsed = parseGdpAmount(`${key} ${text}`);
        if (!parsed) continue;
        const year = parsed.year ?? pickYear(key);
        const candidate = year ? { ...parsed, year } : parsed;
        if (!best || (candidate.year ?? 0) > (best.year ?? 0)) best = candidate;
    }
    return best;
}

/** First usable GDP figure in a Wikipedia economy infobox. Prefers a nominal year. */
export function parseWikipediaGdp(wikitext: string): ParsedGdp | null {
    const gdpBlock = wikitext.match(/\|\s*gdp\s*=\s*([\s\S]{0,800}?)(?:\n\s*\||$)/i);
    if (!gdpBlock) return null;
    const block = gdpBlock[1];
    const nominal = block.match(/\$[\d.,]+\s*(?:trillion|billion|million)[^\n]*nominal[^\n]*/i);
    if (nominal) {
        const parsed = parseGdpAmount(nominal[0]);
        if (parsed) return parsed;
    }
    return parseGdpAmount(block);
}
