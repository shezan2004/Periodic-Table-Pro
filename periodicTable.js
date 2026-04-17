import { averageSeconds, clampQuizLimit, formatPercent, mostMissedLabel, toHistoryCsvRows } from './quizUtils.js';
import { downloadTextFile, readStoredJson, writeStoredJson } from './storageUtils.js';
import { loadElementsFromJson } from './elementsLoader.js';
import { registerServiceWorker } from './pwa.js';
import { elementsFallback } from './elementsFallback.js';
import { legendOrder, categoryLabels, stateLabels } from './chemistryCatalog.js';
import { initTheme, setTheme } from './themeManager.js';
import { buildElectronConfiguration, getAtomicMass, getBlockLabel, getCategory, getCategoryLabel, getElectronegativity, getOxidationStates, getSeries, getState } from './chemistryUtils.js';

let elements = [...elementsFallback];


const els = {
  grid: document.getElementById('periodicGrid'),
  legend: document.getElementById('legend'),
  searchInput: document.getElementById('searchInput'),
  suggestions: document.getElementById('suggestions'),
  statusText: document.getElementById('statusText'),
  resultPills: document.getElementById('resultPills'),
  themeToggle: document.getElementById('themeToggle'),
  infoToggle: document.getElementById('infoToggle'),
  drawerClose: document.getElementById('drawerClose'),
  drawerCloseTop: document.getElementById('drawerCloseTop'),
  sidebarDrawer: document.getElementById('sidebarDrawer'),
  compareToggle: document.getElementById('compareToggle'),
  compareList: document.getElementById('compareList'),
  compareHint: document.getElementById('compareHint'),
  compareClear: document.getElementById('compareClear'),
  favoriteToggle: document.getElementById('favoriteToggle'),
  favoritesList: document.getElementById('favoritesList'),
  favoritesExport: document.getElementById('favoritesExport'),
  favoritesImport: document.getElementById('favoritesImport'),
  favoritesImportFile: document.getElementById('favoritesImportFile'),
  favoritesClear: document.getElementById('favoritesClear'),
  quizScore: document.getElementById('quizScore'),
  quizTimer: document.getElementById('quizTimer'),
  quizStreak: document.getElementById('quizStreak'),
  quizMode: document.getElementById('quizMode'),
  quizAccuracy: document.getElementById('quizAccuracy'),
  quizAvgTime: document.getElementById('quizAvgTime'),
  quizMostMissed: document.getElementById('quizMostMissed'),
  quizBestScore: document.getElementById('quizBestScore'),
  quizSessionSummary: document.getElementById('quizSessionSummary'),
  quizQuestion: document.getElementById('quizQuestion'),
  quizOptions: document.getElementById('quizOptions'),
  quizFeedback: document.getElementById('quizFeedback'),
  quizStart: document.getElementById('quizStart'),
  quizRestart: document.getElementById('quizRestart'),
  quizStop: document.getElementById('quizStop'),
  quizExportCsv: document.getElementById('quizExportCsv'),
  quizNext: document.getElementById('quizNext'),
  quizLimit: document.getElementById('quizLimit'),
  filterCategory: document.getElementById('filterCategory'),
  filterPeriod: document.getElementById('filterPeriod'),
  filterBlock: document.getElementById('filterBlock'),
  filterState: document.getElementById('filterState'),
  infoName: document.getElementById('infoName'),
  infoAtomic: document.getElementById('infoAtomic'),
  infoSymbol: document.getElementById('infoSymbol'),
  infoCategory: document.getElementById('infoCategory'),
  infoDescription: document.getElementById('infoDescription'),
  infoMass: document.getElementById('infoMass'),
  infoGroup: document.getElementById('infoGroup'),
  infoPeriod: document.getElementById('infoPeriod'),
  infoBlock: document.getElementById('infoBlock'),
  infoState: document.getElementById('infoState'),
  infoEN: document.getElementById('infoEN'),
  infoOx: document.getElementById('infoOx'),
  infoConfig: document.getElementById('infoConfig'),
  infoNote: document.getElementById('infoNote'),
  totalCount: document.getElementById('totalCount'),
  categoryCount: document.getElementById('categoryCount'),
  yearCount: document.getElementById('yearCount'),
  footerDate: document.getElementById('footerDate')
};

let activeAtomicNumber = 1;
let compareSelection = [];
let favoriteSelection = [];
let quizState = {
  active: false,
  question: null,
  score: 0,
  total: 0,
  mode: 'normal',
  limit: 10,
  streak: 0,
  timerSeconds: 15,
  timerRemaining: 15,
  timerId: null,
  nextTimerId: null,
  questionStartedAt: 0,
  responseTimes: [],
  missedByCategory: {},
  canAdvance: false,
  answered: false
};
let quizHistory = [];
let quizBestScores = {};
const QUIZ_HISTORY_KEY = 'periodic-table-quiz-history';
const QUIZ_BEST_KEY = 'periodic-table-quiz-best-scores';
let currentFilters = {
  query: '',
  category: 'all',
  period: 'all',
  block: 'all',
  state: 'all'
};

function openDrawer() {
  document.body.classList.add('drawer-open');
  if (els.sidebarDrawer) {
    els.sidebarDrawer.setAttribute('aria-hidden', 'false');
  }
}

function loadFavorites() {
  favoriteSelection = readStoredJson('periodic-table-favorites', []);
}

function loadQuizStorage() {
  quizHistory = readStoredJson(QUIZ_HISTORY_KEY, []);
  quizBestScores = readStoredJson(QUIZ_BEST_KEY, {});
}

function saveQuizStorage() {
  writeStoredJson(QUIZ_HISTORY_KEY, quizHistory);
  writeStoredJson(QUIZ_BEST_KEY, quizBestScores);
}

function exportFavorites() {
  const payload = {
    exportedAt: new Date().toISOString(),
    favorites: favoriteSelection
  };
  downloadTextFile('periodic-table-favorites.json', JSON.stringify(payload, null, 2), 'application/json');
}

function importFavoritesFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const incoming = Array.isArray(parsed) ? parsed : parsed.favorites;
      if (!Array.isArray(incoming)) {
        throw new Error('Invalid format');
      }
      favoriteSelection = [...new Set(incoming.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 1 && item <= 118))];
      saveFavorites();
      renderFavorites();
      updateFavoriteButtonState();
      if (els.quizFeedback) {
        els.quizFeedback.textContent = `Imported ${favoriteSelection.length} favorites.`;
      }
    } catch {
      if (els.quizFeedback) {
        els.quizFeedback.textContent = 'Invalid favorites file. Please import a JSON export from this app.';
      }
    }
  };
  reader.readAsText(file);
}

function getConfiguredQuizMode() {
  const selected = els.quizMode ? els.quizMode.value : 'normal';
  return ['easy', 'normal', 'hard', 'survival'].includes(selected) ? selected : 'normal';
}

function getPromptTypesForMode(mode) {
  if (mode === 'easy') {
    return [0, 1];
  }
  if (mode === 'hard') {
    return [2, 3, 4];
  }
  if (mode === 'survival') {
    return [0, 1, 2, 3, 4];
  }
  return [0, 1, 2];
}

function getBestScoreKey() {
  return `${quizState.mode}-${quizState.limit}`;
}

function updateBestScore() {
  const key = getBestScoreKey();
  const previous = Number(quizBestScores[key] || 0);
  if (quizState.score > previous) {
    quizBestScores[key] = quizState.score;
  }
}

function updateQuizAnalytics() {
  const accuracy = formatPercent(quizState.score, quizState.total);
  const avg = averageSeconds(quizState.responseTimes);
  const mostMissed = mostMissedLabel(quizState.missedByCategory);
  const best = Number(quizBestScores[getBestScoreKey()] || 0);

  if (els.quizAccuracy) {
    els.quizAccuracy.textContent = `Accuracy: ${accuracy}`;
  }
  if (els.quizAvgTime) {
    els.quizAvgTime.textContent = `Avg Time: ${avg.toFixed(1)}s`;
  }
  if (els.quizMostMissed) {
    els.quizMostMissed.textContent = `Most Missed: ${mostMissed}`;
  }
  if (els.quizBestScore) {
    els.quizBestScore.textContent = `Best: ${best} / ${quizState.limit}`;
  }
  if (els.quizSessionSummary) {
    els.quizSessionSummary.textContent = `Mode: ${quizState.mode}. Questions answered: ${quizState.total}.`;
  }
}

function addHistoryEntry(status) {
  const accuracyPercent = quizState.total ? Math.round((quizState.score / quizState.total) * 100) : 0;
  const avgSeconds = averageSeconds(quizState.responseTimes);
  const entry = {
    timestamp: new Date().toISOString(),
    status,
    mode: quizState.mode,
    score: quizState.score,
    total: quizState.total,
    limit: quizState.limit,
    accuracyPercent,
    avgSeconds: Number(avgSeconds.toFixed(2)),
    mostMissed: mostMissedLabel(quizState.missedByCategory)
  };
  quizHistory = [entry, ...quizHistory].slice(0, 50);
  saveQuizStorage();
}

function exportQuizHistoryCsv() {
  const rows = toHistoryCsvRows(quizHistory);
  downloadTextFile('periodic-table-quiz-history.csv', rows.join('\n'), 'text/csv');
}

function saveFavorites() {
  writeStoredJson('periodic-table-favorites', favoriteSelection);
}

function updateFavoriteButtonState() {
  if (!els.favoriteToggle) {
    return;
  }

  const selected = favoriteSelection.includes(activeAtomicNumber);
  els.favoriteToggle.textContent = selected ? '★' : '☆';
  els.favoriteToggle.setAttribute('aria-label', selected ? 'Remove element from favorites' : 'Favorite element');
}

function updateQuizMeta() {
  if (els.quizTimer) {
    els.quizTimer.textContent = `Time: ${quizState.timerRemaining}s`;
  }

  if (els.quizStreak) {
    els.quizStreak.textContent = `Streak: ${quizState.streak}`;
  }
}

function updateQuizScore() {
  if (els.quizScore) {
    els.quizScore.textContent = `Score: ${quizState.score} / ${quizState.total} of ${quizState.limit}`;
  }
  updateQuizMeta();
  updateQuizAnalytics();
}

function updateQuizNextState() {
  if (els.quizNext) {
    els.quizNext.disabled = !quizState.active || !quizState.canAdvance;
  }
}

function updateQuizControlState() {
  if (els.quizStop) {
    els.quizStop.disabled = !quizState.active;
  }
  if (els.quizRestart) {
    els.quizRestart.disabled = quizState.total === 0 && !quizState.active;
  }
}

function clearQuizTimer() {
  if (quizState.timerId) {
    clearInterval(quizState.timerId);
    quizState.timerId = null;
  }
}

function clearQuizNextTimer() {
  if (quizState.nextTimerId) {
    clearTimeout(quizState.nextTimerId);
    quizState.nextTimerId = null;
  }
}

function startQuizTimer() {
  clearQuizTimer();
  quizState.timerRemaining = quizState.timerSeconds;
  updateQuizMeta();

  quizState.timerId = setInterval(() => {
    quizState.timerRemaining -= 1;
    updateQuizMeta();

    if (quizState.timerRemaining <= 0) {
      clearQuizTimer();
      handleQuizTimeout();
    }
  }, 1000);
}

function getConfiguredQuizLimit() {
  const selected = Number(els.quizLimit ? els.quizLimit.value : 10);
  return clampQuizLimit(selected);
}

function finishQuiz(message = `Quiz complete. Final score: ${quizState.score} / ${quizState.limit}.`) {
  clearQuizTimer();
  clearQuizNextTimer();
  updateBestScore();
  addHistoryEntry('complete');
  quizState.active = false;
  quizState.canAdvance = false;
  quizState.answered = true;
  disableQuizButtons(true);
  updateQuizNextState();
  updateQuizControlState();
  if (els.quizFeedback) {
    els.quizFeedback.textContent = message;
  }
  saveQuizStorage();
  updateQuizScore();
}

function queueNextQuestion() {
  if (!quizState.active) {
    return;
  }

  if (quizState.total >= quizState.limit) {
    finishQuiz();
    return;
  }

  clearQuizNextTimer();
  quizState.nextTimerId = window.setTimeout(() => {
    quizState.nextTimerId = null;
    if (quizState.active) {
      nextQuizQuestion(true);
    }
  }, 1200);
}

function stopQuiz() {
  if (!quizState.active) {
    return;
  }

  clearQuizTimer();
  clearQuizNextTimer();
  quizState.active = false;
  quizState.canAdvance = false;
  quizState.answered = true;
  disableQuizButtons(true);
  updateQuizNextState();
  updateQuizControlState();
  addHistoryEntry('stopped');
  saveQuizStorage();
  updateQuizScore();

  if (els.quizFeedback) {
    els.quizFeedback.textContent = `Quiz stopped. Current score: ${quizState.score} / ${quizState.total}.`;
  }
}

function restartQuiz() {
  clearQuizTimer();
  clearQuizNextTimer();
  startQuiz();
}

function handleQuizTimeout() {
  if (!quizState.question || quizState.answered) {
    return;
  }

  quizState.answered = true;
  quizState.total += 1;
  quizState.streak = 0;
  quizState.canAdvance = true;
  const elapsed = Math.max(quizState.timerSeconds - quizState.timerRemaining, 0);
  quizState.responseTimes.push(elapsed);

  const missedCategory = getCategoryLabel(getCategory(quizState.question.element));
  quizState.missedByCategory[missedCategory] = (quizState.missedByCategory[missedCategory] || 0) + 1;

  highlightQuizAnswer('', false);
  disableQuizButtons(true);
  updateQuizScore();

  if (els.quizFeedback) {
    els.quizFeedback.textContent = `Time is up. Correct answer: ${quizState.question.answer}`;
  }

  queueNextQuestion();
}

function disableQuizButtons(disabled) {
  if (!els.quizOptions) {
    return;
  }

  els.quizOptions.querySelectorAll('.quiz-option').forEach((item) => {
    item.disabled = disabled;
  });
}

function highlightQuizAnswer(selected, isCorrect) {
  if (!els.quizOptions || !quizState.question) {
    return;
  }

  els.quizOptions.querySelectorAll('.quiz-option').forEach((item) => {
    const matchesAnswer = item.dataset.quizAnswer === quizState.question.answer;
    const matchesSelected = item.dataset.quizAnswer === selected;
    item.classList.toggle('correct', matchesAnswer);
    item.classList.toggle('wrong', !isCorrect && matchesSelected);
  });
}

function resetQuizOptions() {
  if (!els.quizOptions) {
    return;
  }

  els.quizOptions.querySelectorAll('.quiz-option').forEach((item) => {
    item.classList.remove('correct', 'wrong', 'retry');
    item.disabled = false;
  });
}

function handleQuizRetry(message, countAsAttempt = false) {
  quizState.streak = 0;
  if (countAsAttempt) {
    quizState.total += 1;
  }
  quizState.answered = false;
  quizState.canAdvance = false;
  updateQuizScore();

  if (els.quizFeedback) {
    els.quizFeedback.textContent = message;
  }

  highlightQuizAnswer('', false);
  disableQuizButtons(true);

  if (els.quizOptions) {
    els.quizOptions.querySelectorAll('.quiz-option').forEach((item) => {
      item.classList.add('retry');
    });
  }

  window.setTimeout(() => {
    if (!quizState.active || !quizState.question) {
      return;
    }

    resetQuizOptions();
    if (els.quizFeedback) {
      els.quizFeedback.textContent = 'Retry the same question.';
    }
    startQuizTimer();
    updateQuizNextState();
  }, 800);
}

function renderFavorites() {
  if (!els.favoritesList) {
    return;
  }

  if (favoriteSelection.length === 0) {
    els.favoritesList.innerHTML = '<p class="compare-hint">No favorites saved yet. Press F on an element to save it here.</p>';
    return;
  }

  els.favoritesList.innerHTML = favoriteSelection.map((atomicNumber) => {
    const element = elements.find((entry) => entry.number === atomicNumber);
    if (!element) {
      return '';
    }
    return `
      <article class="compare-item" data-atomic="${element.number}">
        <div class="compare-item-head">
          <strong>${element.name} (${element.symbol})</strong>
          <button type="button" data-remove-favorite="${element.number}" aria-label="Remove ${element.name} from favorites">×</button>
        </div>
        <dl>
          <div><dt>Atomic Number</dt><dd>${element.number}</dd></div>
          <div><dt>Category</dt><dd>${getCategoryLabel(getCategory(element))}</dd></div>
        </dl>
      </article>
    `;
  }).join('');
}

function toggleFavorite(number = activeAtomicNumber) {
  if (!number) {
    return;
  }

  if (favoriteSelection.includes(number)) {
    favoriteSelection = favoriteSelection.filter((entry) => entry !== number);
  } else {
    favoriteSelection = [...favoriteSelection, number];
  }

  saveFavorites();
  renderFavorites();
  updateFavoriteButtonState();
}

function generateQuizQuestion() {
  const pool = elements.filter((element) => !element.series);
  const element = pool[Math.floor(Math.random() * pool.length)];
  const promptTypes = getPromptTypesForMode(quizState.mode);
  const promptType = promptTypes[Math.floor(Math.random() * promptTypes.length)];
  let prompt;
  let answer;
  let options;

  if (promptType === 0) {
    prompt = `Which element has atomic number ${element.number}?`;
    answer = element.name;
    options = [element.name];
  } else if (promptType === 1) {
    prompt = `What is the symbol for ${element.name}?`;
    answer = element.symbol;
    options = [element.symbol];
  } else {
    if (promptType === 2) {
      prompt = `Which category does ${element.name} belong to?`;
      answer = getCategoryLabel(getCategory(element));
      options = [answer];
    } else if (promptType === 3) {
      prompt = `Which block does ${element.name} belong to?`;
      answer = getBlockLabel(element.block || 'f');
      options = [answer];
    } else {
      prompt = `What is the room-temperature state of ${element.name}?`;
      answer = stateLabels[getState(element)] || 'Unknown';
      options = [answer];
    }
  }

  const distractors = promptType === 2
    ? [...new Set(elements.map((item) => getCategoryLabel(getCategory(item))))].filter((value) => value !== answer)
    : (promptType === 3
      ? [...new Set(pool.map((item) => getBlockLabel(item.block || 'f')))].filter((value) => value !== answer)
      : (promptType === 4
        ? ['Solid', 'Liquid', 'Gas', 'Unknown'].filter((value) => value !== answer)
        : (promptType === 0
          ? pool.map((item) => item.name).filter((value) => value !== answer)
          : pool.map((item) => item.symbol).filter((value) => value !== answer))));

  while (options.length < 4 && distractors.length) {
    const index = Math.floor(Math.random() * distractors.length);
    const choice = distractors.splice(index, 1)[0];
    if (!options.includes(choice)) {
      options.push(choice);
    }
  }

  options = options.sort(() => Math.random() - 0.5);
  quizState.question = { prompt, answer, options, element };
  quizState.answered = false;
  quizState.canAdvance = false;
  quizState.questionStartedAt = performance.now();
  if (els.quizQuestion) {
    els.quizQuestion.textContent = prompt;
  }
  renderQuizOptions();
  updateQuizMeta();
  updateQuizNextState();
}

function renderQuizOptions() {
  if (!els.quizOptions || !quizState.question) {
    return;
  }

  els.quizOptions.innerHTML = quizState.question.options.map((option) => `
    <button class="quiz-option" type="button" data-quiz-answer="${option}">${option}</button>
  `).join('');

  els.quizOptions.querySelectorAll('.quiz-option').forEach((button) => {
    button.addEventListener('click', () => submitQuizAnswer(button.dataset.quizAnswer, button));
  });
}

function submitQuizAnswer(selected, button) {
  if (!quizState.active || !quizState.question || quizState.answered) {
    return;
  }

  quizState.answered = true;
  quizState.total += 1;
  const elapsed = Math.max((performance.now() - quizState.questionStartedAt) / 1000, 0);
  quizState.responseTimes.push(elapsed);
  clearQuizTimer();
  const correct = selected === quizState.question.answer;
  if (correct) {
    quizState.score += 1;
    quizState.streak += 1;
    quizState.canAdvance = true;
  } else {
    quizState.streak = 0;
    quizState.canAdvance = true;
    const missedCategory = getCategoryLabel(getCategory(quizState.question.element));
    quizState.missedByCategory[missedCategory] = (quizState.missedByCategory[missedCategory] || 0) + 1;
  }

  if (!correct && quizState.mode === 'survival') {
    if (els.quizFeedback) {
      els.quizFeedback.textContent = `Incorrect. Correct answer: ${quizState.question.answer}. Survival round ended.`;
    }
    highlightQuizAnswer(selected, correct);
    const buttons = els.quizOptions ? els.quizOptions.querySelectorAll('.quiz-option') : [];
    buttons.forEach((item) => {
      item.disabled = true;
    });
    finishQuiz(`Survival complete. Final score: ${quizState.score} / ${quizState.total}.`);
    return;
  }

  updateQuizScore();
  if (els.quizFeedback) {
    els.quizFeedback.textContent = correct
      ? 'Correct. Moving to the next question...'
      : `Incorrect. Correct answer: ${quizState.question.answer}. Moving to the next question...`;
  }

  if (button) {
    button.classList.add(correct ? 'correct' : 'wrong');
  }

  highlightQuizAnswer(selected, correct);

  const buttons = els.quizOptions ? els.quizOptions.querySelectorAll('.quiz-option') : [];
  buttons.forEach((item) => {
    item.disabled = true;
  });

  updateQuizNextState();
  queueNextQuestion();
}

function startQuiz() {
  clearQuizNextTimer();
  quizState.active = true;
  quizState.score = 0;
  quizState.total = 0;
  quizState.mode = getConfiguredQuizMode();
  quizState.limit = getConfiguredQuizLimit();
  quizState.streak = 0;
  quizState.timerRemaining = quizState.timerSeconds;
  quizState.canAdvance = true;
  quizState.answered = false;
  quizState.responseTimes = [];
  quizState.missedByCategory = {};
  if (els.quizFeedback) {
    els.quizFeedback.textContent = `Quiz started in ${quizState.mode} mode. Pick the best answer.`;
  }
  generateQuizQuestion();
  updateQuizScore();
  updateQuizControlState();
  startQuizTimer();
}

function nextQuizQuestion(force = false) {
  if (!quizState.active) {
    startQuiz();
    return;
  }
  if (!force && !quizState.canAdvance) {
    return;
  }
  if (quizState.total >= quizState.limit) {
    finishQuiz();
    return;
  }
  clearQuizTimer();
  clearQuizNextTimer();
  generateQuizQuestion();
  startQuizTimer();
}

function closeDrawer() {
  document.body.classList.remove('drawer-open');
  if (els.sidebarDrawer) {
    els.sidebarDrawer.setAttribute('aria-hidden', 'true');
  }
}

function getVisibleCells() {
  return Array.from(document.querySelectorAll('.element:not(.hidden)'));
}

function updateCellTabStops() {
  const visibleCells = getVisibleCells();
  visibleCells.forEach((cell) => {
    cell.tabIndex = Number(cell.dataset.atomic) === activeAtomicNumber ? 0 : -1;
  });
}

function getCompareStats(element) {
  return {
    mass: getAtomicMass(element.number),
    block: getBlockLabel(element.block || 'f'),
    en: getElectronegativity(element.number),
    ox: getOxidationStates(element)
  };
}

function updateCompareButtonState() {
  if (!els.compareToggle) {
    return;
  }

  const selected = compareSelection.includes(activeAtomicNumber);
  els.compareToggle.textContent = selected ? 'Remove From Compare' : 'Add To Compare';
  els.compareToggle.setAttribute('aria-pressed', selected ? 'true' : 'false');
}

function renderCompare() {
  if (!els.compareList || !els.compareHint) {
    return;
  }

  if (compareSelection.length === 0) {
    els.compareHint.textContent = 'Add at least 2 elements to start comparing.';
    els.compareList.innerHTML = '';
    updateCompareButtonState();
    return;
  }

  if (compareSelection.length === 1) {
    els.compareHint.textContent = 'Add one more element for side-by-side comparison.';
  } else {
    els.compareHint.textContent = `Comparing ${compareSelection.length} elements.`;
  }

  els.compareList.innerHTML = compareSelection.map((atomicNumber) => {
    const element = elements.find((entry) => entry.number === atomicNumber);
    if (!element) {
      return '';
    }
    const stats = getCompareStats(element);
    return `
      <article class="compare-item" data-atomic="${element.number}">
        <div class="compare-item-head">
          <strong>${element.name} (${element.symbol})</strong>
          <button type="button" data-remove-atomic="${element.number}" aria-label="Remove ${element.name} from compare">×</button>
        </div>
        <dl>
          <div><dt>Atomic Mass</dt><dd>${stats.mass}</dd></div>
          <div><dt>Block</dt><dd>${stats.block}</dd></div>
          <div><dt>Electronegativity</dt><dd>${stats.en}</dd></div>
          <div><dt>Oxidation States</dt><dd>${stats.ox}</dd></div>
        </dl>
      </article>
    `;
  }).join('');

  updateCompareButtonState();
}

function toggleCompare(number = activeAtomicNumber) {
  if (!number) {
    return;
  }

  if (compareSelection.includes(number)) {
    compareSelection = compareSelection.filter((entry) => entry !== number);
    renderCompare();
    return;
  }

  if (compareSelection.length >= 3) {
    compareSelection = [...compareSelection.slice(1), number];
  } else {
    compareSelection = [...compareSelection, number];
  }
  renderCompare();
}

function moveGridFocus(currentCell, direction) {
  const row = Number(currentCell.dataset.row);
  const col = Number(currentCell.dataset.col);
  const cells = getVisibleCells().map((cell) => ({
    row: Number(cell.dataset.row),
    col: Number(cell.dataset.col),
    cell
  }));

  let next;
  if (direction === 'ArrowRight') {
    next = cells.filter((item) => item.row === row && item.col > col).sort((a, b) => a.col - b.col)[0];
  }
  if (direction === 'ArrowLeft') {
    const matches = cells.filter((item) => item.row === row && item.col < col).sort((a, b) => b.col - a.col);
    next = matches[0];
  }
  if (direction === 'ArrowDown') {
    next = cells.filter((item) => item.col === col && item.row > row).sort((a, b) => a.row - b.row)[0];
  }
  if (direction === 'ArrowUp') {
    const matches = cells.filter((item) => item.col === col && item.row < row).sort((a, b) => b.row - a.row);
    next = matches[0];
  }

  if (!next) {
    return;
  }

  const nextAtomic = Number(next.cell.dataset.atomic);
  activeAtomicNumber = nextAtomic;
  updateCellTabStops();
  next.cell.focus();
}

function createCell(element) {
  const category = getCategory(element);
  const card = document.createElement('button');
  card.type = 'button';
  card.className = `element ${category}`;
  card.dataset.atomic = String(element.number);
  card.dataset.category = category;
  card.dataset.period = String(element.period || '');
  card.dataset.block = element.block || '';
  card.dataset.state = getState(element);
  card.dataset.search = `${element.number} ${element.symbol} ${element.name} ${getCategoryLabel(category)} ${getSeries(element)}`.toLowerCase();

  const row = element.series ? (element.series === 'Lanthanide' ? 9 : 10) : element.period + 1;
  const column = element.series ? 4 + (element.number - (element.series === 'Lanthanide' ? 58 : 90)) : element.group + 1;

  card.style.gridRow = row;
  card.style.gridColumn = column;
  card.dataset.row = String(row);
  card.dataset.col = String(column);
  card.id = `element-${element.number}`;
  card.setAttribute('role', 'gridcell');
  card.tabIndex = -1;
  card.setAttribute('aria-selected', 'false');
  card.setAttribute('aria-label', `${element.name}, atomic number ${element.number}`);

  card.innerHTML = `
    <div class="number">${element.number}</div>
    <div class="symbol">${element.symbol}</div>
    <div class="name">${element.name}</div>
  `;

  card.addEventListener('click', () => selectElement(element.number, true));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectElement(element.number, true);
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      moveGridFocus(card, event.key);
    }
  });
  return card;
}

function updateInfo(element) {
  const category = getCategory(element);
  const state = getState(element);
  const categoryLabel = getCategoryLabel(category);
  const noteMap = {
    'alkali-metal': 'Highly reactive metals that form strong ionic compounds.',
    'alkaline-earth-metal': 'Reactive but more stable than alkali metals.',
    'transition-metal': 'Strong, shiny metals commonly used in alloys and catalysts.',
    'post-transition-metal': 'Soft metals with mixed metallic and nonmetallic behavior.',
    metalloid: 'Semiconducting elements that sit along the staircase boundary.',
    nonmetal: 'Light elements that commonly form covalent bonds.',
    halogen: 'Very reactive nonmetals that readily form salts.',
    'noble-gas': 'Chemically stable gases with filled valence shells.',
    lanthanide: 'Rare-earth metal with useful magnetic and optical properties.',
    actinide: 'Radioactive series known for nuclear chemistry.',
    unknown: 'Synthetic or less commonly classified element.'
  };

  els.infoName.textContent = element.name;
  els.infoAtomic.textContent = element.number;
  els.infoSymbol.textContent = element.symbol;
  els.infoCategory.textContent = categoryLabel;
  els.infoDescription.textContent = `${element.name} is element ${element.number}. Click other tiles to inspect the rest of the table.`;
  els.infoMass.textContent = getAtomicMass(element.number);
  els.infoGroup.textContent = element.group || '—';
  els.infoPeriod.textContent = element.period || '—';
  els.infoBlock.textContent = getBlockLabel(element.block || 'f');
  els.infoState.textContent = stateLabels[state] || 'Unknown';
  els.infoEN.textContent = getElectronegativity(element.number);
  els.infoOx.textContent = getOxidationStates(element);
  els.infoConfig.textContent = buildElectronConfiguration(element.number);
  els.infoNote.textContent = noteMap[category] || noteMap.unknown;
}

function selectElement(number, animate = false) {
  activeAtomicNumber = number;
  document.querySelectorAll('.element').forEach((cell) => {
    const active = Number(cell.dataset.atomic) === number;
    cell.classList.toggle('active', active);
    cell.setAttribute('aria-selected', active ? 'true' : 'false');
    if (animate && active) {
      cell.classList.remove('pop');
      void cell.offsetWidth;
      cell.classList.add('pop');
    }
  });

  const element = elements.find((entry) => entry.number === number);
  if (element) {
    updateInfo(element);
    updateCellTabStops();
    updateCompareButtonState();
    updateFavoriteButtonState();
    if (els.grid) {
      els.grid.setAttribute('aria-activedescendant', `element-${number}`);
    }
    openDrawer();
  }
}

function applyFilters() {
  const query = currentFilters.query;
  const cells = document.querySelectorAll('.element');
  let visible = 0;
  const matches = [];

  cells.forEach((cell) => {
    const atomic = Number(cell.dataset.atomic);
    const category = cell.dataset.category;
    const period = cell.dataset.period;
    const block = cell.dataset.block;
    const state = cell.dataset.state;
    const element = elements.find((entry) => entry.number === atomic);
    const searchHit = !query || cell.dataset.search.includes(query);
    const categoryHit = currentFilters.category === 'all' || category === currentFilters.category;
    const periodHit = currentFilters.period === 'all' || period === currentFilters.period;
    const blockHit = currentFilters.block === 'all' || block === currentFilters.block;
    const stateHit = currentFilters.state === 'all' || state === currentFilters.state;
    const match = searchHit && categoryHit && periodHit && blockHit && stateHit;

    cell.classList.toggle('hidden', !match);
    cell.classList.toggle('match', searchHit && query.length > 0);

    if (match) {
      visible += 1;
    }

    if (searchHit && query.length > 0 && element) {
      matches.push(element);
    }
  });

  els.statusText.textContent = query || currentFilters.category !== 'all' || currentFilters.period !== 'all' || currentFilters.block !== 'all' || currentFilters.state !== 'all'
    ? `${visible} element${visible === 1 ? '' : 's'} shown`
    : 'Showing all 118 elements';

  els.resultPills.innerHTML = [
    currentFilters.category !== 'all' ? `<span>Category: ${currentFilters.category}</span>` : '',
    currentFilters.period !== 'all' ? `<span>Period: ${currentFilters.period}</span>` : '',
    currentFilters.block !== 'all' ? `<span>Block: ${currentFilters.block}</span>` : '',
    currentFilters.state !== 'all' ? `<span>State: ${stateLabels[currentFilters.state] || currentFilters.state}</span>` : ''
  ].filter(Boolean).join('');

  renderSuggestions(matches.slice(0, 6));

  const activeCell = document.querySelector(`.element[data-atomic="${activeAtomicNumber}"]`);
  if (activeCell && activeCell.classList.contains('hidden')) {
    const firstVisible = getVisibleCells()[0];
    if (firstVisible) {
      activeAtomicNumber = Number(firstVisible.dataset.atomic);
      const firstElement = elements.find((entry) => entry.number === activeAtomicNumber);
      if (firstElement) {
        selectElement(firstElement.number, false);
      }
    }
  }
  updateCellTabStops();
}

function renderSuggestions(matches) {
  if (!currentFilters.query || !matches.length) {
    els.suggestions.innerHTML = '';
    els.suggestions.classList.remove('visible');
    return;
  }

  els.suggestions.innerHTML = matches.map((element) => `
    <button class="suggestion-item" data-atomic="${element.number}" type="button" role="option" aria-selected="false">
      ${element.name} <small>${element.symbol} · #${element.number}</small>
    </button>
  `).join('');
  els.suggestions.classList.add('visible');

  els.suggestions.querySelectorAll('.suggestion-item').forEach((button) => {
    button.addEventListener('click', () => {
      const atomic = Number(button.dataset.atomic);
      const element = elements.find((entry) => entry.number === atomic);
      if (element) {
        els.searchInput.value = element.name;
        currentFilters.query = element.name.toLowerCase();
        applyFilters();
        selectElement(atomic, true);
      }
      els.suggestions.classList.remove('visible');
    });
  });
}

function buildLegend() {
  els.legend.innerHTML = legendOrder.map(([className, label]) => `
    <div class="legend-item">
      <span class="swatch ${className}"></span>
      <span>${label}</span>
    </div>
  `).join('');
}

function buildGrid() {
  for (let group = 1; group <= 18; group += 1) {
    const label = document.createElement('div');
    label.className = 'group-label';
    label.style.gridColumn = group + 1;
    label.style.gridRow = 1;
    label.textContent = group;
    els.grid.appendChild(label);
  }

  for (let period = 1; period <= 7; period += 1) {
    const label = document.createElement('div');
    label.className = 'period-label';
    label.style.gridColumn = 1;
    label.style.gridRow = period + 1;
    label.textContent = `P${period}`;
    els.grid.appendChild(label);
  }

  const lanthLabel = document.createElement('div');
  lanthLabel.className = 'fblock-label';
  lanthLabel.style.gridColumn = '1 / span 3';
  lanthLabel.style.gridRow = 9;
  lanthLabel.textContent = 'Lanthanides';
  els.grid.appendChild(lanthLabel);

  const actLabel = document.createElement('div');
  actLabel.className = 'fblock-label';
  actLabel.style.gridColumn = '1 / span 3';
  actLabel.style.gridRow = 10;
  actLabel.textContent = 'Actinides';
  els.grid.appendChild(actLabel);

  const mainOrder = elements.filter((element) => !element.series);
  const fBlockOrder = elements.filter((element) => element.series);

  mainOrder.forEach((element) => els.grid.appendChild(createCell(element)));
  fBlockOrder.forEach((element) => els.grid.appendChild(createCell(element)));
}

function updateStats() {
  els.totalCount.textContent = '118';
  els.categoryCount.textContent = `${new Set(elements.map((element) => getCategory(element))).size} categories`;
  els.yearCount.textContent = '1669 - 2016';
  els.footerDate.textContent = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function populateFilterOptions() {
  const categories = [...new Set(elements.map((element) => getCategory(element)))].sort();
  const periods = [...new Set(elements.map((element) => element.period).filter(Boolean))].sort((a, b) => a - b);
  const blocks = [...new Set(elements.map((element) => element.block).filter(Boolean))].sort();
  const states = ['solid', 'liquid', 'gas', 'unknown'];

  els.filterCategory.innerHTML += categories.map((category) => `<option value="${category}">${categoryLabels[category] || category}</option>`).join('');
  els.filterPeriod.innerHTML += periods.map((period) => `<option value="${period}">Period ${period}</option>`).join('');
  els.filterBlock.innerHTML += blocks.map((block) => `<option value="${block}">${block}-block</option>`).join('');
  els.filterState.innerHTML += states.map((state) => `<option value="${state}">${stateLabels[state]}</option>`).join('');
}

function bindEvents() {
  els.searchInput.addEventListener('input', () => {
    currentFilters.query = els.searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  [els.filterCategory, els.filterPeriod, els.filterBlock, els.filterState].forEach((input) => {
    input.addEventListener('change', () => {
      currentFilters.category = els.filterCategory.value;
      currentFilters.period = els.filterPeriod.value;
      currentFilters.block = els.filterBlock.value;
      currentFilters.state = els.filterState.value;
      applyFilters();
    });
  });

  els.themeToggle.addEventListener('click', () => {
    setTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light', els.themeToggle);
  });

  if (els.infoToggle) {
    els.infoToggle.addEventListener('click', openDrawer);
  }

  if (els.drawerClose) {
    els.drawerClose.addEventListener('click', closeDrawer);
  }

  if (els.drawerCloseTop) {
    els.drawerCloseTop.addEventListener('click', closeDrawer);
  }

  if (els.compareToggle) {
    els.compareToggle.addEventListener('click', () => toggleCompare(activeAtomicNumber));
  }

  if (els.compareClear) {
    els.compareClear.addEventListener('click', () => {
      compareSelection = [];
      renderCompare();
    });
  }

  if (els.favoriteToggle) {
    els.favoriteToggle.addEventListener('click', () => toggleFavorite(activeAtomicNumber));
  }

  if (els.favoritesClear) {
    els.favoritesClear.addEventListener('click', () => {
      favoriteSelection = [];
      saveFavorites();
      renderFavorites();
      updateFavoriteButtonState();
    });
  }

  if (els.favoritesExport) {
    els.favoritesExport.addEventListener('click', exportFavorites);
  }

  if (els.favoritesImport) {
    els.favoritesImport.addEventListener('click', () => {
      if (els.favoritesImportFile) {
        els.favoritesImportFile.click();
      }
    });
  }

  if (els.favoritesImportFile) {
    els.favoritesImportFile.addEventListener('change', () => {
      const file = els.favoritesImportFile.files && els.favoritesImportFile.files[0];
      if (!file) {
        return;
      }
      importFavoritesFromFile(file);
      els.favoritesImportFile.value = '';
    });
  }

  if (els.favoritesList) {
    els.favoritesList.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-favorite]');
      if (removeButton) {
        const atomic = Number(removeButton.getAttribute('data-remove-favorite'));
        favoriteSelection = favoriteSelection.filter((entry) => entry !== atomic);
        saveFavorites();
        renderFavorites();
        updateFavoriteButtonState();
      }
    });
  }

  if (els.quizStart) {
    els.quizStart.addEventListener('click', startQuiz);
  }

  if (els.quizRestart) {
    els.quizRestart.addEventListener('click', restartQuiz);
  }

  if (els.quizStop) {
    els.quizStop.addEventListener('click', stopQuiz);
  }

  if (els.quizExportCsv) {
    els.quizExportCsv.addEventListener('click', exportQuizHistoryCsv);
  }

  if (els.quizNext) {
    els.quizNext.addEventListener('click', nextQuizQuestion);
  }

  if (els.quizLimit) {
    els.quizLimit.addEventListener('change', () => {
      if (!quizState.active) {
        quizState.limit = getConfiguredQuizLimit();
        updateQuizScore();
      }
    });
  }

  if (els.quizMode) {
    els.quizMode.addEventListener('change', () => {
      if (!quizState.active) {
        quizState.mode = getConfiguredQuizMode();
        updateQuizScore();
      }
    });
  }

  if (els.compareList) {
    els.compareList.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-atomic]');
      if (removeButton) {
        const atomic = Number(removeButton.getAttribute('data-remove-atomic'));
        compareSelection = compareSelection.filter((entry) => entry !== atomic);
        renderCompare();
        return;
      }

      const compareItem = event.target.closest('.compare-item');
      if (compareItem) {
        const atomic = Number(compareItem.dataset.atomic);
        selectElement(atomic, true);
      }
    });
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.search-wrap')) {
      els.suggestions.classList.remove('visible');
    }

    if (event.target === document.body) {
      closeDrawer();
    }
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const typingField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if (typingField && event.key !== '/') {
      return;
    }

    if (event.key === '/' && !typingField) {
      event.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
      return;
    }

    if (typingField) {
      return;
    }

    if (event.key === 'c' || event.key === 'C') {
      event.preventDefault();
      toggleCompare(activeAtomicNumber);
      return;
    }

    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      toggleFavorite(activeAtomicNumber);
      return;
    }

    if (event.key === 'Escape') {
      closeDrawer();
    }
  });
}

async function init() {
  if (els.suggestions) {
    els.suggestions.setAttribute('role', 'listbox');
  }

  if (els.sidebarDrawer) {
    els.sidebarDrawer.setAttribute('aria-hidden', 'true');
  }

  elements = await loadElementsFromJson('./elements.json', elements);
  loadFavorites();
  loadQuizStorage();
  populateFilterOptions();
  buildGrid();
  buildLegend();
  renderCompare();
  renderFavorites();
  quizState.mode = getConfiguredQuizMode();
  quizState.limit = getConfiguredQuizLimit();
  updateQuizScore();
  updateQuizNextState();
  updateQuizControlState();
  updateStats();
  initTheme(els.themeToggle);
  bindEvents();
  selectElement(activeAtomicNumber);
  applyFilters();
  closeDrawer();
  registerServiceWorker();
}

init();

