const $ = (id) => document.getElementById(id);

const arrayInput = $('arrayInput');
const arrayView = $('arrayView');
const secondaryView = $('secondaryView');
const trace = $('trace');
const operationTitle = $('operationTitle');
const explanationTitle = $('explanationTitle');
const explanation = $('explanation');
const stateText = $('stateText');
const stepCount = $('stepCount');
const comparisonCount = $('comparisonCount');
const arraySize = $('arraySize');
const statusBadge = $('statusBadge');
const speed = $('speed');

let original = [38, 12, 27, 43, 9, 31, 18, 25];
let steps = [];
let currentStep = -1;
let timer = null;

const stageOrder = ['input', 'split', 'subdivide', 'compare', 'merge', 'complete'];

function parseInput() {
  const raw = arrayInput.value.trim();
  const values = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (values.length < 2 || values.length > 12 || values.some(v => !Number.isFinite(v) || !Number.isInteger(v))) {
    alert('Please enter 2–12 valid integers.');
    return null;
  }
  return values;
}

function addStep(type, message, state, arr, highlights = [], range = null) {
  steps.push({ type, message, state, arr: [...arr], highlights, range });
}

function buildSteps(values) {
  const result = [];
  steps = result;
  let work = [...values];
  addStep('input', `Initial unsorted array: [${work.join(', ')}]`, 'Initial array loaded', work);

  function sort(start, end, depth = 0) {
    if (end - start <= 1) {
      addStep('subdivide', `Base case reached: [${work.slice(start, end).join(', ')}]`, 'Single-element subarray', work, [start], [start, end]);
      return;
    }
    const mid = Math.floor((start + end) / 2);
    addStep(depth === 0 ? 'split' : 'subdivide',
      `Split [${work.slice(start, end).join(', ')}] into [${work.slice(start, mid).join(', ')}] and [${work.slice(mid, end).join(', ')}]`,
      'Dividing the array', work, [], [start, end]);
    sort(start, mid, depth + 1);
    sort(mid, end, depth + 1);

    let i = start, j = mid;
    const merged = [];
    addStep('merge', `Ready to merge [${work.slice(start, mid).join(', ')}] + [${work.slice(mid, end).join(', ')}]`, 'Preparing merge', work, [], [start, end]);
    while (i < mid && j < end) {
      addStep('compare', `Compare ${work[i]} and ${work[j]}`, 'Comparing front elements', work, [i, j], [start, end]);
      if (work[i] <= work[j]) merged.push(work[i++]);
      else merged.push(work[j++]);
    }
    while (i < mid) merged.push(work[i++]);
    while (j < end) merged.push(work[j++]);

    for (let k = 0; k < merged.length; k++) work[start + k] = merged[k];
    addStep('merge', `Merged sorted portion: [${work.slice(start, end).join(', ')}]`, 'Merged successfully', work, [], [start, end]);
  }

  sort(0, work.length);
  addStep('complete', `Sorting complete: [${work.join(', ')}]`, 'Final sorted array', work, Array.from({length: work.length}, (_, i) => i));
  return result;
}

function renderArray(arr, highlights = [], type = '') {
  arrayView.innerHTML = '';
  const max = Math.max(...arr.map(Math.abs), 1);
  arr.forEach((value, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'bar';
    if (type === 'complete') bar.classList.add('sorted');
    else if (type === 'compare' && highlights.includes(index)) bar.classList.add('compare');
    else if (highlights.includes(index)) bar.classList.add('current');
    else if (type === 'merge') bar.classList.add('merge');
    const height = 28 + (Math.abs(value) / max) * 120;
    bar.style.height = `${height}px`;
    bar.innerHTML = `<span class="value">${value}</span><span class="index">${index}</span>`;
    wrap.appendChild(bar);
    arrayView.appendChild(wrap);
  });
}

function stageIndex(type) {
  return stageOrder.indexOf(type);
}

function updateStages(type) {
  const idx = stageIndex(type);
  document.querySelectorAll('.stage').forEach(el => {
    const s = el.dataset.stage;
    const i = stageOrder.indexOf(s);
    el.classList.toggle('active', i === idx);
    el.classList.toggle('done', i < idx);
  });
}

function renderTrace() {
  trace.innerHTML = '';
  const limit = Math.min(currentStep + 1, steps.length);
  for (let i = 0; i < limit; i++) {
    const s = steps[i];
    const item = document.createElement('div');
    item.className = 'trace-item' + (i === currentStep ? ' active' : '');
    item.innerHTML = `<span class="trace-num">${i + 1}</span><span class="trace-type">${s.type.toUpperCase()}</span><span class="trace-detail">${s.message}</span>`;
    trace.appendChild(item);
  }
  const active = trace.querySelector('.active');
  if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showStep(index) {
  if (!steps.length) return;
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  const s = steps[currentStep];
  renderArray(s.arr, s.highlights, s.type);
  updateStages(s.type);
  renderTrace();
  stepCount.textContent = `${currentStep + 1} / ${steps.length}`;
  comparisonCount.textContent = steps.slice(0, currentStep + 1).filter(x => x.type === 'compare').length;
  operationTitle.textContent = s.type === 'complete' ? 'Final sorted array' : s.state;
  explanationTitle.textContent = labelForType(s.type);
  explanation.textContent = explanationForStep(s);
  stateText.textContent = s.message;
  statusBadge.textContent = currentStep === steps.length - 1 ? 'Complete' : `Step ${currentStep + 1}`;
  statusBadge.style.background = currentStep === steps.length - 1 ? 'var(--success-soft)' : '';
  statusBadge.style.color = currentStep === steps.length - 1 ? 'var(--success)' : '';
  secondaryView.innerHTML = s.range ? `<div class="subarray">Active range: index ${s.range[0]} → ${s.range[1] - 1}</div>` : '';
  $('stepBtn').disabled = currentStep >= steps.length - 1;
}

function labelForType(type) {
  return ({
    input: 'Initial unsorted array', split: 'Divide the array', subdivide: 'Recursive subdivision',
    compare: 'Compare elements', merge: 'Merge sorted portions', complete: 'Sorting complete'
  })[type] || 'Merge Sort';
}

function explanationForStep(s) {
  if (s.type === 'input') return 'The algorithm begins with the input array. Merge Sort will repeatedly divide the array into smaller subarrays.';
  if (s.type === 'split') return 'The divide-and-conquer strategy splits the current range into two smaller halves.';
  if (s.type === 'subdivide') return 'The recursive process continues until each subarray contains only one element. A single element is already sorted.';
  if (s.type === 'compare') return 'The front elements of the two sorted portions are compared. The smaller element is selected for the merged result.';
  if (s.type === 'merge') return 'The sorted portions are combined into one sorted portion while preserving ascending order.';
  return 'All recursive merges are finished. The entire array is now sorted in ascending order.';
}

function start() {
  const values = parseInput();
  if (!values) return;
  stopAuto();
  original = values;
  arraySize.textContent = values.length;
  steps = buildSteps(values);
  currentStep = -1;
  showStep(0);
}

function reset() {
  stopAuto();
  steps = [];
  currentStep = -1;
  renderArray(original);
  document.querySelectorAll('.stage').forEach((el, i) => el.classList.toggle('active', i === 0) || el.classList.remove('done'));
  stepCount.textContent = '0 / 0';
  comparisonCount.textContent = '0';
  operationTitle.textContent = 'Initial array';
  explanationTitle.textContent = 'Ready to begin';
  explanation.textContent = 'Press Start to generate the merge-sort steps for your array.';
  stateText.textContent = 'Waiting for input';
  statusBadge.textContent = 'Ready';
  statusBadge.style = '';
  secondaryView.innerHTML = '';
  trace.innerHTML = '';
  $('stepBtn').disabled = false;
}

function nextStep() {
  if (!steps.length) start();
  else if (currentStep < steps.length - 1) showStep(currentStep + 1);
  else stopAuto();
}

function autoPlay() {
  if (!steps.length) start();
  if (timer) { stopAuto(); return; }
  $('autoBtn').textContent = 'Pause';
  timer = setInterval(() => {
    if (currentStep >= steps.length - 1) { stopAuto(); return; }
    showStep(currentStep + 1);
  }, Number(speed.value));
}

function stopAuto() {
  if (timer) clearInterval(timer);
  timer = null;
  $('autoBtn').textContent = 'Auto Play';
}

$('applyBtn').addEventListener('click', start);
$('startBtn').addEventListener('click', start);
$('stepBtn').addEventListener('click', nextStep);
$('autoBtn').addEventListener('click', autoPlay);
$('resetBtn').addEventListener('click', reset);
$('randomBtn').addEventListener('click', () => {
  const n = 6 + Math.floor(Math.random() * 5);
  const values = Array.from({length: n}, () => Math.floor(Math.random() * 90) + 10);
  arrayInput.value = values.join(', ');
  start();
});
speed.addEventListener('input', () => {
  if (timer) { stopAuto(); autoPlay(); }
});

arrayInput.addEventListener('keydown', e => { if (e.key === 'Enter') start(); });

arraySize.textContent = original.length;
renderArray(original);
