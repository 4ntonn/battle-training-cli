'use strict';

/**
 * Smoke test: runs the CLI against the LIVE battle.training API and checks
 * the output is real (a known bot is found, ranks/ratings are populated,
 * nothing is faked or placeholder). Exit 0 = all checks pass, 1 = failure.
 *
 *   npm test
 */

import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'bt.js');

let failures = 0;

function run(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [CLI, ...args], { timeout: 30000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

function check(name, ok, detail = '') {
  if (ok) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  console.log('battle-training-cli smoke test (live API)');

  // 1. bt bot aralie — the bot exists, rank/rating/version health are real.
  console.log('\n[1] bt bot aralie');
  const bot = await run(['bot', 'aralie']);
  check('exit 0', bot.code === 0, `exit ${bot.code}: ${bot.stderr.trim()}`);
  check('mentions aralie', bot.stdout.includes('aralie'));
  check('public ladder rank "N / M" present', /rank:\s*\d+ \/ \d+/.test(bot.stdout));
  check('rating with deviation present', /rating: \d+ ± \d+/.test(bot.stdout));
  check('cup entry present', bot.stdout.includes('promotedby-cup-nov-2026'));
  check('version health line present', bot.stdout.includes('health: timeouts'));

  // 2. bt cup — November Cup standings, top 10 + aralie's own row.
  console.log('\n[2] bt cup');
  const cup = await run(['cup']);
  check('exit 0', cup.code === 0, `exit ${cup.code}: ${cup.stderr.trim()}`);
  check('mentions November Cup', cup.stdout.includes('November Cup'));
  check('prize pool $250 shown', cup.stdout.includes('$250'));
  check('100-set qualification shown', cup.stdout.includes('100 rated sets'));
  check('top-10 table shown', cup.stdout.includes('Top 10'));
  check('aralie row shown', cup.stdout.includes('aralie'));

  // 3. bt matches aralie — recent sets with results and watch links.
  // --limit 10 (not 3): draws render as [?], and a 3-set window can be all
  // draws — 10 sets always contains a decisive W/L for an active bot.
  console.log('\n[3] bt matches aralie --limit 10');
  const matches = await run(['matches', 'aralie', '--limit', '10']);
  check('exit 0', matches.code === 0, `exit ${matches.code}: ${matches.stderr.trim()}`);
  check('mentions aralie', matches.stdout.includes('aralie'));
  check('at least one W/L result', /\[[WL]\]/.test(matches.stdout));
  check('watch link present', matches.stdout.includes('https://battle.training/watch?match='));

  // 4. bt ladders — every ladder, incl. the public ladder and the cup.
  console.log('\n[4] bt ladders');
  const ladders = await run(['ladders']);
  check('exit 0', ladders.code === 0, `exit ${ladders.code}: ${ladders.stderr.trim()}`);
  check('public ladder listed', ladders.stdout.includes('public'));
  check('November Cup listed', ladders.stdout.includes('promotedby-cup-nov-2026'));

  // 5. Unknown bot — clean failure, not a crash or fake data.
  console.log('\n[5] bt bot this-bot-does-not-exist-xyz');
  const missing = await run(['bot', 'this-bot-does-not-exist-xyz']);
  check('non-zero exit', missing.code !== 0, `exit ${missing.code}`);
  check('says "not found"', (missing.stderr + missing.stdout).includes('not found'));

  // 6. --json — the raw API response parses and carries the bot.
  console.log('\n[6] bt bot aralie --json');
  const json = await run(['bot', 'aralie', '--json']);
  let parsed = null;
  try {
    parsed = JSON.parse(json.stdout);
  } catch {
    parsed = null;
  }
  check('exit 0', json.code === 0, `exit ${json.code}: ${json.stderr.trim()}`);
  check('parses as JSON with name "aralie"', parsed !== null && parsed.name === 'aralie');
  check('public-ladder rank is a number', parsed !== null && typeof parsed.theaters?.armor?.rank === 'number');

  // 7. bt opponents aralie — head-to-head table + --vs filter.
  console.log('\n[7] bt opponents aralie');
  const opp = await run(['opponents', 'aralie']);
  check('exit 0', opp.code === 0, `exit ${opp.code}: ${opp.stderr.trim()}`);
  check('mentions aralie', opp.stdout.includes('aralie'));
  check('opponent table shown', opp.stdout.includes('win %'));
  check('at least one W-L-D record', /\d+-\d+-\d+/.test(opp.stdout));
  check('matchups summary shown', opp.stdout.includes('nemesis:'));

  console.log('\n[7b] bt opponents aralie --vs tokrus');
  const vs = await run(['opponents', 'aralie', '--vs', 'tokrus']);
  check('exit 0', vs.code === 0, `exit ${vs.code}: ${vs.stderr.trim()}`);
  check('mentions tokrus', vs.stdout.includes('tokrus'));
  check('record line present', /record: \d+-\d+-\d+/.test(vs.stdout));

  console.log('\n[7c] bt opponents this-bot-does-not-exist-xyz');
  const oppMissing = await run(['opponents', 'this-bot-does-not-exist-xyz']);
  check('non-zero exit', oppMissing.code !== 0, `exit ${oppMissing.code}`);
  check('says "not found"', (oppMissing.stderr + oppMissing.stdout).includes('not found'));

  console.log(failures === 0 ? '\nAll smoke checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`smoke test crashed: ${err.message}`);
  process.exit(1);
});
