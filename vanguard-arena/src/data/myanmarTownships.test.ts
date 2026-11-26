import test from 'node:test';
import assert from 'node:assert/strict';
import { MYANMAR_REGIONS, MYANMAR_TOWNSHIPS, getMyanmarTownshipLabel, isMyanmarTownshipId } from './myanmarTownships.ts';

test('Myanmar township directory matches the 330-township reference coverage', () => {
  assert.equal(MYANMAR_REGIONS.length, 15);
  assert.equal(MYANMAR_TOWNSHIPS.length, 330);
  assert.equal(new Set(MYANMAR_TOWNSHIPS.map((township) => township.id)).size, 330);
  assert.equal(new Set(MYANMAR_TOWNSHIPS.map((township) => township.regionEn)).size, 15);
  const expectedByRegion: Record<string, number> = {
    Ayeyarwady: 26, Bago: 28, Chin: 9, Kachin: 18, Kayah: 7, Kayin: 7,
    Magway: 25, Mandalay: 28, Mon: 10, 'Nay Pyi Taw': 8, Rakhine: 17,
    Sagaing: 37, Shan: 55, Tanintharyi: 10, Yangon: 45,
  };
  for (const [region, expectedCount] of Object.entries(expectedByRegion)) {
    assert.equal(MYANMAR_REGIONS.find((item) => item.en === region)?.townships.length, expectedCount, region);
  }
});

test('all township entries have bilingual names, valid IDs and known regions', () => {
  const regionNames = new Set(MYANMAR_REGIONS.map((region) => region.en));
  for (const township of MYANMAR_TOWNSHIPS) {
    assert.match(township.id, /^MMR[A-Z0-9]{4,17}$/);
    assert.ok(township.en.trim().length > 0, `missing English name for ${township.id}`);
    assert.ok(township.local.trim().length > 0, `missing Myanmar name for ${township.id}`);
    assert.match(township.local, /[က-႟]/u, `Myanmar-script name missing for ${township.id}`);
    assert.ok(regionNames.has(township.regionEn), `unknown region for ${township.id}`);
  }
});

test('township labels resolve by ID and hide unknown IDs', () => {
  const township = MYANMAR_TOWNSHIPS[0];
  assert.ok(getMyanmarTownshipLabel(township.id, 'my').includes(township.local));
  assert.ok(getMyanmarTownshipLabel(township.id, 'en').includes(township.en));
  assert.equal(getMyanmarTownshipLabel('UNKNOWN_CITY_ID', 'my'), '');
  assert.equal(isMyanmarTownshipId(township.id), true);
  assert.equal(isMyanmarTownshipId('UNKNOWN_CITY_ID'), false);
});
