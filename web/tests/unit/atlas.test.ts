import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterFilms } from '../../src/catalog.ts';
import type { Film } from '../../src/catalog.ts';
import { home, pan, project, zoom } from '../../src/camera.ts';

const sample: Film[] = [
  { id: 'one', title: 'Café Orbit', year: 1994, format: 'Feature', genres: ['Drama'],
    provenance: { source: 'test', status: 'fictional', rights: 'CC0-1.0' } },
  { id: 'two', title: 'Café Orbit', year: 2022, format: 'TV movie', genres: ['Drama', 'Science fiction'],
    provenance: { source: 'test', status: 'fictional', rights: 'CC0-1.0' } },
];
test('title search ignores accents, and year, genre and format narrow the same results', () => {
  assert.equal(filterFilms(sample, { query: '  CAFÉ orbit ', format: '', genre: '' }).length, 2);
  assert.deepEqual(filterFilms(sample, { query: 'cafe 2022', format: 'TV movie', genre: 'Science fiction' })
    .map(film => film.id), ['two']);
  assert.equal(filterFilms(sample, { query: '1994', format: 'TV movie', genre: '' }).length, 0);
});

test('wheel zoom retains the world point under the cursor and clamps its scale', () => {
  const size = { width: 840, height: 560 };
  const point = { x: 0.9, y: -0.3 };
  const anchor = project(point, home, size);
  const next = zoom(home, size, anchor, 2.4);
  const after = project(point, next, size);
  assert.ok(Math.hypot(anchor.x - after.x, anchor.y - after.y) < 1e-8);
  assert.equal(zoom(next, size, anchor, 999).zoom, 9);
});

test('panning moves a world point by the pointer delta', () => {
  const size = { width: 400, height: 600 };
  const point = { x: 0.7, y: 0.4 };
  const from = project(point, home, size);
  const to = { x: from.x + 30, y: from.y - 25 };
  const actual = project(point, pan(home, size, from, to), size);
  assert.ok(Math.hypot(actual.x - to.x, actual.y - to.y) < 1e-8);
});
