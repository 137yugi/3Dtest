import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const TARGETS_PATH = path.join(ROOT, 'research', 'wayback-targets.json');
const OUT = path.join(ROOT, 'archive-results');
const API_DIR = path.join(OUT, 'api');
const SCREEN_DIR = path.join(OUT, 'screenshots');
const TEXT_DIR = path.join(OUT, 'text');
const HTML_DIR = path.join(OUT, 'html');
const USER_AGENT = 'ArtlistEvidencePreservation/1.0 (+https://github.com/137yugi/3Dtest; public-interest evidence preservation)';

async function ensureDirs() {
  await Promise.all([OUT, API_DIR, SCREEN_DIR, TEXT_DIR, HTML_DIR].map((dir) => fs.mkdir(dir, { recursive: true })));
}

function nowIso() {
  return new Date().toISOString();
}

function fileSafe(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': USER_AGENT,
        accept: options.accept ?? '*/*',
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      headers: {},
      text: '',
      error: String(error?.stack || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function capturePage(browser, {
  url,
  id,
  kind,
  keywords = [],
  viewport = { width: 1440, height: 1200 },
  waitMs = 4500,
}) {
  const result = {
    url,
    id,
    kind,
    capturedAt: nowIso(),
    success: false,
    finalUrl: null,
    title: null,
    screenshot: null,
    textFile: null,
    htmlFile: null,
    keywordScreenshots: [],
    errors: [],
  };

  const context = await browser.newContext({
    viewport,
    userAgent: USER_AGENT,
    locale: 'en-US',
    timezoneId: 'Asia/Tokyo',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  page.on('console', (msg) => {
    if (msg.type() === 'error') result.errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (error) => result.errors.push(`pageerror: ${String(error)}`));

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    result.httpStatus = response?.status() ?? null;
    await page.waitForTimeout(waitMs);

    const possibleButtons = [
      'button:has-text("Continue")',
      'button:has-text("Accept")',
      'button:has-text("Accept All")',
      'button:has-text("I agree")',
      'button:has-text("Got it")',
      '[aria-label="Close"]',
    ];
    for (const selector of possibleButtons) {
      try {
        const locator = page.locator(selector).first();
        if (await locator.isVisible({ timeout: 800 })) {
          await locator.click({ timeout: 1500 });
          await page.waitForTimeout(700);
        }
      } catch {
      }
    }

    result.finalUrl = page.url();
    result.title = await page.title().catch(() => '');

    const bodyText = await page.locator('body').innerText({ timeout: 20000 }).catch(() => '');
    const html = await page.content().catch(() => '');

    const base = `${fileSafe(id)}-${fileSafe(kind)}`;
    const screenshotRel = path.posix.join('archive-results', 'screenshots', `${base}.png`);
    const screenshotAbs = path.join(ROOT, screenshotRel);
    await page.screenshot({ path: screenshotAbs, fullPage: false, animations: 'disabled' });
    result.screenshot = screenshotRel;

    const textRel = path.posix.join('archive-results', 'text', `${base}.txt`);
    const htmlRel = path.posix.join('archive-results', 'html', `${base}.html`);
    await fs.writeFile(path.join(ROOT, textRel), bodyText, 'utf8');
    await fs.writeFile(path.join(ROOT, htmlRel), html, 'utf8');
    result.textFile = textRel;
    result.htmlFile = htmlRel;

    for (const keyword of keywords) {
      const normalized = String(keyword).trim();
      if (!normalized) continue;
      try {
        const locator = page.getByText(normalized, { exact: false }).first();
        const count = await locator.count();
        if (!count) continue;
        await locator.scrollIntoViewIfNeeded({ timeout: 5000 });
        await page.waitForTimeout(500);
        if (!(await locator.isVisible({ timeout: 1200 }))) continue;
        const keywordFile = `${base}-keyword-${fileSafe(normalized).slice(0, 60)}.png`;
        const keywordRel = path.posix.join('archive-results', 'screenshots', keywordFile);
        await locator.screenshot({ path: path.join(ROOT, keywordRel), animations: 'disabled' });
        result.keywordScreenshots.push({ keyword: normalized, file: keywordRel });
      } catch (error) {
        result.errors.push(`keyword ${normalized}: ${String(error)}`);
      }
    }

    result.success = true;
  } catch (error) {
    result.errors.push(String(error?.stack || error));
    try {
      const base = `${fileSafe(id)}-${fileSafe(kind)}-error`;
      const screenshotRel = path.posix.join('archive-results', 'screenshots', `${base}.png`);
      await page.screenshot({ path: path.join(ROOT, screenshotRel), fullPage: false });
      result.screenshot = screenshotRel;
      result.finalUrl = page.url();
      result.title = await page.title().catch(() => '');
    } catch {
    }
  } finally {
    await context.close();
  }

  return result;
}

async function listFilesRecursive(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFilesRecursive(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

async function writeChecksums() {
  const files = (await listFilesRecursive(OUT))
    .filter((file) => !file.endsWith('SHA256SUMS.txt'))
    .sort();
  const lines = [];
  for (const file of files) {
    const data = await fs.readFile(file);
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    lines.push(`${hash}  ${path.relative(ROOT, file).replaceAll(path.sep, '/')}`);
  }
  await fs.writeFile(path.join(OUT, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`, 'utf8');
}

function parseJsonSafely(text) {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (error) {
    return { value: null, error: String(error) };
  }
}

function escapeMd(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

async function main() {
  await ensureDirs();
  const targets = JSON.parse(await fs.readFile(TARGETS_PATH, 'utf8'));
  const run = {
    generatedAt: nowIso(),
    repository: process.env.GITHUB_REPOSITORY ?? null,
    commit: process.env.GITHUB_SHA ?? null,
    targets: [],
    methodologicalNote: 'Wayback availability and CDX responses are preserved verbatim. A missing or failed response is not treated as proof that no capture exists. Screenshots are automated browser captures and are accompanied by raw response files and SHA-256 checksums.',
  };

  const browser = await chromium.launch({ headless: true });

  for (const target of targets) {
    const targetResult = {
      id: target.id,
      label: target.label,
      originalUrl: target.url,
      checkedAt: nowIso(),
      availability: [],
      cdx: null,
      browserCaptures: [],
      uniqueSnapshots: [],
    };

    for (const date of target.dates ?? []) {
      const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(target.url)}&timestamp=${encodeURIComponent(date)}`;
      const response = await fetchText(apiUrl, { accept: 'application/json' });
      const parsed = parseJsonSafely(response.text);
      const apiRel = path.posix.join('archive-results', 'api', `${fileSafe(target.id)}-availability-${date}.json`);
      await writeJson(path.join(ROOT, apiRel), {
        requestedUrl: apiUrl,
        checkedAt: nowIso(),
        httpStatus: response.status,
        finalUrl: response.finalUrl,
        responseHeaders: response.headers,
        parseError: parsed.error,
        body: parsed.value ?? response.text,
        transportError: response.error ?? null,
      });

      const closest = parsed.value?.archived_snapshots?.closest ?? null;
      targetResult.availability.push({
        date,
        apiUrl,
        apiFile: apiRel,
        httpStatus: response.status,
        closest,
        parseError: parsed.error,
        transportError: response.error ?? null,
      });
      if (closest?.available && closest?.url) {
        targetResult.uniqueSnapshots.push({
          timestamp: closest.timestamp ?? null,
          url: String(closest.url).replace(/^http:/, 'https:'),
          status: closest.status ?? null,
          sourceDate: date,
        });
      }
    }

    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target.url)}&output=json&fl=timestamp,original,statuscode,mimetype,digest&filter=statuscode:200&from=20260701&to=20260811&collapse=digest`;
    const cdxResponse = await fetchText(cdxUrl, { accept: 'application/json,text/plain;q=0.9,*/*;q=0.8', timeoutMs: 120000 });
    const cdxParsed = parseJsonSafely(cdxResponse.text);
    const cdxRel = path.posix.join('archive-results', 'api', `${fileSafe(target.id)}-cdx.json`);
    await writeJson(path.join(ROOT, cdxRel), {
      requestedUrl: cdxUrl,
      checkedAt: nowIso(),
      httpStatus: cdxResponse.status,
      finalUrl: cdxResponse.finalUrl,
      responseHeaders: cdxResponse.headers,
      parseError: cdxParsed.error,
      body: cdxParsed.value ?? cdxResponse.text,
      transportError: cdxResponse.error ?? null,
    });
    targetResult.cdx = {
      url: cdxUrl,
      file: cdxRel,
      httpStatus: cdxResponse.status,
      parseError: cdxParsed.error,
      transportError: cdxResponse.error ?? null,
    };

    const unique = new Map();
    for (const snapshot of targetResult.uniqueSnapshots) {
      const key = `${snapshot.timestamp ?? ''}|${snapshot.url}`;
      if (!unique.has(key)) unique.set(key, snapshot);
    }
    targetResult.uniqueSnapshots = [...unique.values()].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))).slice(0, 6);

    targetResult.browserCaptures.push(await capturePage(browser, {
      url: target.url,
      id: target.id,
      kind: 'current-page',
      keywords: target.keywords ?? [],
      waitMs: 5000,
    }));

    targetResult.browserCaptures.push(await capturePage(browser, {
      url: `https://web.archive.org/web/*/${target.url}`,
      id: target.id,
      kind: 'wayback-calendar',
      keywords: [],
      waitMs: 7000,
    }));

    for (const snapshot of targetResult.uniqueSnapshots) {
      targetResult.browserCaptures.push(await capturePage(browser, {
        url: snapshot.url,
        id: target.id,
        kind: `wayback-${snapshot.timestamp ?? 'unknown'}`,
        keywords: target.keywords ?? [],
        waitMs: 6500,
      }));
    }

    run.targets.push(targetResult);
    await writeJson(path.join(OUT, 'manifest.partial.json'), run);
  }

  await browser.close();
  await writeJson(path.join(OUT, 'manifest.json'), run);
  await fs.rm(path.join(OUT, 'manifest.partial.json'), { force: true });

  const markdown = [];
  markdown.push('# Artlist / Seedance 2.5 — Wayback evidence capture');
  markdown.push('');
  markdown.push(`Generated: ${run.generatedAt}`);
  markdown.push('');
  markdown.push('This report does not infer that a page changed merely because a current page differs from a user recollection. It records API responses, calendar/replay screenshots, extracted text, and errors. Missing captures and failed requests are explicitly treated as inconclusive.');
  markdown.push('');

  for (const target of run.targets) {
    markdown.push(`## ${target.label}`);
    markdown.push('');
    markdown.push(`Original URL: ${target.originalUrl}`);
    markdown.push('');
    markdown.push('| Requested date | HTTP | Closest capture timestamp | Closest capture URL |');
    markdown.push('|---|---:|---|---|');
    for (const row of target.availability) {
      const closest = row.closest;
      markdown.push(`| ${row.date} | ${row.httpStatus} | ${escapeMd(closest?.timestamp ?? 'none returned')} | ${closest?.url ? `[open](${String(closest.url).replace(/^http:/, 'https:')})` : 'none returned'} |`);
    }
    markdown.push('');
    for (const capture of target.browserCaptures) {
      markdown.push(`### ${capture.kind}`);
      markdown.push('');
      markdown.push(`- Success: ${capture.success}`);
      markdown.push(`- Requested: ${capture.url}`);
      markdown.push(`- Final URL: ${capture.finalUrl ?? 'not available'}`);
      markdown.push(`- HTTP: ${capture.httpStatus ?? 'not available'}`);
      if (capture.screenshot) markdown.push(`- Screenshot: [${capture.screenshot}](${path.relative(OUT, path.join(ROOT, capture.screenshot)).replaceAll(path.sep, '/')})`);
      if (capture.textFile) markdown.push(`- Extracted text: [${capture.textFile}](${path.relative(OUT, path.join(ROOT, capture.textFile)).replaceAll(path.sep, '/')})`);
      if (capture.errors?.length) markdown.push(`- Errors: ${capture.errors.map(escapeMd).join(' / ')}`);
      markdown.push('');
    }
  }

  await fs.writeFile(path.join(OUT, 'REPORT.md'), `${markdown.join('\n')}\n`, 'utf8');
  await writeChecksums();
  console.log(`Wrote evidence capture to ${OUT}`);
}

main().catch(async (error) => {
  console.error(error);
  try {
    await ensureDirs();
    await fs.writeFile(path.join(OUT, 'FATAL_ERROR.txt'), `${nowIso()}\n${String(error?.stack || error)}\n`, 'utf8');
  } catch {
  }
  process.exitCode = 1;
});
