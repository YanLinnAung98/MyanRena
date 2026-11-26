import test from 'node:test';
import assert from 'node:assert/strict';
import { MYANMAR_TOWNS, getMyanmarTownLabel, isMyanmarTownId } from './myanmarTowns.ts';
import { MYANMAR_REGIONS } from './myanmarTownships.ts';

test('Myanmar town directory contains 471 unique MIMU/GAD town records', () => {
  assert.equal(MYANMAR_TOWNS.length, 471);
  assert.equal(new Set(MYANMAR_TOWNS.map((town) => town.id)).size, 471);
  assert.equal(new Set(MYANMAR_TOWNS.map((town) => town.regionId)).size, 15);
});

test('all town records have bilingual labels and a valid region mapping', () => {
  const regionIds = new Set(MYANMAR_REGIONS.map((region) => region.id));
  for (const town of MYANMAR_TOWNS) {
    assert.match(town.id, /^MMR[A-Z0-9]{6,12}$/);
    assert.ok(town.en.trim().length > 0, `missing English town name for ${town.id}`);
    assert.ok(town.local.trim().length > 0, `missing Myanmar town name for ${town.id}`);
    assert.match(town.local, /[က-႟]/u, `Myanmar-script town name missing for ${town.id}`);
    assert.ok(town.townshipEn.trim().length > 0, `missing township for ${town.id}`);
    assert.ok(regionIds.has(town.regionId), `unknown region for ${town.id}`);
    assert.notEqual(town.source, 'Field Sources', `non-GAD field-source town included: ${town.id}`);
  }
});

test('town labels resolve by Town PCode and hide unknown IDs', () => {
  const town = MYANMAR_TOWNS[0];
  assert.ok(getMyanmarTownLabel(town.id, 'my').includes(town.local));
  assert.ok(getMyanmarTownLabel(town.id, 'en').includes(town.en));
  assert.equal(getMyanmarTownLabel('UNKNOWN_TOWN_ID', 'my'), '');
  assert.equal(isMyanmarTownId(town.id), true);
  assert.equal(isMyanmarTownId('UNKNOWN_TOWN_ID'), false);
});
