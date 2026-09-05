export type MarketKind = 'necessity' | 'remittance' | 'institutional' | 'dollar' | 'regulated' | 'mixed';

export interface MarketClassification {
  kind: MarketKind;
  label: string;
  reason: string;
}

export function classifyMarket(input: {
  dollarization: number;
  remittanceRatio: number | null;
  stage: number | undefined;
  activeWallets: number;
  adoptionRate: number;
}): MarketClassification {
  const { dollarization, remittanceRatio, stage, activeWallets, adoptionRate } = input;
  const noLiveRules = stage == null || stage < 3;
  const highDollar = dollarization >= 0.55;
  const remittanceHeavy = remittanceRatio != null && remittanceRatio >= 0.15;

  if (noLiveRules && (highDollar || remittanceHeavy || activeWallets >= 50_000)) {
    return {
      kind: 'necessity',
      label: 'Necessity market',
      reason: 'Material usage without a live stablecoin framework.',
    };
  }
  if (remittanceHeavy) {
    return {
      kind: 'remittance',
      label: 'Remittance corridor',
      reason: 'Outbound stablecoin volume is large relative to official remittances.',
    };
  }
  if (stage === 3 && activeWallets >= 50_000 && adoptionRate < 0.01) {
    return {
      kind: 'institutional',
      label: 'Infrastructure market',
      reason: 'Live rules and a large wallet base, with low population penetration.',
    };
  }
  if (highDollar) {
    return {
      kind: 'dollar',
      label: 'Digital-dollar savings',
      reason: 'Most corridor volume is USD-referenced stablecoins.',
    };
  }
  if (stage === 3) {
    return {
      kind: 'regulated',
      label: 'Live framework',
      reason: 'A live stablecoin regime is in force.',
    };
  }
  return {
    kind: 'mixed',
    label: 'Mixed',
    reason: 'No single use-case dominates the numbers we have.',
  };
}

export function stageLabel(stage: number | undefined): string {
  if (stage === 3) return 'Live';
  if (stage === 2) return 'Proposed';
  if (stage === 1) return 'Draft';
  if (stage === 0) return 'No framework / restricted';
  return 'Unknown';
}
