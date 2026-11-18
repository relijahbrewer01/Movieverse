import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

const bitmap = (map: Locator) => map.evaluate((element: HTMLCanvasElement) => element.toDataURL());

async function waitForPaint(map: Locator) {
  await map.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

test('opening the source HTML directly shows launch instructions', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The local-file entry point is the same on both viewports');
  await page.goto(new URL('../../index.html', import.meta.url).href);
  await expect(page.getByRole('heading', { name: 'Start Movieverse' })).toBeVisible();
  await expect(page.getByText('pnpm dev', { exact: false })).toBeVisible();
});

test('the root HTML opens the interactive atlas from disk', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Verifies the local file entry point');
  await page.route(/^https?:\/\//, route => route.abort());
  await page.goto(new URL('../../../index.html', import.meta.url).href);
  await expect(page.locator('[id="atlas-manifest.v1.json"]')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Movieverse', exact: true })).toBeVisible();
  await expect(page.getByLabel('Interactive map')).toBeVisible();
  await expect(page.getByText(/^(\d+) of \1$/)).toBeVisible();
  await page.getByRole('searchbox', { name: 'Title or year' }).fill('七人の侍 1954');
  await page.getByRole('button', { name: 'Seven Samurai, 1954, Film' }).click();
  const details = page.getByRole('region', { name: 'Seven Samurai' });
  await expect(details.getByRole('link', { name: 'Wikidata Q189540' })).toHaveAttribute('href', 'https://www.wikidata.org/wiki/Q189540');
});

test('search and filter, open accessible details, then restore focus', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/^(\d+) of \1$/)).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Title or year' });
  await search.fill('Solaris');
  await expect(page.getByText(/^2 of \d+$/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Solaris, 1972, Film' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Solaris, 2002, Film' })).toBeVisible();
  await search.fill('Threads');
  await page.getByRole('combobox', { name: 'Format' }).selectOption('TV movie');
  await page.getByRole('combobox', { name: 'Genre' }).selectOption('Drama');
  await expect(page.getByText(/^1 of \d+$/)).toBeVisible();
  const result = page.getByRole('button', { name: 'Threads, 1984, TV movie' });
  await result.press('Enter');
  const details = page.getByRole('region', { name: 'Threads' });
  await expect(details.getByRole('heading')).toBeFocused();
  await expect(details.getByText('1984')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(details).toHaveCount(0);
  await expect(result).toBeFocused();
  await search.fill('missing movie');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText(/^(\d+) of \1$/)).toBeVisible();
});

test('filter the expanded catalog by country of origin and title', async ({ page }) => {
  await page.goto('/');
  const country = page.getByRole('combobox', { name: 'Country of origin' });
  const search = page.getByRole('searchbox', { name: 'Title or year' });
  await country.selectOption('Senegal');
  await search.fill('Touki Bouki');
  await expect(page.getByRole('button', { name: 'Touki Bouki, 1973, Film' })).toBeVisible();
  await country.selectOption('India');
  await expect(page.getByText('No films match these filters.')).toBeVisible();
  await search.fill('Pather Panchali');
  await expect(page.getByRole('button', { name: 'Pather Panchali, 1955, Film' })).toBeVisible();
});

test('result pages keep the list bounded and search still spans the full catalog', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Checks pagination shared by both viewports');
  await page.goto('/');
  const list = page.getByRole('list', { name: 'Matching films' });
  const pages = page.getByRole('navigation', { name: 'Film result pages' });
  const items = list.getByRole('listitem');
  await expect(pages.getByText(/^1–50 of \d+$/)).toBeVisible();
  await expect(items).toHaveCount(50);
  const first = await items.first().textContent();
  await pages.getByRole('button', { name: 'Next film results' }).click();
  await expect(pages.getByText(/^51–100 of \d+$/)).toBeVisible();
  await expect(items).toHaveCount(50);
  await expect(items.first()).not.toHaveText(first ?? '');
  const search = page.getByRole('searchbox', { name: 'Title or year' });
  await search.fill('Solaris 1972');
  await expect(list.getByRole('button', { name: 'Solaris, 1972, Film' })).toBeVisible();
  await expect(pages).toHaveCount(0);
  await search.fill('');
  await expect(pages.getByText(/^1–50 of \d+$/)).toBeVisible();
});

test('browse a reviewed TV movie with additional publication years', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Checks evidence shared by both viewports');
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Title or year' }).fill('Duel');
  await page.getByRole('combobox', { name: 'Genre' }).selectOption('Thriller');
  await page.getByRole('combobox', { name: 'Format' }).selectOption('TV movie');
  await page.getByRole('button', { name: 'Duel, 1971, TV movie' }).click();
  const details = page.getByRole('region', { name: 'Duel' });
  await expect(details.getByText('1972, 1973, 1974')).toBeVisible();
  await expect(details.getByRole('link', { name: 'Amblin production history' }))
    .toHaveAttribute('href', 'https://amblin.com/movie/duel/');
});

test('select a rendered point, navigate with buttons and keyboard', async ({ page }) => {
  await page.goto('/');
  const response = await page.request.get('/geometry.v1.json');
  expect(response.ok()).toBe(true);
  const { points } = await response.json() as { points: { id: string; x: number; y: number }[] };
  const alien = points.find(point => point.id === 'mv:wd:Q103569')!;
  const map = page.getByLabel('Interactive map');
  const box = (await map.boundingBox())!;
  await waitForPaint(map);
  const original = await bitmap(map);
  const scale = Math.min(box.width / 2.8, box.height / 1.75);
  await map.click({ position: { x: box.width / 2 + alien.x * scale, y: box.height / 2 + alien.y * scale } });
  await expect(page.getByRole('heading', { name: 'Alien', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close film details' }).click();
  await expect.poll(() => bitmap(map)).toBe(original);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect.poll(() => bitmap(map)).not.toBe(original);
  const zoomed = await bitmap(map);
  await map.press('ArrowRight');
  await expect.poll(() => bitmap(map)).not.toBe(zoomed);
  await page.getByRole('button', { name: 'Reset map view' }).click();
  await expect.poll(() => bitmap(map)).toBe(original);
});

test('touch drag and pinch change the map without selecting a point', async ({ page }, info) => {
  test.skip(info.project.name !== 'touch', 'Requires a touch viewport');
  await page.goto('/');
  const map = page.getByLabel('Interactive map');
  const box = (await map.boundingBox())!;
  const client = await page.context().newCDPSession(page);
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  await waitForPaint(map);
  const original = await bitmap(map);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x + 55, y }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => bitmap(map)).not.toBe(original);
  const panned = await bitmap(map);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
    { id: 1, x: x - 20, y }, { id: 2, x: x + 20, y },
  ] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [
    { id: 1, x: x - 65, y }, { id: 2, x: x + 65, y },
  ] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => bitmap(map)).not.toBe(panned);
  await expect(page.getByRole('button', { name: 'Close film details' })).toHaveCount(0);
});
