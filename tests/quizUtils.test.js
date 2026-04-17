import test from 'node:test';
import assert from 'node:assert/strict';
import { averageSeconds, clampQuizLimit, formatPercent, mostMissedLabel, toHistoryCsvRows } from '../quizUtils.js';

test('clampQuizLimit supports only 10/20/30', () => {
  assert.equal(clampQuizLimit(10), 10);
  assert.equal(clampQuizLimit(20), 20);
  assert.equal(clampQuizLimit(30), 30);
  assert.equal(clampQuizLimit(5), 10);
});

test('formatPercent handles empty totals', () => {
  assert.equal(formatPercent(0, 0), '0%');
  assert.equal(formatPercent(3, 6), '50%');
});

test('averageSeconds computes expected average', () => {
  assert.equal(averageSeconds([]), 0);
  assert.equal(averageSeconds([1, 2, 3]), 2);
});

test('mostMissedLabel returns top category', () => {
  assert.equal(mostMissedLabel({}), 'N/A');
  assert.equal(mostMissedLabel({ Nonmetal: 2, Halogen: 3 }), 'Halogen (3)');
});

test('toHistoryCsvRows creates header and rows', () => {
  const rows = toHistoryCsvRows([
    {
      timestamp: '2026-04-17T00:00:00.000Z',
      mode: 'hard',
      score: 7,
      total: 10,
      limit: 10,
      accuracyPercent: 70,
      avgSeconds: 3.4,
      mostMissed: 'Halogen (2)'
    }
  ]);

  assert.equal(rows.length, 2);
  assert.match(rows[0], /timestamp,mode,score,total,limit,accuracyPercent,avgSeconds,mostMissed/);
  assert.match(rows[1], /hard/);
});
