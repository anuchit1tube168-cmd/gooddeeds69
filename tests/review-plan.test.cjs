const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const TEST_STUDENT = ['99', '00001'].join('');
const context = vm.createContext({}); // No Apps Script, network or write services.
vm.runInContext(fs.readFileSync('backend/GoodDeedReviewPlan.gs', 'utf8'), context);
const plain = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const maps = JSON.parse(fs.readFileSync('docs/staging-columns.example.json', 'utf8'));
  const ledgerHeaders = ['Deed ID','รหัสนักเรียน','หมวดหมู่ ID','จำนวนชั่วโมง','วันที่ทำกิจกรรม','รายละเอียด','สถานะ','วันที่ส่งเรื่อง'];
  const masterHeaders = ['ลำดับ','รหัสประจำตัว','ยศ','ชื่อ','นามสกุล','ชั้นปี (รุ่น)',...maps.masterColumnMap.categoryHours,'รวมชั่วโมงสะสม','เกณฑ์ขั้นต่ำ','ผลการประเมิน (Grade)','ระดับความดี (Level)','LINE User ID','LINE Display Name','อัปเดตล่าสุด'];
  const ledgerValues = [ledgerHeaders, ['deed_synthetic', TEST_STUDENT, 6, 1, '2026-09-06', 'Synthetic activity', 'pending', '2026-09-06T01:00:00Z']];
  const masterValues = [masterHeaders, [1, TEST_STUDENT, 'Synthetic', 'Test', 'Person', 'Test cohort', 0,0,0,0,0,3,0,0,0,103,'existing policy','existing result','existing level','','','']];
  const table = values => ({values, formulas: values.map(row => row.map(() => ''))});
  const snapshot = {ledger: table(ledgerValues), master: table(masterValues)};
  const review = {deedId: 'deed_synthetic', decision: 'approved'};
  return {snapshot, maps, review, plan: () => context.buildGoodDeedReviewPlan_(snapshot, review, maps)};
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

test('mapped plan targets status G, stored category and official carry-forward total without effects', () => {
  const f = fixture(), before = plain(f.snapshot); freeze(f.snapshot); freeze(f.maps); freeze(f.review);
  const p = plain(f.plan());
  assert.equal(p.executable, false); assert.equal(p.duplicate, false);
  assert.deepEqual(p.changes, [
    {table:'ledger', row:2, column:7, value:'approved'},
    {table:'master', row:2, column:12, value:4},
    {table:'master', row:2, column:16, value:104}
  ]);
  assert.deepEqual(p.totalHours, {before:103, after:104});
  assert.deepEqual(f.snapshot, before);
  assert.equal(p.preconditions.some(c => c.table === 'ledger' && c.row === 1 && c.column === 7 && c.value === 'สถานะ'), true);
  assert.equal(p.preconditions.some(c => c.table === 'master' && c.row === 2 && c.column === 16 && c.value === 103), true);
});
test('mapped plan follows reordered headers and never uses positional offsets', () => {
  const f = fixture();
  Object.values(f.snapshot).forEach(table => { table.values.forEach(row => row.reverse()); table.formulas.forEach(row => row.reverse()); });
  const p = plain(f.plan());
  assert.deepEqual(p.changes.map(c => [c.table,c.column,c.value]), [['ledger',2,'approved'], ['master',11,4], ['master',7,104]]);
});
test('mapped plan preserves formulas and never invents their post-review totals', () => {
  const f = fixture();
  f.snapshot.master.formulas[1][11] = '=SUMIF(Deeds!C:C,6,Deeds!D:D)';
  f.snapshot.master.formulas[1][15] = '=SUM(G2:O2)+100';
  const p = plain(f.plan());
  assert.equal(p.changes.length, 1); assert.equal(p.preservedFormulas.length, 2);
  assert.deepEqual(p.categoryHours, {before:3, after:null});
  assert.deepEqual(p.totalHours, {before:103, after:null}); assert.equal(p.requiresRecalculation, true);
  assert.equal(p.preconditions.some(c => c.formula === '=SUM(G2:O2)+100'), true);
});
test('mapped plan handles mixed formula and numeric hours without overwriting a formula', () => {
  for (const [formulaColumn, numericColumn] of [[11,16],[15,12]]) {
    const f = fixture(); f.snapshot.master.formulas[1][formulaColumn] = '=SUM(1,2)';
    const p = plain(f.plan()); assert.equal(p.changes.length,2); assert.equal(p.changes[1].column,numericColumn);
    assert.equal(p.preservedFormulas.length,1); assert.equal(p.preservedFormulas[0].column,formulaColumn+1);
  }
});
test('mapped rejection and repeated final decisions have no hour updates', () => {
  const f=fixture(); f.review.decision='rejected'; const p=plain(f.plan());
  assert.deepEqual(p.changes,[{table:'ledger',row:2,column:7,value:'rejected'}]);
  for (const decision of ['approved','rejected']) {
    const g=fixture();g.review.decision=decision;g.snapshot.ledger.values[1][6]=decision;
    const duplicate=plain(g.plan());assert.equal(duplicate.duplicate,true);assert.deepEqual(duplicate.changes,[]);
  }
});
test('mapped plan stops conflicting decisions and uncertain approval transitions', () => {
  for (const [status, error] of [['rejected','REVIEW_CONFLICT'],['approving','REVIEW_RECONCILIATION_REQUIRED'],['unknown','REVIEW_STORED_DEED_INVALID']]) {
    const f=fixture();f.snapshot.ledger.values[1][6]=status;assert.throws(f.plan,new RegExp(error));
  }
});
test('mapped plan rejects duplicate or missing identities across the whole snapshot', () => {
  for (const name of ['master','ledger']) {
    const f=fixture(),t=f.snapshot[name];t.values.push([...t.values[1]]);t.formulas.push([...t.formulas[1]]);
    assert.throws(f.plan,/REVIEW_IDENTITY_AMBIGUOUS/);
    const g=fixture();g.snapshot[name].values.pop();g.snapshot[name].formulas.pop();assert.throws(g.plan,/REVIEW_IDENTITY_AMBIGUOUS/);
  }
  const f=fixture();f.snapshot.ledger.values[1][1]=TEST_STUDENT.slice(0,-1)+'2';assert.throws(f.plan,/REVIEW_IDENTITY_AMBIGUOUS/);
});
test('mapped plan rejects missing, duplicate and aliased header mappings', () => {
  const mutations = [
    f=>{f.snapshot.ledger.values[0][6]='unexpected';},
    f=>{f.snapshot.ledger.values[0][7]='สถานะ';},
    f=>{f.maps.masterColumnMap.categoryHours[1]=f.maps.masterColumnMap.categoryHours[0];},
    f=>{f.maps.ledgerColumnMap.status=f.maps.ledgerColumnMap.hours;},
    f=>{f.maps.masterColumnMap.categoryHours.pop();},
    f=>{delete f.maps.masterColumnMap.categoryHours[2];}
  ];
  mutations.forEach(mutate=>{const f=fixture();mutate(f);assert.throws(f.plan,/REVIEW_(?:HEADER|MAPPING)_INVALID/);});
});
test('mapped plan requires a complete formula snapshot, including sparse cells', () => {
  const mutations = [
    f=>{delete f.snapshot.master.formulas;},
    f=>{f.snapshot.master.formulas[1].pop();},
    f=>{delete f.snapshot.master.formulas[1][11];},
    f=>{delete f.snapshot.master.values[1][11];},
    f=>{f.snapshot.master.formulas[0][15]='=1';}
  ];
  mutations.forEach(mutate=>{const f=fixture();mutate(f);assert.throws(f.plan,/REVIEW_SNAPSHOT_INVALID/);});
});
test('mapped plan refuses formula-driven identities or ledger facts', () => {
  for (const [table,column] of [['master',1],['ledger',0],['ledger',3],['ledger',6]]) {
    const f=fixture();f.snapshot[table].formulas[1][column]='=1';assert.throws(f.plan,/REVIEW_IDENTITY_OR_LEDGER_FORMULA/);
  }
});
test('mapped plan respects literal text and canonicalizes numeric seven-digit sheet identities', () => {
  const f=fixture();f.snapshot.ledger.values[1][5]='=Literal text';
  f.snapshot.ledger.values[1][1]=Number(TEST_STUDENT);f.snapshot.master.values[1][1]=Number(TEST_STUDENT);
  const p=f.plan();assert.equal(p.studentId,TEST_STUDENT);assert.equal(p.changes.length,3);
  for (const owner of [true,{},[TEST_STUDENT],'123','  '+TEST_STUDENT]) {
    const g=fixture();g.snapshot.ledger.values[1][1]=owner;assert.throws(g.plan,/REVIEW_STORED_DEED_INVALID/);
  }
});
test('mapped plan accepts stored half hours and refuses typed coercions or altered request facts', () => {
  const f=fixture();f.snapshot.ledger.values[1][3]='0.5';assert.equal(f.plan().totalHours.after,103.5);
  for (const hours of [true,'','1e1','0x10',0.75,25]) {
    const g=fixture();g.snapshot.ledger.values[1][3]=hours;assert.throws(g.plan,/REVIEW_STORED_DEED_INVALID/);
  }
  for (const [key,value] of [['hours',20],['categoryId',1],['studentId',TEST_STUDENT],['role','admin']]) {
    const g=fixture();g.review[key]=value;assert.throws(g.plan,/REVIEW_REQUEST_INVALID/);
  }
});
test('mapped plan rejects corrupt official values and unsafe numeric precision', () => {
  for (const [column,value] of [[15,''],[15,true],[15,'1e2'],[15,-1],[15,'#REF!'],[15,Number.MAX_SAFE_INTEGER/2],[6,'invalid'],[11,0.25]]) {
    const f=fixture();f.snapshot.master.values[1][column]=value;
    assert.throws(f.plan,/REVIEW_MASTER_REQUIRES_RECONCILIATION/);
  }
});
