/* global HTMLCanvasElement, requestAnimationFrame, cancelAnimationFrame */
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { argv, platform, version } from 'node:process';
import { URL } from 'node:url';
import { chromium, devices } from '@playwright/test';
import { preview } from 'vite';

const assetNames = ['manifest.v1.json', 'catalog.v1.json', 'geometry.v1.json'];
const raw = await Promise.all(assetNames.map(name =>
  readFile(new URL('../dist/' + name, import.meta.url), 'utf8')
));
const [manifest, catalog, geometry] = raw.map(value => JSON.parse(value));
const profiles = [
  { name: 'Desktop', options: devices['Desktop Chrome'], cpu: 1, touch: false },
  { name: 'Mobile, 4x CPU throttle', options: devices['Pixel 7'], cpu: 4, touch: true },
];
const repetitions = 3;

function stressRelease(count) {
  const byId = new Map(geometry.points.map(point => [point.id, point]));
  const films = [];
  const points = [];
  for (let index = 0; index < count; index++) {
    const source = catalog.films[index % catalog.films.length];
    const oldPoint = byId.get(source.id);
    const id = 'benchmark:' + index;
    const angle = index * 2.39996323;
    films.push({ ...source, id, title: source.title + ' · ' + (index + 1) });
    points.push({ ...oldPoint, id,
      x: oldPoint.x + 0.015 * Math.cos(angle), y: oldPoint.y + 0.015 * Math.sin(angle) });
  }
  return [{ ...manifest, count }, { ...catalog, films }, { ...geometry, points }].map(value => JSON.stringify(value));
}

function percentile(values, fraction) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.ceil(ordered.length * fraction) - 1];
}

async function afterPaint(page) {
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function measurePan(page, client, touch) {
  const box = await page.getByLabel('Interactive map').boundingBox();
  if (!box) throw new Error('The map is not visible');
  const x = Math.round(box.x + box.width * 0.4);
  const y = Math.round(box.y + box.height * 0.45);
  const dx = Math.round(box.width * 0.25);
  if (touch) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
  }
  const stop = await page.evaluateHandle(() => {
    const intervals = [];
    let last = null;
    let frame;
    function sample(now) {
      if (last !== null) intervals.push(now - last);
      last = now;
      frame = requestAnimationFrame(sample);
    }
    frame = requestAnimationFrame(sample);
    return () => {
      cancelAnimationFrame(frame);
      return intervals;
    };
  });
  for (let step = 1; step <= 30; step++) {
    const nextX = x + Math.round(dx * step / 30);
    if (touch) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ id: 1, x: nextX, y }],
      });
    } else {
      await page.mouse.move(nextX, y);
    }
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  }
  if (touch) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.up();
  }
  await afterPaint(page);
  const intervals = await stop.evaluate(finish => finish());
  await stop.dispose();
  if (intervals.length < 10) throw new Error('Pan did not collect enough frame samples');
  return percentile(intervals, 0.95);
}

async function measure(browser, url, profile, rawAssets, isStress, disableCanvas = false) {
  const { count } = JSON.parse(rawAssets[0]);
  const context = await browser.newContext(profile.options);
  try {
    if (isStress) {
      await Promise.all(assetNames.map((name, index) => context.route('**/' + name, route =>
        route.fulfill({ contentType: 'application/json', body: rawAssets[index] })
      )));
    }
    const page = await context.newPage();
    if (disableCanvas) {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...options) {
          return type === '2d' ? null : original.call(this, type, ...options);
        };
      });
    }
    const client = await context.newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
    const start = performance.now();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.getByText(count + ' of ' + count, { exact: true }).waitFor();
    await afterPaint(page);
    const ready = performance.now() - start;
    const rows = await page.getByRole('list', { name: 'Matching films' }).getByRole('listitem').count();
    const pan = await measurePan(page, client, profile.touch);
    const filterStart = performance.now();
    await page.getByRole('searchbox', { name: 'Title or year' }).fill('Solaris 1972');
    await page.getByRole('button', { name: /^Solaris.*1972, Film$/ }).first().waitFor();
    await afterPaint(page);
    return { ready, pan, search: performance.now() - filterStart, rows };
  } finally {
    await context.close();
  }
}

const diagnostics = argv.includes('--diagnostics');
const stress = argv.includes('--actual-only') && !diagnostics ? null : stressRelease(5000);
const cases = diagnostics
  ? [{ name: 'Synthetic 5,000', data: stress }, { name: 'Synthetic 5,000, canvas bypassed', data: stress, disableCanvas: true }]
  : [{ name: 'Published pilot', data: raw }, ...(stress ? [{ name: 'Synthetic 5,000', data: stress }] : [])];
const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  const url = server.resolvedUrls.local[0];
  browser = await chromium.launch();
  console.log(`Node ${version}, Chromium ${browser.version()}, ${platform}; medians of ${repetitions} runs`);
  const report = [];
  for (const scenario of cases) {
    for (const profile of diagnostics ? profiles.filter(profile => profile.touch) : profiles) {
      const results = [];
      for (let run = 0; run < repetitions; run++) {
        results.push(await measure(browser, url, profile, scenario.data, scenario.data !== raw, scenario.disableCanvas));
      }
      const metric = key => Number(percentile(results.map(result => result[key]), 0.5).toFixed(1));
      report.push({
        catalog: scenario.name, profile: profile.name, films: JSON.parse(scenario.data[0]).count,
        'data KiB': Math.round(scenario.data.reduce((sum, asset) => sum + Buffer.byteLength(asset), 0) / 1024),
        'ready ms': metric('ready'), 'search ms': metric('search'), 'pan p95 ms': metric('pan'),
        'mounted rows': metric('rows'),
      });
    }
  }
  console.table(report);
} finally {
  await browser?.close();
  await server.close();
}
