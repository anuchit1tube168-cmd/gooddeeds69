# CodeV2 2.5.1 — Migration-safe patch

Purpose: finish legacy migration without deleting historical `MIG-MAIN2569-*` summary records and without double-counting them after detailed `LEGACY-*` records are imported.

## Verified preflight

- legacy_students_v2.json: 380 students, 380 unique student IDs
- legacy_deeds_v2.json: 3,040 deeds, 3,040 unique legacy IDs
- legacy LINE bindings: 9
- invalid students: 0
- duplicate students: 0
- invalid LINE IDs: 0
- duplicate LINE IDs: 0
- invalid deeds: 0
- duplicate deeds: 0
- orphan deeds: 0
- source deed status: 3,040 approved
- existing MembersV2 observed before migration: 23 students
- existing GoodDeedRecordsV2 observed before migration: 18 rows (16 `MIG-MAIN2569-*` summary placeholders + 2 current pending records)
- legacy import logic intentionally skips 11 source rows that are accumulated-summary records over 24 hours.

## Required CodeV2 changes

### 1) Version

```diff
-  VERSION: '2.5.0',
+  VERSION: '2.5.1',
```

### 2) Hide superseded migration summaries from normal history

In `listDeeds_()` add before role filtering:

```js
if (String(row.status || '') === 'superseded') return false;
```

### 3) Make superseded records read-only

In `reviewDeed_()` after loading the record:

```js
if (String(record.status || '') === 'superseded') {
  throw new Error('รายการ migration นี้เป็นประวัติแบบอ่านอย่างเดียว');
}
```

### 4) Exclude superseded rows from summary totals

Replace the records filter in `getSummary_()` with:

```js
const rows = table_(GD.SHEETS.RECORDS).rows.filter(function(row) {
  if (String(row.status || '') === 'superseded') return false;
  return !memberId || String(row.memberId) === memberId;
});
```

### 5) Finalize legacy migration safely

Replace `legacyMigrationWorker_()` completion section with:

```js
function legacyMigrationWorker_() {
  const deedResult = importLegacyDeedsBatch_();
  if (!deedResult.done) return { phase: 'deeds', result: deedResult };
  const evidenceResult = migrateLegacyEvidenceBatch_();
  if (evidenceResult.done) {
    const supersededResult = supersedeMain2569SummaryRecords_();
    stopLegacyMigrationTrigger_();
    const now = new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty('LEGACY_MIGRATION_COMPLETED_AT', now);
    upsertConfig_('legacyMigrationCompletedAt', now);
    upsertConfig_('main2569SummarySuperseded', String(supersededResult.superseded));
    audit_('system', 'legacy.migration.completed', 'system', 'migration-v2', {
      evidence: evidenceResult,
      supersededMain2569: supersededResult
    }, 'legacy-migration-complete');
    return { phase: 'complete', result: evidenceResult, superseded: supersededResult };
  }
  return { phase: 'evidence', result: evidenceResult };
}
```

Add:

```js
function supersedeMain2569SummaryRecords_() {
  const table = table_(GD.SHEETS.RECORDS);
  const detailedMembers = new Set();
  table.rows.forEach(function(row) {
    if (String(row.recordId || '').indexOf('LEGACY-') === 0) {
      detailedMembers.add(String(row.memberId || ''));
    }
  });

  let superseded = 0;
  let preserved = 0;
  const now = new Date().toISOString();

  table.rows.forEach(function(row, index) {
    const recordId = String(row.recordId || '');
    if (recordId.indexOf('MIG-MAIN2569-') !== 0 || String(row.status || '') === 'superseded') return;
    if (!detailedMembers.has(String(row.memberId || ''))) {
      preserved++;
      return;
    }

    const note = clean_([
      row.reviewNote,
      'Superseded after detailed legacy migration; preserved for audit and rollback'
    ].filter(Boolean).join(' | '), 500);

    updateRow_(table.sheet, table.headers, index + 2, {
      status: 'superseded',
      reviewNote: note,
      updatedAt: now
    });
    superseded++;
  });

  const result = {
    superseded: superseded,
    preservedWithoutDetailedRecords: preserved
  };
  audit_('system', 'migration.main2569.summary.superseded', 'system', 'migration-v2', result, 'migration-supersede-main2569');
  console.log('MIGRATION_MAIN2569_SUPERSEDE ' + JSON.stringify(result));
  return result;
}
```

## Execution order

1. Create `createSystemSnapshot('before-legacy-full-migration', <owner>)`.
2. Run `preflightMigration()` and require `ok=true`.
3. Apply this 2.5.1 patch in the Apps Script project.
4. Deploy a new Web App version without changing the existing LIFF endpoint yet.
5. Run `startLegacyMigration()` once.
6. Let `legacyMigrationWorker_` process deeds/evidence in batches.
7. Confirm `MembersV2` reaches 380 student rows plus any staff/admin rows.
8. Confirm detailed legacy rows are imported and `MIG-MAIN2569-*` placeholders are marked `superseded` only where detailed records exist.
9. Compare official totals against `Main_2569`; zero unexplained differences required.
10. Only then switch Student auth from browser roster/password validation to server-side LINE/session flow.

## Non-negotiable

- Do not delete legacy records.
- Do not change current LIFF endpoint during migration.
- Do not expose roster/passwords/LINE IDs in GitHub or browser.
- Production cutover requires E2E + rollback evidence + owner approval.
