import { atomicMass, baseOxidation, categoryByAtomic, categoryLabels, electronegativity, stateByAtomic } from './chemistryCatalog.js';

export function getCategory(element) {
  if (element.series) {
    return element.series === 'Lanthanide' ? 'lanthanide' : 'actinide';
  }
  return categoryByAtomic.get(element.number) || 'unknown';
}

export function getState(element) {
  return stateByAtomic[element.number] || 'solid';
}

export function getBlockLabel(block) {
  return `${block}-block`;
}

export function getElectronegativity(number) {
  return electronegativity[number] || 'n/a';
}

export function getAtomicMass(number) {
  return atomicMass[number] || (number >= 84 ? `[${number}]` : 'varies');
}

export function getOxidationStates(element) {
  const category = getCategory(element);
  if (baseOxidation[category]) {
    return baseOxidation[category];
  }
  if (element.number === 1) {
    return '+1, -1';
  }
  if ([13].includes(element.group)) {
    return '+3';
  }
  if ([14].includes(element.group)) {
    return '-4, +2, +4';
  }
  if ([15].includes(element.group)) {
    return '-3, +3, +5';
  }
  if ([16].includes(element.group)) {
    return '-2, +4, +6';
  }
  if ([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(element.group)) {
    return 'multiple';
  }
  return 'varies';
}

export function buildElectronConfiguration(number) {
  const order = [
    [1, 's'], [2, 's'], [2, 'p'], [3, 's'], [3, 'p'], [4, 's'],
    [3, 'd'], [4, 'p'], [5, 's'], [4, 'd'], [5, 'p'], [6, 's'],
    [4, 'f'], [5, 'd'], [6, 'p'], [7, 's'], [5, 'f'], [6, 'd'], [7, 'p']
  ];
  const capacities = { s: 2, p: 6, d: 10, f: 14 };
  const exceptionMap = {
    24: { '4s': 1, '3d': 5 },
    29: { '4s': 1, '3d': 10 },
    41: { '5s': 1, '4d': 4 },
    42: { '5s': 1, '4d': 5 },
    44: { '5s': 1, '4d': 7 },
    45: { '5s': 1, '4d': 8 },
    46: { '5s': 0, '4d': 10 },
    47: { '5s': 1, '4d': 10 },
    57: { '5d': 1, '4f': 0 },
    58: { '4f': 1, '5d': 1, '6s': 2 },
    64: { '4f': 7, '5d': 1, '6s': 2 },
    78: { '5d': 9, '6s': 1 },
    79: { '5d': 10, '6s': 1 },
    89: { '6d': 1, '5f': 0 },
    90: { '6d': 2, '5f': 0, '7s': 2 }
  };

  const nobleGasThresholds = [
    { threshold: 86, symbol: 'Rn' },
    { threshold: 54, symbol: 'Xe' },
    { threshold: 36, symbol: 'Kr' },
    { threshold: 18, symbol: 'Ar' },
    { threshold: 10, symbol: 'Ne' },
    { threshold: 2, symbol: 'He' }
  ];

  function fillConfiguration(targetNumber) {
    const occupancy = {};
    let remaining = targetNumber;

    for (const [principal, subshell] of order) {
      const key = `${principal}${subshell}`;
      const cap = capacities[subshell];
      const fill = Math.min(remaining, cap);
      occupancy[key] = fill;
      remaining -= fill;
      if (remaining <= 0) {
        break;
      }
    }

    if (exceptionMap[targetNumber]) {
      Object.assign(occupancy, exceptionMap[targetNumber]);
    }

    return occupancy;
  }

  const occupancy = fillConfiguration(number);
  const config = Object.entries(occupancy)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${key}${value}`)
    .join(' ');

  const nobleGas = nobleGasThresholds.find(({ threshold }) => number > threshold);
  if (!nobleGas) {
    return config;
  }

  const nobleConfig = fillConfiguration(nobleGas.threshold);
  const shorthand = nobleGas.symbol;
  const nobleEntries = Object.entries(nobleConfig)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${key}${value}`);
  const currentEntries = Object.entries(occupancy)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${key}${value}`);
  const remainingConfig = currentEntries.slice(nobleEntries.length).join(' ');
  return `[${shorthand}]${remainingConfig ? ` ${remainingConfig}` : ''}`;
}

export function getCategoryLabel(category) {
  return categoryLabels[category] || 'Unknown';
}

export function getSeries(element) {
  return element.series || 'Main table';
}
