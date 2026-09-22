const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTimeToSeconds } = require('../../assets/themes/bootstrap-3/scripts/mediaPlayer.js');

test('parseTimeToSeconds converts minutes and seconds', () => {
  assert.equal(parseTimeToSeconds('3:10'), 190);
});

test('parseTimeToSeconds converts hours, minutes and seconds', () => {
  assert.equal(parseTimeToSeconds('1:02:03'), 3723);
});

test('parseTimeToSeconds accepts a bare seconds value', () => {
  assert.equal(parseTimeToSeconds('45'), 45);
});

test('parseTimeToSeconds ignores surrounding whitespace from markup', () => {
  assert.equal(parseTimeToSeconds(' 0:57 '), 57);
});
