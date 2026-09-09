/**
 * Pure storage planning for the verified staging schema. NO HTTP handler,
 * authorization, policy decision, persistence or notification lives here.
 * A plan must never be executed from a client-provided snapshot. The future
 * writer must authorize assigned scope, verify a fresh signature and policy,
 * reread under its lock, and persist a recoverable review/outbox transaction.
 * See docs/REVIEW_STORAGE_CONTRACT.md. All entrypoints are private helpers.
 */
function buildGoodDeedReviewPlan_(snapshot, review, maps) {
  if (!review || typeof review !== 'object' || Array.isArray(review) ||
      Object.keys(review).some(key => !['deedId', 'decision'].includes(key)) ||
      typeof review.deedId !== 'string' || !/^[A-Za-z0-9._:-]{3,120}$/.test(review.deedId) ||
      !['approved', 'rejected'].includes(review.decision)) throw new Error('REVIEW_REQUEST_INVALID');
  const ledger = reviewPlanTable_(snapshot && snapshot.ledger);
  const master = reviewPlanTable_(snapshot && snapshot.master);
  const ledgerMap = maps && maps.ledgerColumnMap, masterMap = maps && maps.masterColumnMap;
  const ledgerKeys = ['deedId', 'studentId', 'categoryId', 'hours', 'activityDate', 'description', 'status', 'submittedAt'];
  const lc = reviewPlanColumns_(ledger.values[0], ledgerMap, ledgerKeys);
  if (!masterMap || !Array.isArray(masterMap.categoryHours) || masterMap.categoryHours.length !== 9) throw new Error('REVIEW_MAPPING_INVALID');
  const masterNames = {studentId: masterMap.studentId, totalHours: masterMap.totalHours};
  for (let i = 0; i < 9; i++) masterNames['category' + (i + 1)] = masterMap.categoryHours[i];
  const mc = reviewPlanColumns_(master.values[0], masterNames, Object.keys(masterNames));
  const deedRow = reviewPlanUniqueRow_(ledger.values, lc.deedId, review.deedId);
  const stored = ledger.values[deedRow], rawOwner = stored[lc.studentId];
  const owner = typeof rawOwner === 'number' && Number.isInteger(rawOwner) ? String(rawOwner) : rawOwner;
  if (typeof owner !== 'string' || !/^\d{7}$/.test(owner)) throw new Error('REVIEW_STORED_DEED_INVALID');
  const masterRow = reviewPlanUniqueRow_(master.values, mc.studentId, owner);
  const official = master.values[masterRow];
  if (!['string','number'].includes(typeof official[mc.studentId])) throw new Error('REVIEW_IDENTITY_AMBIGUOUS');
  // Identity and ledger facts must be stored constants, not changing formulas.
  if (ledgerKeys.some(key => ledger.formulas[deedRow][lc[key]] !== '') ||
      master.formulas[masterRow][mc.studentId] !== '') throw new Error('REVIEW_IDENTITY_OR_LEDGER_FORMULA');
  const category = reviewPlanDecimal_(stored[lc.categoryId]);
  const hours = reviewPlanDecimal_(stored[lc.hours]);
  if (!Number.isInteger(category) || category < 1 || category > 9 ||
      !Number.isFinite(hours) || hours < 0.5 || hours > 24 || !Number.isInteger(hours * 2)) throw new Error('REVIEW_STORED_DEED_INVALID');
  const status = stored[lc.status];
  if (status === 'approving') throw new Error('REVIEW_RECONCILIATION_REQUIRED');
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new Error('REVIEW_STORED_DEED_INVALID');
  if (status !== 'pending' && status !== review.decision) throw new Error('REVIEW_CONFLICT');

  const plan = {executable: false, deedId: review.deedId, studentId: owner,
    decision: review.decision, duplicate: status === review.decision,
    preconditions: [], changes: [], preservedFormulas: [], requiresRecalculation: false};
  function guard(table, name, row, column) {
    const cell = {table: name, row: row + 1, column: column + 1,
      value: table.values[row][column], formula: table.formulas[row][column]};
    plan.preconditions.push(cell);
    return cell;
  }
  // Header and record preconditions document what the future locked reread
  // must compare. They do not turn Sheets into an atomic compare-and-swap API.
  Object.values(lc).forEach(column => { guard(ledger, 'ledger', 0, column); guard(ledger, 'ledger', deedRow, column); });
  Object.values(mc).forEach(column => { guard(master, 'master', 0, column); guard(master, 'master', masterRow, column); });
  if (plan.duplicate) return plan;
  plan.changes.push({table: 'ledger', row: deedRow + 1, column: lc.status + 1, value: review.decision});
  if (review.decision === 'rejected') return plan;

  // Require valid official values; never substitute a sum of loaded deeds or
  // guess that an empty/error cell means zero. Carry-forward stays in the total.
  const numberColumns = Object.keys(mc).filter(key => key !== 'studentId');
  numberColumns.forEach(key => { reviewPlanHours_(official[mc[key]]); });
  const categoryColumn = mc['category' + category];
  function increment(column) {
    const before = reviewPlanHours_(official[column]);
    if (master.formulas[masterRow][column] !== '') {
      plan.preservedFormulas.push({table: 'master', row: masterRow + 1, column: column + 1,
        formula: master.formulas[masterRow][column], valueBefore: before});
      plan.requiresRecalculation = true;
      return {before: before, after: null};
    }
    const after = reviewPlanHours_(before + hours);
    plan.changes.push({table: 'master', row: masterRow + 1, column: column + 1, value: after});
    return {before: before, after: after};
  }
  plan.categoryHours = increment(categoryColumn);
  plan.totalHours = increment(mc.totalHours);
  return plan;
}

function reviewPlanTable_(table) {
  if (!table || !Array.isArray(table.values) || table.values.length < 1 ||
      !Array.isArray(table.values[0]) || table.values[0].length < 1 ||
      !Array.isArray(table.formulas) || table.formulas.length !== table.values.length) throw new Error('REVIEW_SNAPSHOT_INVALID');
  const width = table.values[0].length;
  for (let r = 0; r < table.values.length; r++) {
    if (!Array.isArray(table.values[r]) || table.values[r].length !== width ||
        !Array.isArray(table.formulas[r]) || table.formulas[r].length !== width) throw new Error('REVIEW_SNAPSHOT_INVALID');
    for (let c = 0; c < width; c++) {
      const formula = table.formulas[r][c];
      if (!(c in table.values[r]) || typeof formula !== 'string' ||
          (formula !== '' && (!formula.startsWith('=') || r === 0))) throw new Error('REVIEW_SNAPSHOT_INVALID');
    }
  }
  return table;
}

function reviewPlanColumns_(headers, map, keys) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) throw new Error('REVIEW_MAPPING_INVALID');
  const columns = {}, seen = new Set();
  keys.forEach(key => {
    const name = map[key];
    if (typeof name !== 'string' || !name.trim() || seen.has(name)) throw new Error('REVIEW_MAPPING_INVALID');
    seen.add(name);
    const matches = headers.map((header, i) => header === name ? i : -1).filter(i => i >= 0);
    if (matches.length !== 1) throw new Error('REVIEW_HEADER_INVALID');
    columns[key] = matches[0];
  });
  return columns;
}

function reviewPlanUniqueRow_(values, column, id) {
  const matches = values.map((row, i) => i > 0 && String(row[column]) === id ? i : -1).filter(i => i >= 0);
  if (matches.length !== 1) throw new Error('REVIEW_IDENTITY_AMBIGUOUS');
  return matches[0];
}
function reviewPlanDecimal_(value) {
  if (typeof value === 'number') return value;
  return typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value.trim()) : NaN;
}
function reviewPlanHours_(value) {
  const hours = reviewPlanDecimal_(value);
  if (!Number.isFinite(hours) || hours < 0 || !Number.isSafeInteger(hours * 2)) throw new Error('REVIEW_MASTER_REQUIRES_RECONCILIATION');
  return hours;
}
