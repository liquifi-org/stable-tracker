import { describe, expect, it } from 'vitest';
import {
    parseFactbookPopulation,
    parsePopulationCount,
    parseWikipediaPopulation,
} from '../../../script/general/popMoney';

describe('parsePopulationCount', () => {
    it('parses a Factbook headcount with commas and year', () => {
        expect(parsePopulationCount('23,600,776 (2025 est.)')).toEqual({
            value: 23_600_776,
            year: 2025,
        });
    });

    it('parses a million-unit estimate', () => {
        expect(parsePopulationCount('23.4 million (2024)')).toEqual({
            value: 23.4e6,
            year: 2024,
        });
    });

    it('parses a month-year parenthetical', () => {
        expect(parsePopulationCount('23,243,565 (June 2026)')).toEqual({
            value: 23_243_565,
            year: 2026,
        });
    });
});

describe('parseFactbookPopulation', () => {
    it('reads Population.total.text', () => {
        expect(
            parseFactbookPopulation({
                total: { text: '23,600,776 (2025 est.)' },
                male: { text: '11,596,835' },
            }),
        ).toEqual({ value: 23_600_776, year: 2025 });
    });
});

describe('parseWikipediaPopulation', () => {
    it('reads size_of_population from a demographics infobox', () => {
        const wikitext = `
{{Infobox place demographics
|place = [[Taiwan]]
|size_of_population=23,243,565 (June 2026)
|nation=Taiwanese
}}
`;
        const parsed = parseWikipediaPopulation(wikitext);
        expect(parsed?.value).toBe(23_243_565);
        expect(parsed?.year).toBe(2026);
    });
});
