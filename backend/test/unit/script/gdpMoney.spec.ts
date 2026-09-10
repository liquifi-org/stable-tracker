import { describe, expect, it } from 'vitest';
import { parseFactbookGdp, parseGdpAmount, parseWikipediaGdp } from '../../../script/general/gdpMoney';

describe('parseGdpAmount', () => {
    it('parses Factbook official-exchange-rate text', () => {
        expect(parseGdpAmount('$611.391 billion (2023 est.)')).toEqual({
            value: 611.391e9,
            year: 2023,
        });
    });

    it('parses IMF-style Taiwan infobox line', () => {
        const parsed = parseGdpAmount('$884.39 billion (nominal; 2025)');
        expect(parsed?.value).toBeCloseTo(884.39e9);
        expect(parsed?.year).toBe(2025);
    });

    it('parses Vatican shorthand without a dollar sign', () => {
        expect(parseGdpAmount('19.80 M')).toEqual({ value: 19.8e6, year: undefined });
    });

    it('parses millions', () => {
        expect(parseGdpAmount('$24.938 million (2016)')).toEqual({
            value: 24.938e6,
            year: 2016,
        });
    });
});

describe('parseFactbookGdp', () => {
    it('reads a single official-exchange-rate node', () => {
        expect(
            parseFactbookGdp({ text: '$1.598 billion (2024 est.)' }),
        ).toEqual({ value: 1.598e9, year: 2024 });
    });

    it('picks the newest PPP year from a keyed node', () => {
        const parsed = parseFactbookGdp({
            'Real GDP (purchasing power parity) 2021': { text: '$18.7 million (2021 est.)' },
            'Real GDP (purchasing power parity) 2020': { text: '$19.9 million (2020 est.)' },
        });
        expect(parsed?.year).toBe(2021);
        expect(parsed?.value).toBeCloseTo(18.7e6);
    });
});

describe('parseWikipediaGdp', () => {
    it('prefers the nominal figure in a plainlist infobox', () => {
        const wikitext = `
| country = Taiwan
| gdp = {{plainlist|
*{{increase}}  $884.39 billion ([[Nominal GDP|nominal]]; 2025)<ref name="IMFWEODE"/>
*{{increase}} $1.99 trillion (PPP; 2025)
}}
| gdp rank = 22nd
`;
        const parsed = parseWikipediaGdp(wikitext);
        expect(parsed?.year).toBe(2025);
        expect(parsed?.value).toBeCloseTo(884.39e9);
    });
});
