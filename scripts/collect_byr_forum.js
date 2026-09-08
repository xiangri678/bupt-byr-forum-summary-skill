const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.resolve(argValue('--cookie-file') || process.env.BYR_COOKIE_FILE || '.byr-cookie');
const DEFAULT_OUTPUT_FILE = path.resolve('byr-data.json');

const SLOW_MODE = !process.argv.includes('--fast');
const PAGE_DELAY_MS = SLOW_MODE ? 3500 : 300;
const DETAIL_DELAY_MS = SLOW_MODE ? 2200 : 200;

const BOARDS = {
  '悄悄话': { id: 'IWhisper', maxPages: 60 },
  '职场生涯': { id: 'WorkLife', maxPages: 20 },
  '求职就业': { id: 'Job', maxPages: 20 },
  '谈天说地': { id: 'Talking', maxPages: 20 }
};

function argValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

function formatDateYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMDLocal(ymd) {
  const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 8, 0, 0, 0);
}

function normalizeText(raw) {
  return (raw || '')
    .replace(/&emsp;|&nbsp;/g, ' ')
    .replace(/[\u00a0\u2002\u2003\u2009]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDailyWindow(now = new Date(), forcedDate = null) {
  let start;
  if (forcedDate) {
    start = parseYMDLocal(forcedDate);
    if (!start) throw new Error(`invalid --date: ${forcedDate}`);
  } else {
    const end0 = new Date(now);
    end0.setHours(8, 0, 0, 0);
    if (now < end0) end0.setDate(end0.getDate() - 1);
    start = new Date(end0);
    start.setDate(start.getDate() - 1);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    start,
    end,
    reportDate: formatDateYYYYMMDD(start),
    label: `${formatDateYYYYMMDD(start)} 08:00 ~ ${formatDateYYYYMMDD(end)} 08:00`
  };
}

function parseDateTimeByCell(rawDateText, now = new Date()) {
  const s = normalizeText(rawDateText);
  if (!s) return null;

  const timeOnly = s.match(/(\d{2}:\d{2}:\d{2})/);
  if (timeOnly && !/\d{4}-\d{2}-\d{2}/.test(s) && !/\d{2}-\d{2}/.test(s)) {
    const [hh, mm, ss] = timeOnly[1].split(':').map(Number);
    const d = new Date(now);
    d.setHours(hh, mm, ss, 0);
    return d;
  }

  const ymd = s.match(/(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (ymd) {
    const datePart = ymd[1];
    const timePart = ymd[2] || '12:00:00';
    const d = new Date(`${datePart}T${timePart}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const md = s.match(/(\d{2}-\d{2})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (md) {
    const [m, day] = md[1].split('-').map(Number);
    const timePart = md[2] || '12:00:00';
    const [hh, mm, ss] = timePart.split(':').map(Number);
    let y = now.getFullYear();
    let d = new Date(y, m - 1, day, hh, mm, ss, 0);
    if (d > now) d = new Date(y - 1, m - 1, day, hh, mm, ss, 0);
    return d;
  }

  return null;
}

function getCookies() {
  try {
    return fs.readFileSync(COOKIE_FILE, 'utf8').trim();
  } catch {
    return '';
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function jitter(base, ratio = 0.25) {
  const delta = Math.floor(base * ratio);
  return base + Math.floor((Math.random() * (delta * 2 + 1)) - delta);
}

async function fetchBoardPage(boardId, page) {
  const url = `https://bbs.byr.cn/board/${boardId}?p=${page}`;
  const cookie = getCookies();

  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookie
      },
      responseType: 'arraybuffer',
      timeout: 20000
    });

    const buf = Buffer.from(res.data);
    const html = iconv.decode(buf, 'gbk');

    const tooShort = buf.length < 1000;
    const isRateLimited = html.includes('请勿频繁登录') || html.includes('频繁登录');

    if (!tooShort && !isRateLimited) return html;

    const waitMs = 1200 * attempt;
    console.log(`  rate-limit on p${page}, retry ${attempt}/5 after ${waitMs}ms`);
    await sleep(waitMs);
  }

  throw new Error(`failed to fetch page ${page} after retries`);
}

function cleanupNoise(text) {
  return text
    .replace(/发信人:\s*[^\n]+/g, '')
    .replace(/信区:\s*[^\n]+/g, '')
    .replace(/标\s*题:\s*[^\n]+/g, '')
    .replace(/发信站:\s*[^\n]+/g, '')
    .replace(/--\s*※\s*来源:[^\n]*/g, '')
    .replace(/收起\s*▲?/g, '')
    .replace(/赞\(\d+\)\s*踩\(\d+\)\s*回复/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLikeDislike(text) {
  const m = (text || '').match(/赞\((\d+)\)\s*踩\((\d+)\)/);
  if (!m) return { likes: 0, dislikes: 0 };
  return { likes: parseInt(m[1], 10) || 0, dislikes: parseInt(m[2], 10) || 0 };
}

async function fetchArticleDeep(url) {
  const cookie = getCookies();
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookie
      },
      responseType: 'arraybuffer',
      timeout: 20000
    });

    const html = iconv.decode(Buffer.from(res.data), 'gbk');
    const $ = cheerio.load(html);
    $('br').replaceWith('\n');

    const opText = cleanupNoise($('.a-content-wrap').first().text()).slice(0, 2400);

    const highlighted = [];
    $('.a-content-wrap').each((_, el) => {
      const raw = $(el).text();
      const t = cleanupNoise(raw);
      const { likes, dislikes } = parseLikeDislike(raw);
      if (!t) return;
      if (likes >= 10 || dislikes >= 10) highlighted.push({ text: t.slice(0, 300), likes, dislikes });
    });

    const uniq = [];
    const seen = new Set();
    for (const x of highlighted) {
      const k = x.text;
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(x);
      }
    }

    uniq.sort((a, b) => (b.likes + b.dislikes) - (a.likes + a.dislikes));

    return {
      opText,
      highlightedReplies: uniq.slice(0, 5)
    };
  } catch (e) {
    return { opText: '', highlightedReplies: [], deepError: String(e && e.message || e) };
  }
}

function parseBoardRows(html, boardName, windowStart, windowEnd, now) {
  const $ = cheerio.load(html);
  const rows = [];

  $('tr').each((_, el) => {
    if ($(el).hasClass('top')) return;

    const titleTag = $(el).find('.title_9 a').first();
    if (!titleTag.length) return;

    const title = normalizeText(titleTag.text());
    const href = titleTag.attr('href') || '';
    if (!href.startsWith('/article/')) return;

    const link = `https://bbs.byr.cn${href}`;
    const dateCells = $(el).find('.title_10');
    const rawDateText = dateCells.eq(1).text() || dateCells.first().text();
    const lastUpdate = parseDateTimeByCell(rawDateText, now);
    const replyCount = parseInt($(el).find('.title_11').text().trim(), 10) || 0;

    const inWindow = !!(lastUpdate && lastUpdate >= windowStart && lastUpdate < windowEnd);

    rows.push({
      board: boardName,
      title,
      link,
      replyCount,
      lastUpdateRaw: normalizeText(rawDateText),
      lastUpdateIso: lastUpdate ? lastUpdate.toISOString() : null,
      isTargetWindow: inWindow
    });
  });

  return rows;
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`Usage: node scripts/collect_byr_forum.js [options]

Options:
  --date YYYY-MM-DD       Window start date at 08:00 Asia/Shanghai
  --cookie-file PATH      Cookie header file (default: ./.byr-cookie)
  --out PATH              Output JSON (default: ./byr-data.json)
  --fast                  Reduce delays for controlled testing only
  -h, --help              Show this help`);
    return;
  }

  if (!getCookies()) {
    throw new Error(`cookie file is missing or empty: ${COOKIE_FILE}. Run refresh_byr_cookie.py first.`);
  }

  const forcedDate = argValue('--date');
  const outputFile = path.resolve(argValue('--out') || DEFAULT_OUTPUT_FILE);
  const window = getDailyWindow(new Date(), forcedDate);
  const data = {};

  console.log(`Target window: ${window.label} (Asia/Shanghai)`);

  for (const [boardName, cfg] of Object.entries(BOARDS)) {
    console.log(`\n[${boardName}] crawling...`);
    const byLink = new Map();
    let noTargetStreak = 0;

    for (let p = 1; p <= cfg.maxPages; p++) {
      let html;
      try {
        if (p > 1) await sleep(jitter(PAGE_DELAY_MS));
        html = await fetchBoardPage(cfg.id, p);
      } catch (e) {
        console.log(`  p${p} fetch failed: ${e.message}`);
        break;
      }

      if (!html || html.includes('用户登录')) {
        console.log(`  p${p} requires login or empty, stop.`);
        break;
      }

      const rows = parseBoardRows(html, boardName, window.start, window.end, window.end);
      const hitRows = rows.filter(r => r.isTargetWindow);

      hitRows.forEach(r => {
        if (!byLink.has(r.link)) byLink.set(r.link, r);
      });

      console.log(`  p${p}: rows=${rows.length}, targetHits=${hitRows.length}, total=${byLink.size}`);

      if (hitRows.length === 0) noTargetStreak += 1;
      else noTargetStreak = 0;

      if (noTargetStreak >= 7 && p >= 8) {
        console.log(`  stop on p${p} (no target hits for ${noTargetStreak} pages)`);
        break;
      }
    }

    const items = Array.from(byLink.values())
      .sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));

    const deepTargets = items.filter(x => x.replyCount >= 10);
    for (const item of deepTargets) {
      await sleep(jitter(DETAIL_DELAY_MS));
      console.log(`  deep-read: ${item.title.slice(0, 24)}...`);
      const deep = await fetchArticleDeep(item.link);
      item.opText = deep.opText;
      item.highlightedReplies = deep.highlightedReplies;
      if (deep.deepError) item.deepError = deep.deepError;
    }

    data[boardName] = items;
  }

  data._meta = {
    mode: 'last-update-in-08-window',
    reportDate: window.reportDate,
    windowLabel: window.label,
    windowStartIso: window.start.toISOString(),
    windowEndIso: window.end.toISOString(),
    generatedAt: new Date().toISOString(),
    outputFile
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\nSaved: ${outputFile}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
