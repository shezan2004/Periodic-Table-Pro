export function clampQuizLimit(value) {
  return [10, 20, 30].includes(value) ? value : 10;
}

export function formatPercent(correct, total) {
  if (!total) {
    return '0%';
  }
  return `${Math.round((correct / total) * 100)}%`;
}

export function averageSeconds(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function mostMissedLabel(missedByCategory) {
  const entries = Object.entries(missedByCategory || {});
  if (!entries.length) {
    return 'N/A';
  }

  const [category, misses] = entries.sort((a, b) => b[1] - a[1])[0];
  return `${category} (${misses})`;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toHistoryCsvRows(history) {
  const header = ['timestamp', 'mode', 'score', 'total', 'limit', 'accuracyPercent', 'avgSeconds', 'mostMissed'];
  const rows = [header.join(',')];

  (history || []).forEach((entry) => {
    const row = [
      entry.timestamp || '',
      entry.mode || '',
      entry.score ?? 0,
      entry.total ?? 0,
      entry.limit ?? 0,
      entry.accuracyPercent ?? 0,
      entry.avgSeconds ?? 0,
      entry.mostMissed || 'N/A'
    ].map(csvEscape).join(',');
    rows.push(row);
  });

  return rows;
}
