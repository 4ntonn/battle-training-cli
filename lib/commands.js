'use strict';

const api = require('./api');
const { table, fmtDate, fmtRating, fmtRecord, fmtNum } = require('./format');

const NOVEMBER_CUP_SLUG = 'promotedby-cup-nov-2026';
const HIGHLIGHT_HANDLE = 'aralie';

function printJson(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function section(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

/** bt bot <handle> — profile + public ladder + cup entries + active version health. */
async function cmdBot(handle, opts) {
  let bot;
  try {
    bot = await api.getBot(handle);
  } catch (err) {
    if (err && err.status === 404) {
      throw new Error(`bot "${handle}" not found on battle.training`);
    }
    throw err;
  }
  if (opts.json) return printJson(bot);

  const armor = bot.theaters && bot.theaters.armor;
  const active = (bot.versions || []).find((v) => v.active);
  const created = fmtDate(bot.created_at);

  console.log(`${bot.name} (@${bot.handle})`);
  console.log(`  agent: ${bot.agent || '-'}   model: ${bot.model || '-'}   theater: ${bot.theater || '-'}`);
  console.log(`  created: ${created}   profile: https://battle.training/bots/${bot.handle}`);

  if (armor) {
    section('Public ladder');
    console.log(`  rank: ${armor.rank} / ${armor.of}   score: ${fmtNum(armor.score)}`);
    console.log(`  rating: ${fmtRating(armor.rating, armor.rd)}   record: ${fmtRecord(armor.wins, armor.losses, armor.draws)}   sets: ${fmtNum(armor.sets)}`);
    console.log(`  active version: ${armor.version || '-'}`);
  }

  if (bot.ladders && bot.ladders.length) {
    section('Cups & ladders');
    const rows = [['ladder', 'rating', 'score', 'record', 'games']];
    for (const entry of bot.ladders) {
      rows.push([
        entry.ladder,
        fmtRating(entry.rating, entry.rd),
        fmtNum(entry.score),
        fmtRecord(entry.wins, entry.losses, entry.draws),
        fmtNum(entry.games),
      ]);
    }
    console.log(table(rows, ['left', 'left', 'right', 'left', 'right']));
  }

  if (active) {
    section(`Active version ${active.label}`);
    const h = active.health || {};
    console.log(`  games: ${fmtNum(active.games)}   record: ${fmtRecord(active.wins, active.losses, active.draws)}   rating: ${fmtRating(active.rating, active.rd)}`);
    console.log(`  health: timeouts ${h.timeouts ?? '-'}  exceptions ${h.exceptions ?? '-'}  idle ticks ${h.idle_ticks ?? '-'}`);
  }
}

/** bt cup [handle] — November Cup standings, top 10 + the highlighted bot's row. */
async function cmdCup(highlightHandle, opts) {
  const cup = await api.getLadder(NOVEMBER_CUP_SLUG);
  if (opts.json) return printJson(cup);

  const prize = cup.prize || {};
  const split = (prize.split_usd || []).map((n) => `$${n}`).join(' / ');
  console.log(`${cup.name} — ${cup.url || 'https://battle.training/cup'}`);
  console.log(`  prize: $${prize.total_usd || '?'} ${prize.currency || 'USDC'} on ${prize.network || '?'} (${split})   ` +
    `window: ${fmtDate(cup.starts_at)} – ${fmtDate(cup.ends_at)}`);
  console.log(`  enrolled: ${fmtNum(cup.enrolled)} bots   qualify: ${cup.entry && cup.entry.min_sets_to_qualify} rated sets`);

  const standings = cup.standings || [];
  const limit = opts.limit || 10;
  section(`Top ${Math.min(limit, standings.length)}`);
  const rows = [['#', 'bot', 'rating', 'score', 'record', 'games', 'qualified']];
  for (const s of standings.slice(0, limit)) {
    rows.push([
      String(s.rank),
      s.bot,
      fmtRating(s.rating, s.rd),
      fmtNum(s.score),
      fmtRecord(s.wins, s.losses, s.draws),
      fmtNum(s.games),
      s.qualified ? 'yes' : `${s.sets_to_qualify ?? '?'} to go`,
    ]);
  }
  console.log(table(rows, ['right', 'left', 'left', 'right', 'left', 'right', 'left']));

  const highlight = highlightHandle || HIGHLIGHT_HANDLE;
  const mine = standings.find((s) => s.handle === highlight || s.bot === highlight);
  if (mine && mine.rank > limit) {
    section(`Your bot: ${mine.bot}`);
    console.log(`  rank ${mine.rank}   rating ${fmtRating(mine.rating, mine.rd)}   score ${fmtNum(mine.score)}   ` +
      `record ${fmtRecord(mine.wins, mine.losses, mine.draws)}   games ${fmtNum(mine.games)}   ` +
      (mine.qualified ? 'qualified' : `${mine.sets_to_qualify} sets to qualify`));
  } else if (!mine) {
    console.log(`\n  ${highlight} is not on the cup standings (yet).`);
  }
}

/** bt matches <handle> — recent sets, newest first, from the bot's perspective. */
async function cmdMatches(handle, opts) {
  const limit = opts.limit || 10;
  const data = await api.getMatches(handle, limit);
  if (opts.json) return printJson(data);

  const matches = data.matches || [];
  if (!matches.length) {
    console.log(`No matches found for "${handle}".`);
    return;
  }
  console.log(`Recent matches for ${handle} (newest first):`);
  for (const m of matches) {
    const mineIsA = m.a && m.a.handle === handle;
    const opp = mineIsA ? m.b : m.a;
    let result = '?';
    if (m.status === 'done' && typeof m.winner === 'number') {
      const iWon = (mineIsA && m.winner === 0) || (!mineIsA && m.winner === 1);
      result = iWon ? 'W' : 'L';
    } else if (m.status !== 'done') {
      result = m.status.toUpperCase();
    }
    const ratingDelta = (m.a && m.b)
      ? (() => {
          const side = mineIsA ? m.a : m.b;
          return side.rating_before != null && side.rating_after != null
            ? `${side.rating_before} → ${side.rating_after}`
            : '-';
        })()
      : '-';
    console.log(`\n  [${result}] ${fmtDate(m.finished_at || m.created_at)}  ${m.ladder}  vs ${opp ? opp.handle : '?'}` +
      ` (${opp ? opp.bot : '?'}, ${opp ? opp.version : '?'})`);
    console.log(`      ${m.reason || '-'}   score ${Array.isArray(m.score) ? m.score.join('-') : '-'}   rating ${ratingDelta}`);
    console.log(`      watch: ${m.watch_url || '-'}`);
  }
}

/** bt ladders — every ladder and cup on the arena. */
async function cmdLadders(opts) {
  const data = await api.getLadders();
  if (opts.json) return printJson(data);

  const ladders = data.ladders || [];
  const rows = [['slug', 'name', 'kind', 'theater', 'status', 'enrolled', 'prize']];
  for (const l of ladders) {
    const prize = l.prize && l.prize.total_usd != null
      ? `$${l.prize.total_usd} ${l.prize.currency || ''}`.trim()
      : '-';
    rows.push([
      l.slug,
      l.name,
      l.kind || '-',
      l.theater || '-',
      l.status || '-',
      fmtNum(l.enrolled),
      prize,
    ]);
  }
  console.log(table(rows, ['left', 'left', 'left', 'left', 'left', 'right', 'left']));
  console.log(`\n${ladders.length} ladders · https://battle.training/ladders`);
}

module.exports = { cmdBot, cmdCup, cmdMatches, cmdLadders, NOVEMBER_CUP_SLUG };
