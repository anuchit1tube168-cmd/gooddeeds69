const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const owner = ['99', '00001'].join('');

for (const page of ['approve_sign', 'deed_slip']) {
  function lookup(rows) {
    const html = fs.readFileSync(`frontend/${page}.html`, 'utf8');
    const start = html.indexOf('        function findDeed(');
    const end = html.indexOf('        async function load', start);
    const context = vm.createContext({App: {getDeeds: () => rows}, DEEDS_DATA: rows});
    vm.runInContext(html.slice(start, end), context);
    return context.findDeed;
  }
  test(`${page}: missing, partial and unscoped IDs never select another deed`, () => {
    const row = {id: 'deed_exact', studentId: owner, status: 'pending'};
    const find = lookup([row]);
    assert.equal(find(row.id, owner), row);
    for (const id of ['', 'missing', 'exact', 'deed_exact_extra']) {
      assert.equal(find(id, owner), null);
    }
    assert.equal(find(row.id, ''), null);
    assert.equal(find(row.id, 'invalid'), null);
  });
  test(`${page}: mismatched owners and ambiguous duplicates fail closed`, () => {
    const row = {id: 'deed_exact', studentId: owner};
    assert.equal(lookup([row])(row.id, owner.slice(0, -1) + '2'), null);
    assert.equal(lookup([{id: row.id}])(row.id, owner), null);
    assert.equal(lookup([row, {...row}])(row.id, owner), null);
    assert.equal(lookup([{id: row.id, student_id: owner}])(row.id, owner).student_id, owner);
  });
}
