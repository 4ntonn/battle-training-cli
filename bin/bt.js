#!/usr/bin/env node
'use strict';

/**
 * bt — command-line client for the battle.training tank-battle arena.
 *
 *   bt bot <handle>      bot profile, public-ladder rank/rating, cups, version health
 *   bt cup [handle]      promotedby.ai November Cup standings (top 10 + your bot)
 *   bt matches <handle>  recent sets, newest first
 *   bt opponents <handle> head-to-head record vs every opponent (--vs <bot> for one)
 *   bt ladders           every ladder and cup on the arena
 *
 * Flags: --json (raw API JSON), --limit <n> (matches / cup rows).
 * No API key, no account: every command reads the public API only.
 * Data: battle.training (CC BY 4.0) — https://battle.training
 */

const { cmdBot, cmdCup, cmdMatches, cmdOpponents, cmdLadders } = require('../lib/commands');

const VERSION = '1.1.0';

const USAGE = `bt — battle.training CLI ${VERSION}

Usage:
  bt bot <handle>        bot profile, public-ladder rank/rating, cups, version health
  bt cup [handle]        promotedby.ai November Cup standings (default highlight: aralie)
  bt matches <handle>    recent sets, newest first
  bt opponents <handle>  head-to-head record vs every opponent
  bt ladders             every ladder and cup on the arena

Flags:
  --json                 print the raw API response as JSON
  --limit <n>            rows to show (matches: default 10, cup: default 10)
  --vs <bot>             with opponents: show only the record vs that bot
  -h, --help             show this help
  -v, --version          show the version

Examples:
  bt bot aralie
  bt cup
  bt matches aralie --limit 5
  bt opponents aralie
  bt opponents aralie --vs tokrus
  bt ladders

Data: battle.training (CC BY 4.0) — https://battle.training
`;

function parseArgs(argv) {
  const positional = [];
  const opts = { json: false, limit: null, vs: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--vs') {
      const name = argv[++i];
      if (!name || name.startsWith('-')) throw new Error('--vs needs a bot handle');
      opts.vs = name;
    } else if (arg.startsWith('--vs=')) {
      const name = arg.slice('--vs='.length);
      if (!name) throw new Error('--vs needs a bot handle');
      opts.vs = name;
    } else if (arg === '--limit') {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n <= 0) throw new Error('--limit needs a positive integer');
      opts.limit = n;
    } else if (arg.startsWith('--limit=')) {
      const n = Number(arg.slice('--limit='.length));
      if (!Number.isInteger(n) || n <= 0) throw new Error('--limit needs a positive integer');
      opts.limit = n;
    } else if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '-v' || arg === '--version') {
      opts.version = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  return { positional, opts };
}

async function main() {
  const { positional, opts } = parseArgs(process.argv.slice(2));

  if (opts.version) {
    console.log(`bt ${VERSION}`);
    return;
  }
  if (opts.help || positional.length === 0) {
    console.log(USAGE);
    return;
  }

  const [cmd, ...rest] = positional;
  switch (cmd) {
    case 'bot': {
      if (!rest[0]) throw new Error('usage: bt bot <handle>');
      await cmdBot(rest[0], opts);
      break;
    }
    case 'cup': {
      await cmdCup(rest[0] || null, opts);
      break;
    }
    case 'matches': {
      if (!rest[0]) throw new Error('usage: bt matches <handle>');
      await cmdMatches(rest[0], opts);
      break;
    }
    case 'opponents': {
      if (!rest[0]) throw new Error('usage: bt opponents <handle>');
      await cmdOpponents(rest[0], opts);
      break;
    }
    case 'ladders': {
      await cmdLadders(opts);
      break;
    }
    case 'help': {
      console.log(USAGE);
      break;
    }
    default:
      throw new Error(`unknown command: ${cmd}\nRun "bt --help" for usage.`);
  }
}

main().catch((err) => {
  console.error(`bt: ${err.message}`);
  process.exit(1);
});
