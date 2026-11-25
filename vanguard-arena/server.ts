import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import {
  applyConnect4Move,
  applyRPSMove,
  applySakarHtarAnswer,
  applyTTTMove,
  advanceSakarHtarQuestion,
  createInitialGameState,
  getConnect4BotMove,
  getRPSBotMove,
  getTTTBotMove,
  revealSakarHtarQuestion,
  SAKAR_QUESTION_DURATION_MS,
  SAKAR_REVEAL_DURATION_MS,
  sanitizeRPSStateForPlayer,
  sanitizeSakarHtarStateForPlayer,
} from './src/games/engine.ts';
import { BUILT_IN_SAKAR_RIDDLES } from './src/games/sakarHtar/riddles.ts';
import { createBurmeseBotParticipant, pickBotDifficultyFromXp, pickBurmeseBotBatch } from './src/games/bots.ts';
import type {
  ActiveMatch,
  Announcement,
  BracketMatch,
  ChatMessage,
  CustomRoom,
  CustomRoomChatMessage,
  Difficulty,
  FeatureLocks,
  GameMode,
  GameType,
  LandingContent,
  MatchmakingSettings,
  MatchMoveLogEntry,
  MatchParticipant,
  OfficialWarning,
  OnlinePlayer,
  PlayerReport,
  ProfileFrame,
  ReportCategory,
  RPSChoice,
  SakarRiddle,
  Tournament,
  TurnTimeLimit,
  UserProfile,
} from './src/types.ts';

// ─── FIREBASE ADMIN INIT ──────────────────────────────────────────────────────
if (!getApps().length) {
  initializeApp({ projectId: firebaseConfig.projectId });
}
const adminAuth = getAdminAuth();

// ─── FILESYSTEM & SQLITE PERSISTENCE ──────────────────────────────────────────
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'arena.db'));
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    firebase_uid TEXT UNIQUE,
    game_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT NOT NULL,
    frame_id TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'user',
    is_banned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL,
    mode TEXT NOT NULL,
    player1_id TEXT NOT NULL,
    player2_id TEXT NOT NULL,
    player1_name TEXT NOT NULL,
    player2_name TEXT NOT NULL,
    winner_id TEXT,
    is_draw INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    finished_at TEXT
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL,
    addressee_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS direct_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS frames (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    unlock_tier TEXT NOT NULL DEFAULT 'All',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS feature_locks (
    key TEXT PRIMARY KEY,
    locked INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    game_type TEXT NOT NULL,
    max_players INTEGER NOT NULL,
    status TEXT NOT NULL,
    start_time TEXT NOT NULL,
    rounds_json TEXT NOT NULL,
    champion_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tournament_participants (
    tournament_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    PRIMARY KEY (tournament_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_user_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS landing_content (
    id TEXT PRIMARY KEY,
    content_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    game_type TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    reporter_name TEXT NOT NULL,
    reported_id TEXT NOT NULL,
    reported_name TEXT NOT NULL,
    category TEXT NOT NULL,
    notes TEXT NOT NULL,
    chat_transcript_json TEXT NOT NULL,
    move_history_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    action_taken TEXT,
    admin_notes TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    report_id TEXT,
    reason TEXT NOT NULL,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sakar_riddles (
    id TEXT PRIMARY KEY,
    question_my TEXT NOT NULL,
    hint_en TEXT NOT NULL DEFAULT '',
    options_json TEXT NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation_my TEXT NOT NULL DEFAULT '',
    explanation_en TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Safe additive migrations for existing SQLite databases
const userCols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
const userColNames = new Set(userCols.map((c) => c.name));
if (!userColNames.has('recovery_pin_hash')) {
  db.exec('ALTER TABLE users ADD COLUMN recovery_pin_hash TEXT;');
}
if (!userColNames.has('email')) {
  db.exec('ALTER TABLE users ADD COLUMN email TEXT;');
}
if (!userColNames.has('warning_count')) {
  db.exec('ALTER TABLE users ADD COLUMN warning_count INTEGER NOT NULL DEFAULT 0;');
}
if (!userColNames.has('suspended_until')) {
  db.exec('ALTER TABLE users ADD COLUMN suspended_until TEXT;');
}

const matchCols = db.prepare('PRAGMA table_info(matches)').all() as { name: string }[];
const matchColNames = new Set(matchCols.map((c) => c.name));
if (!matchColNames.has('move_history_json')) {
  db.exec('ALTER TABLE matches ADD COLUMN move_history_json TEXT;');
}
if (!matchColNames.has('chat_transcript_json')) {
  db.exec('ALTER TABLE matches ADD COLUMN chat_transcript_json TEXT;');
}

const tourCols = db.prepare('PRAGMA table_info(tournaments)').all() as { name: string }[];
const tourColNames = new Set(tourCols.map((c) => c.name));
if (!tourColNames.has('start_mode')) {
  db.exec("ALTER TABLE tournaments ADD COLUMN start_mode TEXT NOT NULL DEFAULT 'manual';");
}
if (!tourColNames.has('rounds_per_match')) {
  db.exec('ALTER TABLE tournaments ADD COLUMN rounds_per_match INTEGER NOT NULL DEFAULT 1;');
}
if (!tourColNames.has('turn_time_limit')) {
  db.exec('ALTER TABLE tournaments ADD COLUMN turn_time_limit INTEGER NOT NULL DEFAULT 20;');
}
if (!tourColNames.has('included_games_json')) {
  db.exec('ALTER TABLE tournaments ADD COLUMN included_games_json TEXT;');
}

// ─── CRYPTO & SANITIZATION HELPERS ────────────────────────────────────────────
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function sanitizeText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

function generateGameId(): string {
  for (let i = 0; i < 20; i++) {
    const code = `#PLY-${crypto.randomInt(10000, 99999)}`;
    const exists = db.prepare('SELECT id FROM users WHERE game_id = ?').get(code);
    if (!exists) return code;
  }
  return `#PLY-${Date.now().toString().slice(-5)}`;
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ─── SEED INITIAL SYSTEM DATA ─────────────────────────────────────────────────
const DEFAULT_AVATAR = '/src/assets/images/avatar_preset_champ_1794716179403.jpg';

function seedDatabase() {
  const now = new Date().toISOString();

  // Seed hidden isolated admin account (credentials verified server-side only)
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('yanlinnaung');
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, game_id, display_name, avatar_url, frame_id, xp, wins, losses, draws, role, is_banned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'admin', 0, ?)
    `).run(
      'admin_yanlinnaung',
      'yanlinnaung',
      hashPassword('163104'),
      '#ADM-00001',
      'System Administrator',
      DEFAULT_AVATAR,
      'frame_sovereign',
      now
    );
  }

  // Seed default feature locks
  const lockKeys = ['connect4', 'ttt', 'rps', 'sakar_htar', 'matchmaking', 'chat', 'tournaments'];
  const insertLock = db.prepare('INSERT OR IGNORE INTO feature_locks (key, locked, updated_at) VALUES (?, 0, ?)');
  for (const key of lockKeys) {
    insertLock.run(key, now);
  }

  // Seed Sakar-Htar riddle bank if empty
  const riddleCountRow = db.prepare('SELECT COUNT(*) as cnt FROM sakar_riddles').get() as { cnt: number };
  if (Number(riddleCountRow.cnt) === 0) {
    const insertRiddle = db.prepare(
      `INSERT OR IGNORE INTO sakar_riddles (id, question_my, hint_en, options_json, correct_index, explanation_my, explanation_en, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of BUILT_IN_SAKAR_RIDDLES) {
      insertRiddle.run(
        r.id,
        r.questionMy,
        r.hintEn || '',
        JSON.stringify(r.options),
        r.correctIndex,
        r.explanationMy || '',
        r.explanationEn || '',
        now
      );
    }
  }

  // Seed luxury SVG profile frames aligned to 512x512 safe-zone specification
  const defaultFrames: { id: string; name: string; description: string; unlockTier: string; svg: string }[] = [
    {
      id: 'frame_none',
      name: 'Clean Rim',
      description: 'Minimalist hairline ring without ornament.',
      unlockTier: 'All',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="256" r="192" fill="none" stroke="#94a3b8" stroke-width="6" stroke-opacity="0.45"/></svg>`,
    },
    {
      id: 'frame_gold',
      name: 'Obsidian Gold Crest',
      description: 'Brushed championship gold bezel with precision corner notches.',
      unlockTier: 'All',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fde68a"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/></linearGradient></defs><circle cx="256" cy="256" r="206" fill="none" stroke="url(#g1)" stroke-width="18"/><circle cx="256" cy="256" r="226" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="28 18" stroke-opacity="0.75"/><path d="M256 18 L272 44 L240 44 Z" fill="#fde68a"/><path d="M256 494 L272 468 L240 468 Z" fill="#fde68a"/></svg>`,
    },
    {
      id: 'frame_sapphire',
      name: 'Sapphire Telemetry Ring',
      description: 'Precision titanium ring with electric ice-blue segments.',
      unlockTier: 'Silver',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="256" r="204" fill="none" stroke="#0f172a" stroke-width="24"/><circle cx="256" cy="256" r="204" fill="none" stroke="#38bdf8" stroke-width="10" stroke-dasharray="90 36"/><circle cx="256" cy="256" r="224" fill="none" stroke="#bae6fd" stroke-width="3" stroke-opacity="0.65"/></svg>`,
    },
    {
      id: 'frame_platinum',
      name: 'Platinum Vanguard Halo',
      description: 'Multi-layered brushed steel and teal competitive bezel.',
      unlockTier: 'Gold',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="256" r="208" fill="none" stroke="#e2e8f0" stroke-width="14"/><circle cx="256" cy="256" r="226" fill="none" stroke="#2dd4bf" stroke-width="6" stroke-dasharray="48 24"/><polygon points="256,12 268,36 244,36" fill="#5eead4"/><polygon points="500,256 476,268 476,244" fill="#5eead4"/><polygon points="12,256 36,268 36,244" fill="#5eead4"/></svg>`,
    },
    {
      id: 'frame_sovereign',
      name: 'Grandmaster Sovereign',
      description: 'Dual-alloy obsidian and molten amber crown frame.',
      unlockTier: 'Diamond',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="256" r="208" fill="none" stroke="#f59e0b" stroke-width="20"/><circle cx="256" cy="256" r="228" fill="none" stroke="#38bdf8" stroke-width="5"/><path d="M210 38 L234 14 L256 34 L278 14 L302 38 L286 58 L226 58 Z" fill="#fcd34d"/></svg>`,
    },
  ];

  const insertFrame = db.prepare(
    'INSERT OR IGNORE INTO frames (id, name, description, image_url, unlock_tier, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  );
  for (const f of defaultFrames) {
    insertFrame.run(f.id, f.name, f.description, svgDataUrl(f.svg), f.unlockTier, now);
  }

  db.prepare('INSERT OR IGNORE INTO landing_content (id, content_json, updated_at) VALUES (?, ?, ?)').run(
    'default',
    JSON.stringify(DEFAULT_LANDING_CONTENT),
    now
  );

  db.prepare('INSERT OR IGNORE INTO app_settings (key, value_json, updated_at) VALUES (?, ?, ?)').run(
    'matchmaking',
    JSON.stringify({
      maxSearchSeconds: 25,
      botFillDelaySeconds: 8,
      autoBotFillDefault: true,
    }),
    now
  );
}

const DEFAULT_LANDING_CONTENT: LandingContent = {
  heroTitleEn: 'Competitive Tabletop Strategy & Cultural Riddles',
  heroTitleMy: 'မြန်နှုန်းမြင့် အွန်လိုင်းဗျူဟာဂိမ်းနှင့် မြန်မာ့စကားထာ ပြိုင်ပွဲကွင်း',
  heroSubtitleEn:
    'Challenge global rivals in real-time 4 in a Row, Tic-Tac-Toe, Rock, Paper, Scissors, and Sakar-Htar (Myanmar Traditional Riddles). Climb from Bronze to Mythic and battle in custom rooms or knockout brackets.',
  heroSubtitleMy:
    '4 in a Row၊ Tic-Tac-Toe၊ ကျောက်တုံး စက္ကူ ကတ်ကြေး နှင့် မြန်မာ့ရိုးရာ စကားထာဂိမ်းများကို တိုက်ရိုက်ယှဉ်ပြိုင်ပါ။ Bronze မှ Mythic အဆင့်အထိ တက်လှမ်းပြီး Custom Room နှင့် ရှုံးထွက်ပြိုင်ပွဲကြီးများတွင် ပါဝင်ဆင်နွှဲလိုက်ပါ။',
  heroBannerUrl: '/src/assets/images/hero_arena_stage_1794716179112.jpg',
  games: {
    connect4: {
      nameEn: '4 in a Row',
      nameMy: '၄ လုံးတန်း (4 in a Row)',
      taglineEn: 'Vertical gravity tactics on a precision 6x7 grid.',
      taglineMy: '၆x၇ ဇယားကွက်ပေါ်တွင် ဗျူဟာမြောက် ၄ လုံးတန်းအောင် ချကစားရသော ဂိမ်း။',
      bannerUrl: '/src/assets/images/game_connect4_art_1794716178929.jpg',
    },
    ttt: {
      nameEn: 'Tic-Tac-Toe',
      nameMy: 'Tic-Tac-Toe (X / O)',
      taglineEn: 'Rapid 3x3 positional duels with zero room for error.',
      taglineMy: '၃x၃ အကွက်ပေါ်တွင် လျင်မြန်တိကျစွာ နေရာယူယှဉ်ပြိုင်ရသော ဂိမ်း။',
      bannerUrl: '/src/assets/images/game_ttt_art_1794716179615.jpg',
    },
    rps: {
      nameEn: 'Rock, Paper, Scissors',
      nameMy: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး',
      taglineEn: 'Psychological Best-of-3 and Best-of-5 simultaneous showdowns.',
      taglineMy: '၃ ပွဲ ၂ နိုင် / ၅ ပွဲ ၃ နိုင် စိတ်ပညာပြိုင်ဆိုင်မှု တိုက်ရိုက်ပွဲစဉ်။',
      bannerUrl: '/src/assets/images/game_rps_art_1794716179553.jpg',
    },
    sakar_htar: {
      nameEn: 'Sakar-Htar (Myanmar Riddles)',
      nameMy: 'စကားထာ (မြန်မာ့ရိုးရာ စကားထာဂိမ်း)',
      taglineEn: '10-question cultural riddle duel hosted by the Wise Courtyard Owl for 1–8 players.',
      taglineMy: 'ချစ်စရာ ဇီးကွက်ပညာရှိက မေးခွန်း ၁၀ ခု မေးမြန်းမည့် ၁-၈ ဦး စကားထာပြိုင်ပွဲ။',
      bannerUrl: '/src/assets/images/game_sakar_htar_art_1794723795339.jpg',
    },
  },
  updatedAt: new Date().toISOString(),
};

function getLandingContent(): LandingContent {
  try {
    const row = db.prepare("SELECT content_json, updated_at FROM landing_content WHERE id = 'default'").get() as
      | { content_json: string; updated_at: string }
      | undefined;
    if (!row) return DEFAULT_LANDING_CONTENT;
    const parsed = JSON.parse(row.content_json) as Partial<LandingContent>;
    return {
      heroTitleEn: parsed.heroTitleEn || DEFAULT_LANDING_CONTENT.heroTitleEn,
      heroTitleMy: parsed.heroTitleMy || DEFAULT_LANDING_CONTENT.heroTitleMy,
      heroSubtitleEn: parsed.heroSubtitleEn || DEFAULT_LANDING_CONTENT.heroSubtitleEn,
      heroSubtitleMy: parsed.heroSubtitleMy || DEFAULT_LANDING_CONTENT.heroSubtitleMy,
      heroBannerUrl: parsed.heroBannerUrl || DEFAULT_LANDING_CONTENT.heroBannerUrl,
      games: {
        connect4: { ...DEFAULT_LANDING_CONTENT.games.connect4, ...(parsed.games?.connect4 || {}) },
        ttt: { ...DEFAULT_LANDING_CONTENT.games.ttt, ...(parsed.games?.ttt || {}) },
        rps: { ...DEFAULT_LANDING_CONTENT.games.rps, ...(parsed.games?.rps || {}) },
        sakar_htar: { ...DEFAULT_LANDING_CONTENT.games.sakar_htar, ...(parsed.games?.sakar_htar || {}) },
      },
      updatedAt: row.updated_at || DEFAULT_LANDING_CONTENT.updatedAt,
    };
  } catch {
    return DEFAULT_LANDING_CONTENT;
  }
}

seedDatabase();

// ─── DB MAPPER HELPERS ────────────────────────────────────────────────────────
function rowToUser(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    username: String(row.username),
    gameId: String(row.game_id),
    displayName: String(row.display_name),
    avatarUrl: String(row.avatar_url),
    frameId: String(row.frame_id),
    xp: Number(row.xp),
    wins: Number(row.wins),
    losses: Number(row.losses),
    draws: Number(row.draws),
    role: row.role === 'admin' ? 'admin' : 'user',
    isBanned: Number(row.is_banned) === 1,
    warningCount: Number(row.warning_count || 0),
    suspendedUntil: row.suspended_until ? String(row.suspended_until) : null,
    createdAt: String(row.created_at),
  };
}

function isUserSuspended(user: UserProfile | null | undefined): boolean {
  if (!user || !user.suspendedUntil) return false;
  const ts = Date.parse(user.suspendedUntil);
  return Number.isFinite(ts) && ts > Date.now();
}

function getPendingWarningsForUser(userId: string): OfficialWarning[] {
  const rows = db
    .prepare('SELECT * FROM warnings WHERE user_id = ? AND acknowledged = 0 ORDER BY created_at DESC')
    .all(userId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    reportId: r.report_id ? String(r.report_id) : null,
    reason: String(r.reason),
    acknowledged: Number(r.acknowledged) === 1,
    createdAt: String(r.created_at),
  }));
}

function getReportsList(): PlayerReport[] {
  const rows = db.prepare('SELECT * FROM reports ORDER BY CASE WHEN status = \'pending\' THEN 0 ELSE 1 END, created_at DESC LIMIT 100').all() as Record<string, unknown>[];
  return rows.map((r) => {
    let chatTranscript: ChatMessage[] = [];
    let moveHistory: MatchMoveLogEntry[] = [];
    try {
      chatTranscript = JSON.parse(String(r.chat_transcript_json || '[]'));
    } catch {
      chatTranscript = [];
    }
    try {
      moveHistory = JSON.parse(String(r.move_history_json || '[]'));
    } catch {
      moveHistory = [];
    }
    return {
      id: String(r.id),
      matchId: String(r.match_id),
      gameType: String(r.game_type) as GameType,
      reporterId: String(r.reporter_id),
      reporterName: String(r.reporter_name),
      reportedId: String(r.reported_id),
      reportedName: String(r.reported_name),
      category: String(r.category) as ReportCategory,
      notes: String(r.notes),
      chatTranscript,
      moveHistory,
      status: r.status === 'resolved' ? 'resolved' : 'pending',
      actionTaken: r.action_taken ? String(r.action_taken) : null,
      adminNotes: r.admin_notes ? String(r.admin_notes) : null,
      createdAt: String(r.created_at),
      resolvedAt: r.resolved_at ? String(r.resolved_at) : null,
    };
  });
}

function getUserById(userId: string): UserProfile | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : null;
}

function toParticipant(user: UserProfile, pingMs?: number): MatchParticipant {
  return {
    id: user.id,
    gameId: user.gameId,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    frameId: user.frameId,
    xp: user.xp,
    pingMs,
  };
}

function getRiddlePool(): SakarRiddle[] {
  const rows = db.prepare('SELECT * FROM sakar_riddles ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const mapped: SakarRiddle[] = [];
  for (const r of rows) {
    try {
      const opts = JSON.parse(String(r.options_json || '[]'));
      if (!Array.isArray(opts) || opts.length !== 4) continue;
      const ci = Number(r.correct_index);
      const correctIndex: 0 | 1 | 2 | 3 = ci === 1 || ci === 2 || ci === 3 ? ci : 0;
      mapped.push({
        id: String(r.id),
        questionMy: String(r.question_my),
        hintEn: String(r.hint_en || ''),
        options: [String(opts[0]), String(opts[1]), String(opts[2]), String(opts[3])],
        correctIndex,
        explanationMy: String(r.explanation_my || ''),
        explanationEn: String(r.explanation_en || ''),
      });
    } catch {
      // skip malformed row
    }
  }
  return mapped.length > 0 ? mapped : BUILT_IN_SAKAR_RIDDLES;
}

function getFeatureLocks(): FeatureLocks {
  const rows = db.prepare('SELECT key, locked FROM feature_locks').all() as { key: string; locked: number }[];
  const locks: FeatureLocks = {
    connect4: false,
    ttt: false,
    rps: false,
    sakar_htar: false,
    matchmaking: false,
    chat: false,
    tournaments: false,
  };
  for (const r of rows) {
    if (r.key in locks) {
      locks[r.key as keyof FeatureLocks] = r.locked === 1;
    }
  }
  return locks;
}

const DEFAULT_MATCHMAKING_SETTINGS: MatchmakingSettings = {
  maxSearchSeconds: 25,
  botFillDelaySeconds: 8,
  autoBotFillDefault: true,
};

function getMatchmakingSettings(): MatchmakingSettings {
  try {
    const row = db.prepare("SELECT value_json FROM app_settings WHERE key = 'matchmaking'").get() as
      | { value_json: string }
      | undefined;
    if (!row) return DEFAULT_MATCHMAKING_SETTINGS;
    const parsed = JSON.parse(row.value_json) as Partial<MatchmakingSettings>;
    const maxSearchSeconds = Math.max(10, Math.min(90, Math.round(Number(parsed.maxSearchSeconds ?? 25))));
    const botFillDelaySeconds = Math.max(
      3,
      Math.min(maxSearchSeconds - 2, Math.round(Number(parsed.botFillDelaySeconds ?? 8)))
    );
    const autoBotFillDefault =
      parsed.autoBotFillDefault === undefined ? true : Boolean(parsed.autoBotFillDefault);
    return { maxSearchSeconds, botFillDelaySeconds, autoBotFillDefault };
  } catch {
    return DEFAULT_MATCHMAKING_SETTINGS;
  }
}

function saveMatchmakingSettings(input: Partial<MatchmakingSettings>): MatchmakingSettings {
  const current = getMatchmakingSettings();
  const rawMax = Number(input.maxSearchSeconds ?? current.maxSearchSeconds);
  const maxSearchSeconds = Math.max(10, Math.min(90, Number.isFinite(rawMax) ? Math.round(rawMax) : 25));
  const rawDelay = Number(input.botFillDelaySeconds ?? current.botFillDelaySeconds);
  const botFillDelaySeconds = Math.max(
    3,
    Math.min(maxSearchSeconds - 2, Number.isFinite(rawDelay) ? Math.round(rawDelay) : 8)
  );
  const autoBotFillDefault =
    input.autoBotFillDefault === undefined ? current.autoBotFillDefault : Boolean(input.autoBotFillDefault);

  const next: MatchmakingSettings = {
    maxSearchSeconds,
    botFillDelaySeconds,
    autoBotFillDefault,
  };
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value_json, updated_at) VALUES (?, ?, ?)').run(
    'matchmaking',
    JSON.stringify(next),
    new Date().toISOString()
  );
  return next;
}

function getFrames(onlyActive = false): ProfileFrame[] {
  const sql = onlyActive ? 'SELECT * FROM frames WHERE is_active = 1 ORDER BY created_at ASC' : 'SELECT * FROM frames ORDER BY created_at ASC';
  const rows = db.prepare(sql).all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    description: String(r.description),
    imageUrl: String(r.image_url),
    unlockTier: String(r.unlock_tier) as ProfileFrame['unlockTier'],
    isActive: Number(r.is_active) === 1,
    createdAt: String(r.created_at),
  }));
}

function getLeaderboard(limit = 50): UserProfile[] {
  const rows = db
    .prepare("SELECT * FROM users WHERE role = 'user' AND is_banned = 0 ORDER BY xp DESC, wins DESC LIMIT ?")
    .all(limit) as Record<string, unknown>[];
  return rows.map(rowToUser);
}

function getTournaments(): Tournament[] {
  const rows = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map((r) => {
    const tId = String(r.id);
    const partRows = db
      .prepare(
        `SELECT u.* FROM tournament_participants tp
         JOIN users u ON u.id = tp.user_id
         WHERE tp.tournament_id = ?
         ORDER BY tp.joined_at ASC`
      )
      .all(tId) as Record<string, unknown>[];
    const participants = partRows.map((u) => toParticipant(rowToUser(u)));
    let rounds: BracketMatch[][] = [];
    try {
      rounds = JSON.parse(String(r.rounds_json || '[]'));
    } catch {
      rounds = [];
    }
    const primaryGame = String(r.game_type) as GameType;
    let includedGames: GameType[] = [primaryGame];
    try {
      const parsed = JSON.parse(String(r.included_games_json || '[]'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        includedGames = parsed.filter(
          (g): g is GameType => g === 'connect4' || g === 'ttt' || g === 'rps' || g === 'sakar_htar'
        );
      }
    } catch {
      includedGames = [primaryGame];
    }
    if (includedGames.length === 0) includedGames = [primaryGame];

    const rpm = Number(r.rounds_per_match || 1);
    const roundsPerMatch: 1 | 3 | 5 = rpm === 3 || rpm === 5 ? rpm : 1;
    const ttl = Number(r.turn_time_limit || 20);
    const turnTimeLimit: TurnTimeLimit = ttl === 10 || ttl === 15 || ttl === 30 ? ttl : 20;

    return {
      id: tId,
      title: String(r.title),
      gameType: primaryGame,
      includedGames,
      maxPlayers: Number(r.max_players) as Tournament['maxPlayers'],
      roundsPerMatch,
      turnTimeLimit,
      startMode: r.start_mode === 'auto' ? 'auto' : 'manual',
      status: String(r.status) as Tournament['status'],
      startTime: String(r.start_time),
      participants,
      rounds,
      championId: r.champion_id ? String(r.champion_id) : null,
      createdAt: String(r.created_at),
    };
  });
}

// ─── REAL-TIME STATE & WEBSOCKET MANAGEMENT ───────────────────────────────────
interface SocketClient {
  ws: WebSocket;
  userId: string;
  role: 'user' | 'admin';
  inPlayLobby: boolean;
  token: string;
  pingMs: number;
  lastPingSent: number;
  deviceId: string;
}

const clientsBySocket = new Map<WebSocket, SocketClient>();
const socketsByUser = new Map<string, Set<SocketClient>>();
const activeMatches = new Map<string, ActiveMatch>();
const activeMatchChats = new Map<string, ChatMessage[]>();
const userActiveMatch = new Map<string, string>(); // userId -> matchId
const graceTimers = new Map<string, ReturnType<typeof setTimeout>>(); // `${matchId}:${userId}`
const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();
const botTurnTimers = new Map<string, ReturnType<typeof setTimeout>>();
const sakarBotTimers = new Map<string, ReturnType<typeof setTimeout>[]>();
const pendingRpsBotRounds = new Set<string>();
const GRACE_TIMEOUT_MS = 30_000;
interface QueuedEntry {
  userId: string;
  xp: number;
  turnTimeLimit?: TurnTimeLimit;
  autoBotFill: boolean;
  joinedAt: number;
}
const matchmakingQueues: Record<GameType, QueuedEntry[]> = {
  connect4: [],
  tictactoe: [],
  ttt: [],
  rps: [],
  sakarhtar: [],
  sakar_htar: [],
};
const sakarQuickQueue: QueuedEntry[] = [];
const customRooms = new Map<string, CustomRoom>();
const customRoomChats = new Map<string, CustomRoomChatMessage[]>();
const pendingChallenges = new Map<
  string,
  { id: string; fromId: string; toId: string; gameType: GameType; bestOf: 1 | 3 | 5; turnTimeLimit: TurnTimeLimit; createdAt: number }
>();

function sendToSocket(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sendToUser(userId: string, payload: unknown) {
  const set = socketsByUser.get(userId);
  if (!set) return;
  for (const client of set) {
    sendToSocket(client.ws, payload);
  }
}

function broadcastAll(payload: unknown, excludeUserId?: string) {
  for (const client of clientsBySocket.values()) {
    if (excludeUserId && client.userId === excludeUserId) continue;
    sendToSocket(client.ws, payload);
  }
}

function getUserPingMs(userId: string): number {
  const set = socketsByUser.get(userId);
  if (!set || set.size === 0) return 0;
  let min = Infinity;
  for (const c of set) {
    if (c.pingMs < min) min = c.pingMs;
  }
  return Number.isFinite(min) ? min : 24;
}

function getOnlinePlayersList(): OnlinePlayer[] {
  const list: OnlinePlayer[] = [];
  for (const [userId, set] of socketsByUser.entries()) {
    if (set.size === 0) continue;
    const user = getUserById(userId);
    if (!user || user.isBanned) continue;
    if (user.role === 'admin') {
      const inLobby = Array.from(set).some((c) => c.inPlayLobby);
      if (!inLobby) continue;
    }
    const inMatch = userActiveMatch.has(userId);
    const inQueue =
      Object.values(matchmakingQueues).some((q) => q.some((item) => item.userId === userId)) ||
      sakarQuickQueue.some((item) => item.userId === userId);
    list.push({
      id: user.id,
      gameId: user.gameId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      frameId: user.frameId,
      xp: user.xp,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      status: inMatch ? 'in_game' : inQueue ? 'queue' : 'online',
      pingMs: getUserPingMs(userId),
      deviceCount: set.size,
    });
  }
  return list;
}

let presenceDirty = false;
function schedulePresenceBroadcast() {
  presenceDirty = true;
}

setInterval(() => {
  if (!presenceDirty) return;
  presenceDirty = false;
  const players = getOnlinePlayersList();
  broadcastAll({
    type: 'presence:update',
    onlinePlayers: players,
    onlineCount: players.length,
    activeDevices: clientsBySocket.size,
  });
}, 800);

// ─── MATCH LIFECYCLE & SERVER-AUTHORITATIVE ENGINE ────────────────────────────
function getTurnTimeoutMs(gameType: GameType, customLimit?: TurnTimeLimit): number {
  if (customLimit === 10 || customLimit === 15 || customLimit === 20 || customLimit === 30) {
    return customLimit * 1000;
  }
  if (gameType === 'ttt') return 15_000;
  if (gameType === 'connect4') return 20_000;
  return 20_000;
}

function serializeMatchForViewer(match: ActiveMatch, viewerId: string): ActiveMatch {
  const viewerNum: 1 | 2 | 0 = match.player1.id === viewerId ? 1 : match.player2.id === viewerId ? 2 : 0;
  const state =
    match.state.gameType === 'rps'
      ? sanitizeRPSStateForPlayer(match.state, viewerNum)
      : match.state.gameType === 'sakar_htar'
      ? sanitizeSakarHtarStateForPlayer(match.state, viewerId)
      : match.state;
  return {
    ...match,
    player1: { ...match.player1, pingMs: match.player1.isBot ? 1 : getUserPingMs(match.player1.id) },
    player2: { ...match.player2, pingMs: match.player2.isBot ? 1 : getUserPingMs(match.player2.id) },
    participants: match.participants?.map((p) => ({
      ...p,
      pingMs: p.isBot ? 1 : getUserPingMs(p.id),
    })),
    state,
  };
}

function getHumanMatchParticipantIds(match: ActiveMatch): string[] {
  const ids = new Set<string>();
  if (!match.player1.isBot) ids.add(match.player1.id);
  if (!match.player2.isBot && match.player2.id !== match.player1.id) ids.add(match.player2.id);
  if (match.participants) {
    for (const p of match.participants) {
      if (!p.isBot) ids.add(p.id);
    }
  }
  return Array.from(ids);
}

function emitMatchState(match: ActiveMatch) {
  for (const uid of getHumanMatchParticipantIds(match)) {
    sendToUser(uid, { type: 'match:state', match: serializeMatchForViewer(match, uid) });
  }
}

function getOpenCustomRoomsList(): CustomRoom[] {
  return Array.from(customRooms.values())
    .filter((r) => r.status === 'waiting')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function broadcastOpenRooms() {
  broadcastAll({ type: 'rooms:update', openRooms: getOpenCustomRoomsList() });
}

function emitRoomState(room: CustomRoom) {
  for (const p of room.participants) {
    sendToUser(p.id, {
      type: 'room:state',
      room,
      chat: customRoomChats.get(room.id) || [],
    });
  }
}

function removeUserFromCustomRooms(userId: string) {
  let changedOpen = false;
  for (const [roomId, room] of customRooms.entries()) {
    if (room.status !== 'waiting') continue;
    const idx = room.participants.findIndex((p) => p.id === userId);
    if (idx === -1) continue;
    room.participants.splice(idx, 1);
    changedOpen = true;
    sendToUser(userId, { type: 'room:state', room: null, chat: [] });
    if (room.participants.length === 0) {
      customRooms.delete(roomId);
      customRoomChats.delete(roomId);
    } else {
      if (room.hostId === userId) {
        room.hostId = room.participants[0].id;
      }
      emitRoomState(room);
    }
  }
  if (changedOpen) broadcastOpenRooms();
}

function clearMatchTimers(matchId: string) {
  const t = turnTimers.get(matchId);
  if (t) {
    clearTimeout(t);
    turnTimers.delete(matchId);
  }
  const bt = botTurnTimers.get(matchId);
  if (bt) {
    clearTimeout(bt);
    botTurnTimers.delete(matchId);
  }
  const sTimers = sakarBotTimers.get(matchId);
  if (sTimers) {
    for (const st of sTimers) clearTimeout(st);
    sakarBotTimers.delete(matchId);
  }
  for (const key of Array.from(pendingRpsBotRounds)) {
    if (key.startsWith(`${matchId}:`)) pendingRpsBotRounds.delete(key);
  }
  for (const [k, timer] of graceTimers.entries()) {
    if (k.startsWith(`${matchId}:`)) {
      clearTimeout(timer);
      graceTimers.delete(k);
    }
  }
}

function appendMoveLog(match: ActiveMatch, playerId: string, playerName: string, summary: string) {
  if (!match.moveLog) match.moveLog = [];
  match.moveLog.push({
    step: match.moveLog.length + 1,
    playerId,
    playerName,
    summary,
    timestamp: new Date().toISOString(),
  });
}

function advanceTournamentBracket(tournamentId: string, bracketMatchId: string, winnerId: string) {
  const row = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as Record<string, unknown> | undefined;
  if (!row) return;
  const rounds: BracketMatch[][] = JSON.parse(String(row.rounds_json || '[]'));
  const winnerUser = getUserById(winnerId);
  if (!winnerUser) return;
  const winnerPart = toParticipant(winnerUser);

  let foundRound = -1;
  let foundIdx = -1;
  let completedSeriesWinner = false;

  for (let r = 0; r < rounds.length; r++) {
    for (let m = 0; m < rounds[r].length; m++) {
      const bm = rounds[r][m];
      if (bm.id === bracketMatchId) {
        if (bm.player1?.id === winnerId) bm.p1Score = Number(bm.p1Score || 0) + 1;
        else if (bm.player2?.id === winnerId) bm.p2Score = Number(bm.p2Score || 0) + 1;

        const needed = Math.ceil((bm.bestOf || 1) / 2);
        const p1WonSeries = (bm.p1Score || 0) >= needed && bm.player1?.id === winnerId;
        const p2WonSeries = (bm.p2Score || 0) >= needed && bm.player2?.id === winnerId;

        if (p1WonSeries || p2WonSeries || bm.bestOf === 1) {
          bm.winnerId = winnerId;
          bm.status = 'completed';
          completedSeriesWinner = true;
          foundRound = r;
          foundIdx = m;
        } else {
          // Best-of-3/5 series continues: reset match slot to ready for next game
          bm.status = 'ready';
          bm.liveMatchId = null;
        }
      }
    }
  }

  let championId: string | null = row.champion_id ? String(row.champion_id) : null;
  let status = String(row.status);

  if (completedSeriesWinner && foundRound !== -1) {
    if (foundRound + 1 < rounds.length) {
      const nextMatchIdx = Math.floor(foundIdx / 2);
      const nextMatch = rounds[foundRound + 1][nextMatchIdx];
      if (foundIdx % 2 === 0) {
        nextMatch.player1 = winnerPart;
      } else {
        nextMatch.player2 = winnerPart;
      }
      if (nextMatch.player1 && nextMatch.player2) {
        nextMatch.status = 'ready';
      }
    } else {
      championId = winnerId;
      status = 'completed';
    }
  }

  db.prepare('UPDATE tournaments SET rounds_json = ?, champion_id = ?, status = ? WHERE id = ?').run(
    JSON.stringify(rounds),
    championId,
    status,
    tournamentId
  );

  broadcastAll({ type: 'tournaments:update', tournaments: getTournaments() });
}

function finalizeMatch(match: ActiveMatch, winnerId: string | null, isDraw: boolean) {
  if (match.status === 'finished') return;
  match.status = 'finished';
  match.winnerId = winnerId;
  match.isDraw = isDraw;
  match.disconnectedPlayerId = null;
  match.graceDeadline = null;
  clearMatchTimers(match.id);

  const participantIds = getHumanMatchParticipantIds(match);
  for (const uid of participantIds) {
    userActiveMatch.delete(uid);
  }

  // Release custom room if this match originated from one
  if (match.roomId) {
    const room = customRooms.get(match.roomId);
    if (room) {
      room.status = 'waiting';
      room.activeMatchId = null;
      emitRoomState(room);
      broadcastOpenRooms();
    }
  }

  // Update player stats in DB (clamp RP at minimum 0)
  const updateStat = (userId: string, rpDelta: number, win: boolean, loss: boolean, draw: boolean) => {
    db.prepare(
      'UPDATE users SET xp = MAX(0, xp + ?), wins = wins + ?, losses = losses + ?, draws = draws + ? WHERE id = ?'
    ).run(rpDelta, win ? 1 : 0, loss ? 1 : 0, draw ? 1 : 0, userId);
  };

  if (match.gameType === 'sakar_htar' && match.state.gameType === 'sakar_htar') {
    const byUser: Record<string, number> = {};
    const sorted = [...match.state.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.correctCount - a.correctCount;
    });
    const isSolo = sorted.length <= 1;

    if (isSolo && sorted[0]) {
      const p = sorted[0];
      const rp = Math.max(15, Math.round(p.correctCount * 6));
      byUser[p.id] = rp;
      if (!p.id.startsWith('bot_')) {
        updateStat(p.id, rp, p.correctCount >= 5, p.correctCount < 5, false);
      }
      match.xpAwarded = { p1: rp, p2: 0, byUser };
    } else {
      for (const p of sorted) {
        if (p.id.startsWith('bot_')) continue;
        if (isDraw) {
          byUser[p.id] = 25;
          updateStat(p.id, 25, false, false, true);
        } else if (p.id === winnerId) {
          byUser[p.id] = 75;
          updateStat(p.id, 75, true, false, false);
        } else {
          const rp = p.correctCount >= 5 ? 10 : -20;
          byUser[p.id] = rp;
          updateStat(p.id, rp, false, true, false);
        }
      }
      match.xpAwarded = {
        p1: byUser[match.player1.id] ?? 0,
        p2: byUser[match.player2.id] ?? 0,
        byUser,
      };
    }
  } else {
    // 2-Player Ranked & Bot RP Rules (+75 win / -20 loss / +25 draw / +35 bot win / +10 bot loss)
    const isVsBot = match.mode === 'bot' || Boolean(match.player2?.isBot);
    let p1Xp = 0;
    let p2Xp = 0;
    if (isDraw) {
      p1Xp = 25;
      p2Xp = 25;
    } else if (winnerId === match.player1.id) {
      p1Xp = isVsBot ? 35 : 75;
      p2Xp = isVsBot ? 10 : -20;
    } else if (winnerId === match.player2.id) {
      p1Xp = isVsBot ? 10 : -20;
      p2Xp = isVsBot ? 35 : 75;
    }
    match.xpAwarded = {
      p1: p1Xp,
      p2: p2Xp,
      byUser: { [match.player1.id]: p1Xp, [match.player2.id]: p2Xp },
    };

    if (!match.player1.isBot) {
      updateStat(
        match.player1.id,
        p1Xp,
        !isDraw && winnerId === match.player1.id,
        !isDraw && winnerId === match.player2.id,
        isDraw
      );
    }
    if (!match.player2.isBot) {
      updateStat(
        match.player2.id,
        p2Xp,
        !isDraw && winnerId === match.player2.id,
        !isDraw && winnerId === match.player1.id,
        isDraw
      );
    }
  }

  const finishedAt = new Date().toISOString();
  const chatTranscriptJson = JSON.stringify(activeMatchChats.get(match.id) || []);
  const moveHistoryJson = JSON.stringify(match.moveLog || []);

  db.prepare(
    'UPDATE matches SET winner_id = ?, is_draw = ?, status = ?, finished_at = ?, chat_transcript_json = ?, move_history_json = ? WHERE id = ?'
  ).run(winnerId, isDraw ? 1 : 0, 'finished', finishedAt, chatTranscriptJson, moveHistoryJson, match.id);

  if (match.tournamentId && match.bracketMatchId && winnerId) {
    advanceTournamentBracket(match.tournamentId, match.bracketMatchId, winnerId);
  }

  emitMatchState(match);

  // Push updated user profiles + leaderboard
  for (const uid of participantIds) {
    const u = getUserById(uid);
    if (u) sendToUser(u.id, { type: 'user:update', user: u });
  }

  broadcastAll({ type: 'leaderboard:update', leaderboard: getLeaderboard() });
  schedulePresenceBroadcast();

  setTimeout(() => {
    activeMatches.delete(match.id);
    activeMatchChats.delete(match.id);
  }, 120_000);
}

function scheduleSakarBotAnswers(match: ActiveMatch) {
  const existing = sakarBotTimers.get(match.id);
  if (existing) {
    for (const st of existing) clearTimeout(st);
    sakarBotTimers.delete(match.id);
  }
  if (match.status !== 'active' || match.state.gameType !== 'sakar_htar' || match.state.phase !== 'question') return;
  const botParticipants = (match.participants || []).filter((p) => p.isBot);
  if (botParticipants.length === 0) return;

  const qIdx = match.state.questionIndex;
  const currentQ = match.state.questions[qIdx];
  if (!currentQ || currentQ.correctIndex === undefined) return;
  const correctIndex = currentQ.correctIndex;

  const timers: ReturnType<typeof setTimeout>[] = [];
  for (const bot of botParticipants) {
    const delayMs = 2100 + Math.floor(Math.random() * 6800);
    const accuracy = bot.xp >= 2400 ? 0.82 : bot.xp >= 1200 ? 0.7 : 0.56;
    const timer = setTimeout(() => {
      const cur = activeMatches.get(match.id);
      if (
        !cur ||
        cur.status !== 'active' ||
        cur.state.gameType !== 'sakar_htar' ||
        cur.state.phase !== 'question' ||
        cur.state.questionIndex !== qIdx
      ) {
        return;
      }
      let chosenIdx: number = correctIndex;
      if (Math.random() > accuracy) {
        const wrongOptions = [0, 1, 2, 3].filter((o) => o !== correctIndex);
        chosenIdx = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
      }
      const res = applySakarHtarAnswer(cur.state, bot.id, chosenIdx);
      if (!res.ok) return;
      cur.state = res.next;
      appendMoveLog(
        cur,
        bot.id,
        bot.displayName,
        `Q${cur.state.questionIndex + 1} option #${chosenIdx + 1} (${res.isCorrect ? `+${res.points} pts` : 'wrong'})`
      );
      if (res.allAnswered) {
        cur.state = revealSakarHtarQuestion(cur.state);
        scheduleSakarTimers(cur);
      }
      emitMatchState(cur);
    }, delayMs);
    timers.push(timer);
  }
  sakarBotTimers.set(match.id, timers);
}

function scheduleSakarTimers(match: ActiveMatch) {
  const existing = turnTimers.get(match.id);
  if (existing) clearTimeout(existing);
  if (match.status !== 'active' || match.state.gameType !== 'sakar_htar') return;

  if (match.state.phase === 'question') {
    const delay = Math.max(250, match.state.questionDeadline - Date.now());
    match.turnDeadline = match.state.questionDeadline;
    const timer = setTimeout(() => {
      const cur = activeMatches.get(match.id);
      if (!cur || cur.status !== 'active' || cur.state.gameType !== 'sakar_htar') return;
      if (cur.state.phase !== 'question') return;
      cur.state = revealSakarHtarQuestion(cur.state);
      emitMatchState(cur);
      scheduleSakarTimers(cur);
    }, delay);
    turnTimers.set(match.id, timer);
    scheduleSakarBotAnswers(match);
  } else if (match.state.phase === 'reveal') {
    const existingBotTimers = sakarBotTimers.get(match.id);
    if (existingBotTimers) {
      for (const st of existingBotTimers) clearTimeout(st);
      sakarBotTimers.delete(match.id);
    }
    const revealDeadline = match.state.revealDeadline || Date.now() + SAKAR_REVEAL_DURATION_MS;
    const delay = Math.max(250, revealDeadline - Date.now());
    match.turnDeadline = revealDeadline;
    const timer = setTimeout(() => {
      const cur = activeMatches.get(match.id);
      if (!cur || cur.status !== 'active' || cur.state.gameType !== 'sakar_htar') return;
      if (cur.state.phase !== 'reveal') return;
      cur.state = advanceSakarHtarQuestion(cur.state);
      if (cur.state.phase === 'finished') {
        const sorted = [...cur.state.players].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.correctCount - a.correctCount;
        });
        const top = sorted[0];
        const second = sorted[1];
        const isDraw =
          sorted.length >= 2 && top.score === second.score && top.correctCount === second.correctCount;
        finalizeMatch(cur, isDraw ? null : top?.id || null, isDraw);
      } else {
        emitMatchState(cur);
        scheduleSakarTimers(cur);
      }
    }, delay);
    turnTimers.set(match.id, timer);
  }
}

function scheduleTurnTimer(match: ActiveMatch) {
  if (match.gameType === 'sakar_htar') {
    scheduleSakarTimers(match);
    return;
  }
  const existing = turnTimers.get(match.id);
  if (existing) clearTimeout(existing);
  if (match.status !== 'active') return;
  const timeoutMs = getTurnTimeoutMs(match.gameType, match.turnTimeLimit);
  match.turnDeadline = Date.now() + timeoutMs;

  const timer = setTimeout(() => {
    const current = activeMatches.get(match.id);
    if (!current || current.status !== 'active') return;
    if (current.state.gameType === 'sakar_htar') return;
    if (current.state.gameType === 'rps') {
      const choices: RPSChoice[] = ['rock', 'paper', 'scissors'];
      if (!current.state.p1Submitted) {
        const autoC = choices[Math.floor(Math.random() * 3)];
        const res = applyRPSMove(current.state, 1, autoC);
        if (res.ok) {
          current.state = res.next;
          appendMoveLog(current, current.player1.id, current.player1.displayName, `Timer auto-pick: ${autoC}`);
        }
      }
      if (!current.state.p2Submitted) {
        const autoC = choices[Math.floor(Math.random() * 3)];
        const res = applyRPSMove(current.state, 2, autoC);
        if (res.ok) {
          current.state = res.next;
          appendMoveLog(current, current.player2.id, current.player2.displayName, `Timer auto-pick: ${autoC}`);
        }
      }
      if (current.state.winner !== 0) {
        const wId = current.state.winner === 1 ? current.player1.id : current.player2.id;
        finalizeMatch(current, wId, false);
      } else {
        scheduleTurnTimer(current);
        emitMatchState(current);
      }
      return;
    }

    const timedOutNum = current.state.turn;
    const timedOutPlayer = timedOutNum === 1 ? current.player1 : current.player2;
    appendMoveLog(current, timedOutPlayer.id, timedOutPlayer.displayName, 'Turn clock expired (forfeit)');
    const winnerId = timedOutNum === 1 ? current.player2.id : current.player1.id;
    finalizeMatch(current, winnerId, false);
  }, timeoutMs);

  turnTimers.set(match.id, timer);
}

function createBotParticipant(difficulty: Difficulty): MatchParticipant {
  const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  return {
    id: `bot_${difficulty}`,
    gameId: '#BOT-00001',
    displayName: `Aegis Bot (${label})`,
    avatarUrl: DEFAULT_AVATAR,
    frameId: difficulty === 'hard' ? 'frame_sovereign' : difficulty === 'medium' ? 'frame_sapphire' : 'frame_none',
    xp: difficulty === 'hard' ? 3200 : difficulty === 'medium' ? 1100 : 250,
    isBot: true,
    pingMs: 1,
  };
}

function startNewMatch(params: {
  gameType: GameType;
  mode: GameMode;
  player1: MatchParticipant;
  player2: MatchParticipant;
  participants?: MatchParticipant[];
  seatCapacity?: number;
  roomId?: string;
  difficulty?: Difficulty;
  bestOf?: 1 | 3 | 5;
  turnTimeLimit?: TurnTimeLimit;
  tournamentId?: string;
  bracketMatchId?: string;
}): ActiveMatch {
  const id = `match_${crypto.randomUUID().slice(0, 12)}`;
  const allParticipants = params.participants && params.participants.length > 0
    ? params.participants
    : [params.player1, params.player2];
  const riddles = params.gameType === 'sakar_htar' ? getRiddlePool() : undefined;
  const state = createInitialGameState(params.gameType, {
    bestOf: params.bestOf,
    participants: allParticipants,
    riddles,
    seatCapacity: params.seatCapacity || Math.max(allParticipants.length, 6),
  });
  const now = new Date().toISOString();
  const turnTimeLimit: TurnTimeLimit =
    params.turnTimeLimit === 10 || params.turnTimeLimit === 15 || params.turnTimeLimit === 20 || params.turnTimeLimit === 30
      ? params.turnTimeLimit
      : params.gameType === 'ttt' || params.gameType === 'sakar_htar'
      ? 15
      : 20;

  const match: ActiveMatch = {
    id,
    gameType: params.gameType,
    mode: params.mode,
    difficulty: params.difficulty,
    player1: params.player1,
    player2: params.player2,
    participants: allParticipants,
    roomId: params.roomId,
    state,
    status: 'active',
    winnerId: null,
    isDraw: false,
    turnTimeLimit,
    turnDeadline:
      params.gameType === 'sakar_htar'
        ? Date.now() + SAKAR_QUESTION_DURATION_MS
        : Date.now() + getTurnTimeoutMs(params.gameType, turnTimeLimit),
    graceDeadline: null,
    disconnectedPlayerId: null,
    tournamentId: params.tournamentId,
    bracketMatchId: params.bracketMatchId,
    moveLog: [],
  };

  activeMatches.set(id, match);
  activeMatchChats.set(id, []);
  for (const p of allParticipants) {
    if (!p.isBot) userActiveMatch.set(p.id, id);
  }

  db.prepare(
    `INSERT INTO matches (id, game_type, mode, player1_id, player2_id, player1_name, player2_name, winner_id, is_draw, status, created_at, move_history_json, chat_transcript_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, 'active', ?, '[]', '[]')`
  ).run(
    id,
    params.gameType,
    params.mode,
    params.player1.id,
    params.player2.id,
    params.player1.displayName,
    params.player2.displayName,
    now
  );

  scheduleTurnTimer(match);
  emitMatchState(match);
  schedulePresenceBroadcast();
  triggerBotTurnIfNeeded(match);
  return match;
}

function triggerBotTurnIfNeeded(match: ActiveMatch) {
  const isVsBot = match.mode === 'bot' || Boolean(match.player2?.isBot);
  if (match.status !== 'active' || !isVsBot) return;
  const difficulty = match.difficulty || pickBotDifficultyFromXp(match.player2?.xp ?? 1100);
  const thinkDelayMs =
    match.mode === 'matchmaking' ? 1500 + Math.floor(Math.random() * 1900) : 520;

  if (match.state.gameType === 'rps') {
    const roundKey = `${match.id}:${match.state.currentRound}`;
    const shouldPickNow =
      !match.state.p2Submitted &&
      (match.mode === 'matchmaking' || match.state.p1Submitted) &&
      !pendingRpsBotRounds.has(roundKey);
    if (shouldPickNow) {
      pendingRpsBotRounds.add(roundKey);
      const rpsDelay =
        match.mode === 'matchmaking'
          ? 1600 + Math.floor(Math.random() * 1900)
          : 500;
      const timer = setTimeout(() => {
        pendingRpsBotRounds.delete(roundKey);
        const cur = activeMatches.get(match.id);
        if (!cur || cur.status !== 'active' || cur.state.gameType !== 'rps' || cur.state.p2Submitted) return;
        const botChoice = getRPSBotMove(cur.state, difficulty);
        const res = applyRPSMove(cur.state, 2, botChoice);
        if (res.ok) {
          cur.state = res.next;
          appendMoveLog(cur, cur.player2.id, cur.player2.displayName, `Chose ${botChoice}`);
          if (cur.state.winner !== 0) {
            finalizeMatch(cur, cur.state.winner === 1 ? cur.player1.id : cur.player2.id, false);
          } else {
            if (res.roundResolved) {
              scheduleTurnTimer(cur);
              emitMatchState(cur);
              if (cur.mode === 'matchmaking') {
                setTimeout(() => {
                  const nextCur = activeMatches.get(match.id);
                  if (nextCur) triggerBotTurnIfNeeded(nextCur);
                }, 1350);
              }
            } else {
              emitMatchState(cur);
            }
          }
        }
      }, rpsDelay);
      botTurnTimers.set(match.id, timer);
    }
    return;
  }

  if (match.state.gameType === 'sakar_htar') return;
  if (match.state.turn !== 2) return;

  const existingBotTimer = botTurnTimers.get(match.id);
  if (existingBotTimer) clearTimeout(existingBotTimer);

  const timer = setTimeout(() => {
    botTurnTimers.delete(match.id);
    const cur = activeMatches.get(match.id);
    if (!cur || cur.status !== 'active') return;
    if (cur.state.gameType === 'connect4' && cur.state.turn === 2) {
      const col = getConnect4BotMove(cur.state, difficulty, 2);
      const res = applyConnect4Move(cur.state, 2, col);
      if (res.ok) {
        cur.state = res.next;
        appendMoveLog(cur, cur.player2.id, cur.player2.displayName, `Dropped disc in column ${col + 1}`);
        if (cur.state.winner === 'draw') finalizeMatch(cur, null, true);
        else if (cur.state.winner !== 0) finalizeMatch(cur, cur.player2.id, false);
        else {
          scheduleTurnTimer(cur);
          emitMatchState(cur);
        }
      }
    } else if (cur.state.gameType === 'ttt' && cur.state.turn === 2) {
      const idx = getTTTBotMove(cur.state, difficulty, 2);
      const res = applyTTTMove(cur.state, 2, idx);
      if (res.ok) {
        cur.state = res.next;
        appendMoveLog(cur, cur.player2.id, cur.player2.displayName, `Marked cell #${idx + 1}`);
        if (cur.state.winner === 'draw') finalizeMatch(cur, null, true);
        else if (cur.state.winner !== 0) finalizeMatch(cur, cur.player2.id, false);
        else {
          scheduleTurnTimer(cur);
          emitMatchState(cur);
        }
      }
    }
  }, thinkDelayMs);
  botTurnTimers.set(match.id, timer);
}

function processMatchMove(matchId: string, userId: string, movePayload: Record<string, unknown>): { ok: boolean; error?: string } {
  const match = activeMatches.get(matchId);
  if (!match) return { ok: false, error: 'Match not found' };
  if (match.status !== 'active') return { ok: false, error: 'Match already finished' };

  if (match.state.gameType === 'sakar_htar') {
    const actor =
      match.participants?.find((p) => p.id === userId) ||
      (match.player1.id === userId ? match.player1 : match.player2.id === userId ? match.player2 : null);
    if (!actor) return { ok: false, error: 'Not seated in this Sakar-Htar match' };
    const optionIndex = Number(movePayload.optionIndex);
    const res = applySakarHtarAnswer(match.state, userId, optionIndex);
    if (!res.ok) return res;
    match.state = res.next;
    appendMoveLog(
      match,
      actor.id,
      actor.displayName,
      `Q${match.state.questionIndex + 1} option #${optionIndex + 1} (${res.isCorrect ? `+${res.points} pts` : 'wrong'})`
    );
    if (res.allAnswered) {
      match.state = revealSakarHtarQuestion(match.state);
      scheduleSakarTimers(match);
    }
    emitMatchState(match);
    return { ok: true };
  }

  const playerNum: 1 | 2 | 0 = match.player1.id === userId ? 1 : match.player2.id === userId ? 2 : 0;
  if (playerNum === 0) return { ok: false, error: 'Not a participant in this match' };
  const actor = playerNum === 1 ? match.player1 : match.player2;

  if (match.state.gameType === 'connect4') {
    const col = Number(movePayload.col);
    const res = applyConnect4Move(match.state, playerNum, col);
    if (!res.ok) return res;
    match.state = res.next;
    appendMoveLog(match, actor.id, actor.displayName, `Dropped disc in column ${col + 1}`);
    if (match.state.winner === 'draw') finalizeMatch(match, null, true);
    else if (match.state.winner !== 0) {
      finalizeMatch(match, match.state.winner === 1 ? match.player1.id : match.player2.id, false);
    } else {
      scheduleTurnTimer(match);
      emitMatchState(match);
      triggerBotTurnIfNeeded(match);
    }
    return { ok: true };
  }

  if (match.state.gameType === 'ttt') {
    const index = Number(movePayload.index);
    const res = applyTTTMove(match.state, playerNum, index);
    if (!res.ok) return res;
    match.state = res.next;
    appendMoveLog(match, actor.id, actor.displayName, `Placed ${playerNum === 1 ? 'X' : 'O'} at cell #${index + 1}`);
    if (match.state.winner === 'draw') finalizeMatch(match, null, true);
    else if (match.state.winner !== 0) {
      finalizeMatch(match, match.state.winner === 1 ? match.player1.id : match.player2.id, false);
    } else {
      scheduleTurnTimer(match);
      emitMatchState(match);
      triggerBotTurnIfNeeded(match);
    }
    return { ok: true };
  }

  if (match.state.gameType === 'rps') {
    const choice = String(movePayload.choice) as RPSChoice;
    const res = applyRPSMove(match.state, playerNum, choice);
    if (!res.ok) return res;
    match.state = res.next;
    appendMoveLog(match, actor.id, actor.displayName, `Locked ${choice} (Round ${match.state.currentRound})`);
    if (match.state.winner !== 0) {
      finalizeMatch(match, match.state.winner === 1 ? match.player1.id : match.player2.id, false);
    } else {
      if (res.roundResolved) scheduleTurnTimer(match);
      emitMatchState(match);
      triggerBotTurnIfNeeded(match);
    }
    return { ok: true };
  }

  return { ok: false, error: 'Unsupported game type' };
}

function launchSakarQuickMatchNow(fillWithBots = false) {
  if (sakarQuickQueue.length === 0) return;

  const locks = getFeatureLocks();
  if (locks.sakar_htar || locks.matchmaking) return;

  const batch = sakarQuickQueue.splice(0, 6);
  const participants: MatchParticipant[] = [];
  const usedIds = new Set<string>();
  for (const item of batch) {
    const u = getUserById(item.userId);
    if (u && !u.isBanned && !isUserSuspended(u) && !userActiveMatch.has(u.id)) {
      participants.push(toParticipant(u, getUserPingMs(u.id)));
      usedIds.add(u.id);
    }
  }
  broadcastSakarQueueCount();
  if (participants.length === 0) return;

  if (fillWithBots && participants.length < 4) {
    const targetTotal = 4;
    const botsNeeded = Math.max(0, targetTotal - participants.length);
    const avgXp = Math.round(participants.reduce((s, p) => s + p.xp, 0) / participants.length);
    const bots = pickBurmeseBotBatch(botsNeeded, usedIds, avgXp);
    participants.push(...bots);
  }

  startNewMatch({
    gameType: 'sakar_htar',
    mode: participants.length === 1 ? 'bot' : 'matchmaking',
    player1: participants[0],
    player2: participants[1] || participants[0],
    participants,
    seatCapacity: Math.max(6, participants.length),
    turnTimeLimit: 15,
  });
}

function broadcastSakarQueueCount() {
  for (const item of sakarQuickQueue) {
    sendToUser(item.userId, { type: 'sakar:queue', count: sakarQuickQueue.length });
  }
}

function sendQueueTick(item: QueuedEntry, gameType: GameType, count: number, settings: MatchmakingSettings) {
  const elapsedSec = Math.max(0, Math.floor((Date.now() - item.joinedAt) / 1000));
  sendToUser(item.userId, {
    type: 'queue:tick',
    queue: {
      gameType,
      joinedAt: item.joinedAt,
      elapsedSec,
      maxSearchSeconds: settings.maxSearchSeconds,
      botFillDelaySeconds: settings.botFillDelaySeconds,
      autoBotFill: item.autoBotFill,
      count,
    },
  });
}

function tryMatchmaking(gameType: GameType) {
  const locks = getFeatureLocks();
  if (locks.matchmaking || locks[gameType]) return;

  const q = matchmakingQueues[gameType];
  if (q.length < 2) return;

  // Match closest XP players (or widen window after 6 seconds in queue)
  const now = Date.now();
  for (let i = 0; i < q.length; i++) {
    for (let j = i + 1; j < q.length; j++) {
      const a = q[i];
      const b = q[j];
      const maxWait = Math.max(now - a.joinedAt, now - b.joinedAt);
      const allowedDiff = maxWait > 6000 ? 100000 : 500;
      if (Math.abs(a.xp - b.xp) <= allowedDiff) {
        q.splice(j, 1);
        q.splice(i, 1);
        const u1 = getUserById(a.userId);
        const u2 = getUserById(b.userId);
        if (u1 && u2 && !u1.isBanned && !u2.isBanned && !isUserSuspended(u1) && !isUserSuspended(u2)) {
          startNewMatch({
            gameType,
            mode: 'matchmaking',
            turnTimeLimit: a.turnTimeLimit || b.turnTimeLimit,
            player1: toParticipant(u1, getUserPingMs(u1.id)),
            player2: toParticipant(u2, getUserPingMs(u2.id)),
          });
        }
        return;
      }
    }
  }
}

// High-resolution matchmaking sweep (500ms): real pairing -> bot backfill -> search timeout auto-exit
setInterval(() => {
  const settings = getMatchmakingSettings();
  const locks = getFeatureLocks();
  const now = Date.now();

  for (const gt of ['connect4', 'ttt', 'rps'] as const) {
    tryMatchmaking(gt);
    const q = matchmakingQueues[gt];
    for (let idx = q.length - 1; idx >= 0; idx--) {
      const item = q[idx];
      const elapsedSec = Math.floor((now - item.joinedAt) / 1000);
      const u = getUserById(item.userId);
      if (!u || u.isBanned || isUserSuspended(u) || userActiveMatch.has(item.userId)) {
        q.splice(idx, 1);
        sendToUser(item.userId, { type: 'queue:cancelled' });
        continue;
      }

      if (elapsedSec >= settings.maxSearchSeconds) {
        q.splice(idx, 1);
        sendToUser(item.userId, {
          type: 'queue:timeout',
          gameType: gt,
          maxSearchSeconds: settings.maxSearchSeconds,
        });
        schedulePresenceBroadcast();
        continue;
      }

      if (item.autoBotFill && elapsedSec >= settings.botFillDelaySeconds && !locks.matchmaking && !locks[gt]) {
        q.splice(idx, 1);
        const bot = createBurmeseBotParticipant(undefined, u.xp);
        startNewMatch({
          gameType: gt,
          mode: 'matchmaking',
          difficulty: pickBotDifficultyFromXp(bot.xp),
          turnTimeLimit: item.turnTimeLimit,
          player1: toParticipant(u, getUserPingMs(u.id)),
          player2: bot,
        });
        continue;
      }

      sendQueueTick(item, gt, q.length, settings);
    }
  }

  // Sakar-Htar Quick Queue sweep
  if (sakarQuickQueue.length >= 6) {
    launchSakarQuickMatchNow(false);
  } else if (sakarQuickQueue.length > 0) {
    // Check timeouts first
    for (let idx = sakarQuickQueue.length - 1; idx >= 0; idx--) {
      const item = sakarQuickQueue[idx];
      const elapsedSec = Math.floor((now - item.joinedAt) / 1000);
      const u = getUserById(item.userId);
      if (!u || u.isBanned || isUserSuspended(u) || userActiveMatch.has(item.userId)) {
        sakarQuickQueue.splice(idx, 1);
        sendToUser(item.userId, { type: 'queue:cancelled' });
        continue;
      }
      if (elapsedSec >= settings.maxSearchSeconds) {
        sakarQuickQueue.splice(idx, 1);
        sendToUser(item.userId, {
          type: 'queue:timeout',
          gameType: 'sakar_htar',
          maxSearchSeconds: settings.maxSearchSeconds,
        });
        sendToUser(item.userId, { type: 'sakar:queue', count: 0 });
        schedulePresenceBroadcast();
      }
    }

    if (sakarQuickQueue.length >= 2) {
      const oldest = sakarQuickQueue[0];
      const oldestElapsed = Math.floor((now - oldest.joinedAt) / 1000);
      if (oldestElapsed >= settings.botFillDelaySeconds) {
        launchSakarQuickMatchNow(oldest.autoBotFill);
      }
    } else if (sakarQuickQueue.length === 1) {
      const solo = sakarQuickQueue[0];
      const elapsed = Math.floor((now - solo.joinedAt) / 1000);
      if (solo.autoBotFill && elapsed >= settings.botFillDelaySeconds && !locks.matchmaking && !locks.sakar_htar) {
        launchSakarQuickMatchNow(true);
      }
    }

    for (const item of sakarQuickQueue) {
      sendQueueTick(item, 'sakar_htar', sakarQuickQueue.length, settings);
    }
  }
}, 500);

// ─── EXPRESS APP & AUTH MIDDLEWARE ────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: ['http://localhost:5173'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '4mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

interface AuthReq extends express.Request {
  authUser?: UserProfile;
  authToken?: string;
}

function getAuthSession(token: string | undefined): { user: UserProfile; token: string } | null {
  if (!token) return null;
  const sess = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as { token: string; user_id: string } | undefined;
  if (!sess) return null;
  const user = getUserById(sess.user_id);
  if (!user || user.isBanned) return null;
  return { user, token: sess.token };
}

function requireAuth(req: AuthReq, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const session = getAuthSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized or session expired' });
  }
  req.authUser = session.user;
  req.authToken = session.token;
  next();
}

function requireAdmin(req: AuthReq, res: express.Response, next: express.NextFunction) {
  requireAuth(req, res, () => {
    if (req.authUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const username = sanitizeText(req.body?.username, 24).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const displayName = sanitizeText(req.body?.displayName || username, 32) || username;
  const email = sanitizeText(req.body?.email || '', 120).toLowerCase() || null;

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-24 characters (letters, numbers, underscores).' });
  }
  if (password.length < 4 || password.length > 64) {
    return res.status(400).json({ error: 'Password must be 4-64 characters.' });
  }
  if (username === 'yanlinnaung') {
    return res.status(400).json({ error: 'Username is unavailable.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already registered.' });
  }

  const id = `usr_${crypto.randomUUID().slice(0, 12)}`;
  const gameId = generateGameId();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(password);
  const recoveryPin = String(crypto.randomInt(100000, 999999));
  const recoveryPinHash = hashPassword(recoveryPin);

  db.prepare(`
    INSERT INTO users (id, username, password_hash, recovery_pin_hash, email, game_id, display_name, avatar_url, frame_id, xp, wins, losses, draws, role, is_banned, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'frame_gold', 0, 0, 0, 0, 'user', 0, ?)
  `).run(id, username, passwordHash, recoveryPinHash, email, gameId, displayName, DEFAULT_AVATAR, now);

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, role, created_at) VALUES (?, ?, ?, ?)').run(token, id, 'user', now);

  const user = getUserById(id)!;
  res.json({ token, user, recoveryPin });
});

app.post('/api/auth/recover-pin', (req, res) => {
  const username = sanitizeText(req.body?.username, 32).toLowerCase();
  const pin = sanitizeText(req.body?.pin, 12);
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!username || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: 'Valid username and 6-digit Recovery PIN are required.' });
  }
  if (newPassword.length < 4 || newPassword.length > 64) {
    return res.status(400).json({ error: 'New password must be 4-64 characters.' });
  }

  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as Record<string, unknown> | undefined;
  if (!row || !row.recovery_pin_hash || !verifyPassword(pin, String(row.recovery_pin_hash))) {
    return res.status(401).json({ error: 'Invalid username or 6-digit Recovery PIN.' });
  }

  const nextHash = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(nextHash, String(row.id));
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(String(row.id));
  res.json({ ok: true });
});

app.post('/api/auth/recover-email', (req, res) => {
  const email = sanitizeText(req.body?.email, 120).toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  res.json({
    ok: true,
    message:
      'If your email is linked with Firebase Auth or your arena profile, reset instructions have been processed. Standard username accounts can also reset immediately via their 6-Digit Backup PIN.',
  });
});

app.post('/api/auth/login', (req, res) => {
  const username = sanitizeText(req.body?.username, 32).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as Record<string, unknown> | undefined;
  if (!row || !verifyPassword(password, String(row.password_hash))) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  const user = rowToUser(row);
  if (user.isBanned) {
    return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, role, created_at) VALUES (?, ?, ?, ?)').run({}, token, user.id, user.role === 'admin' ? 'admin' : 'user', new Date().toISOString());
  res.json({ token, user });
});

app.post('/api/auth/google', async (req, res) => {
  const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken : '';
  if (!idToken) return res.status(400).json({ error: 'Missing Firebase ID token' });

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    let row = db.prepare('SELECT * FROM users WHERE firebase_uid = ?').get(uid) as Record<string, unknown> | undefined;

    if (!row) {
      const baseName = sanitizeText(decoded.name || decoded.email?.split('@')[0] || 'player', 20)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_') || 'player';
      let username = baseName;
      if (username === 'yanlinnaung' || db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
        username = `${baseName.slice(0, 16)}_${crypto.randomInt(100, 999)}`;
      }
      const id = `usr_${crypto.randomUUID().slice(0, 12)}`;
      const gameId = generateGameId();
      const now = new Date().toISOString();
      const displayName = sanitizeText(decoded.name || username, 32);
      const avatarUrl = typeof decoded.picture === 'string' && decoded.picture.startsWith('https://') ? decoded.picture : DEFAULT_AVATAR;

      db.prepare(`
        INSERT INTO users (id, username, password_hash, firebase_uid, game_id, display_name, avatar_url, frame_id, xp, wins, losses, draws, role, is_banned, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'frame_gold', 0, 0, 0, 0, 'user', 0, ?)
      `).run(id, username, hashPassword(crypto.randomBytes(16).toString('hex')), uid, gameId, displayName, avatarUrl, now);

      row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown>;
    }

    const user = rowToUser(row);
    if (user.isBanned) {
      return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token, user_id, role, created_at) VALUES (?, ?, ?, ?)').run({}, token, user.id, user.role === 'admin' ? 'admin' : 'user', new Date().toISOString());
    res.json({ token, user });
  } catch (err) {
    console.error('Google auth verification failed:', err);
    res.status(401).json({ error: 'Unable to verify Google authentication token.' });
  }
});

app.post('/api/auth/logout', requireAuth, (req: AuthReq, res) => {
  if (req.authToken) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.authToken);
  }
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthReq, res) => {
  res.json({ user: req.authUser });
});

// ─── PUBLIC BOOTSTRAP & ARENA DATA ────────────────────────────────────────────
app.get('/api/bootstrap', (_req, res) => {
  const onlinePlayers = getOnlinePlayersList();
  res.json({
    onlineCount: onlinePlayers.length,
    onlinePlayers,
    frames: getFrames(true),
    featureLocks: getFeatureLocks(),
    matchmakingSettings: getMatchmakingSettings(),
    leaderboard: getLeaderboard(50),
    tournaments: getTournaments(),
    landingContent: getLandingContent(),
  });
});

// ─── PROFILE & SOCIAL ROUTES ──────────────────────────────────────────────────
app.patch('/api/profile', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  const displayName = req.body?.displayName !== undefined ? sanitizeText(req.body.displayName, 32) : user.displayName;
  const frameId = typeof req.body?.frameId === 'string' ? req.body.frameId : user.frameId;

  if (displayName.length < 2) {
    return res.status(400).json({ error: 'Display name must be at least 2 characters.' });
  }

  const frameExists = db.prepare('SELECT * FROM frames WHERE id = ? AND is_active = 1').get(frameId);
  const finalFrameId = frameExists ? frameId : user.frameId;

  db.prepare('UPDATE users SET display_name = ?, frame_id = ? WHERE id = ?').run(displayName, finalFrameId, user.id);
  const updated = getUserById(user.id)!;
  schedulePresenceBroadcast();
  res.json({ user: updated });
});

app.post('/api/profile/avatar', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Please upload a valid PNG, JPEG, or WebP image.' });
  }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 2 * 1024 * 1024) {
    return res.status(400).json({ error: 'Avatar image must be under 2 MB.' });
  }

  const filename = `avatar_${user.id}_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  const avatarUrl = `/uploads/${filename}`;
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, user.id);

  const updated = getUserById(user.id)!;
  schedulePresenceBroadcast();
  res.json({ user: updated });
});

app.get('/api/users/search', requireAuth, (req: AuthReq, res) => {
  const q = sanitizeText(req.query.q, 32);
  if (!q) return res.json({ users: [] });

  const pattern = `%${q.toLowerCase()}%`;
  const rows = db
    .prepare(
      `SELECT * FROM users
       WHERE role = 'user' AND is_banned = 0 AND id != ?
         AND (LOWER(game_id) = ? OR LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?)
       LIMIT 20`
    )
    .all(req.authUser!.id, q.toLowerCase(), pattern, pattern) as Record<string, unknown>[];

  res.json({ users: rows.map(rowToUser) });
});

app.get('/api/users/:id/profile', requireAuth, (req, res) => {
  const target = getUserById(String(req.params.id));
  if (!target || target.role === 'admin') {
    return res.status(404).json({ error: 'Player not found' });
  }
  const matches = db
    .prepare(
      `SELECT * FROM matches WHERE (player1_id = ? OR player2_id = ?) AND status = 'finished' ORDER BY finished_at DESC LIMIT 12`
    )
    .all(target.id, target.id) as Record<string, unknown>[];
  res.json({
    profile: target,
    isOnline: socketsByUser.has(target.id),
    pingMs: getUserPingMs(target.id),
    recentMatches: matches.map((m) => ({
      id: String(m.id),
      gameType: String(m.game_type),
      mode: String(m.mode),
      player1Id: String(m.player1_id),
      player2Id: String(m.player2_id),
      player1Name: String(m.player1_name),
      player2Name: String(m.player2_name),
      winnerId: m.winner_id ? String(m.winner_id) : null,
      isDraw: Number(m.is_draw) === 1,
      createdAt: String(m.created_at),
      finishedAt: m.finished_at ? String(m.finished_at) : null,
    })),
  });
});

app.get('/api/matches/history', requireAuth, (req: AuthReq, res) => {
  const uid = req.authUser!.id;
  const rows = db
    .prepare(
      `SELECT * FROM matches WHERE (player1_id = ? OR player2_id = ?) AND status = 'finished' ORDER BY finished_at DESC LIMIT 30`
    )
    .all(uid, uid) as Record<string, unknown>[];
  res.json({
    matches: rows.map((m) => ({
      id: String(m.id),
      gameType: String(m.game_type),
      mode: String(m.mode),
      player1Id: String(m.player1_id),
      player2Id: String(m.player2_id),
      player1Name: String(m.player1_name),
      player2Name: String(m.player2_name),
      winnerId: m.winner_id ? String(m.winner_id) : null,
      isDraw: Number(m.is_draw) === 1,
      createdAt: String(m.created_at),
      finishedAt: m.finished_at ? String(m.finished_at) : null,
    })),
  });
});

// ─── SOCIAL & DIRECT MESSAGING ────────────────────────────────────────────────
app.get('/api/social/friends', requireAuth, (req: AuthReq, res) => {
  const uid = req.authUser!.id;
  const rows = db
    .prepare('SELECT * FROM friendships WHERE requester_id = ? OR addressee_id = ? ORDER BY created_at DESC')
    .all(uid, uid) as Record<string, unknown>[];

  const items = rows
    .map((r) => {
      const reqId = String(r.requester_id);
      const addId = String(r.addressee_id);
      const otherId = reqId === uid ? addId : reqId;
      const otherUser = getUserById(otherId);
      if (!otherUser || otherUser.role === 'admin') return null;

      let status: 'pending_incoming' | 'pending_outgoing' | 'accepted' | 'blocked';
      if (r.status === 'blocked') {
        if (reqId !== uid) return null; // Only show blocks initiated by current user
        status = 'blocked';
      } else if (r.status === 'accepted') {
        status = 'accepted';
      } else {
        status = reqId === uid ? 'pending_outgoing' : 'pending_incoming';
      }

      const isOnline = status === 'accepted' && socketsByUser.has(otherId);
      const unreadRow = db
        .prepare('SELECT COUNT(*) as cnt FROM direct_messages WHERE sender_id = ? AND receiver_id = ? AND read = 0')
        .get(otherId, uid) as { cnt: number };

      return {
        id: String(r.id),
        user: otherUser,
        status,
        isOnline,
        playerStatus: !isOnline ? 'offline' : userActiveMatch.has(otherId) ? 'in_game' : 'online',
        pingMs: isOnline ? getUserPingMs(otherId) : 0,
        unreadCount: Number(unreadRow?.cnt || 0),
      };
    })
    .filter(Boolean);

  res.json({ friendships: items });
});

app.post('/api/social/request', requireAuth, (req: AuthReq, res) => {
  const uid = req.authUser!.id;
  const targetId = String(req.body?.targetUserId || '');
  if (!targetId || targetId === uid) return res.status(400).json({ error: 'Invalid target user' });

  const target = getUserById(targetId);
  if (!target || target.role === 'admin') return res.status(404).json({ error: 'User not found' });

  const existing = db
    .prepare(
      'SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)'
    )
    .get(uid, targetId, targetId, uid) as Record<string, unknown> | undefined;

  if (existing) {
    if (existing.status === 'blocked') return res.status(403).json({ error: 'Cannot add blocked user' });
    if (existing.status === 'accepted') return res.status(400).json({ error: 'Already friends' });
    return res.status(400).json({ error: 'Friend request already pending' });
  }

  const id = `fr_${crypto.randomUUID().slice(0, 12)}`;
  db.prepare('INSERT INTO friendships (id, requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    uid,
    targetId,
    'pending',
    new Date().toISOString()
  );

  sendToUser(targetId, { type: 'social:update' });
  res.json({ ok: true });
});

app.post('/api/social/respond', requireAuth, (req: AuthReq, res) => {
  const uid = req.authUser!.id;
  const targetId = String(req.body?.targetUserId || '');
  const action = String(req.body?.action || '');

  if (!targetId) return res.status(400).json({ error: 'Missing target user' });

  if (action === 'block') {
    db.prepare(
      'DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)'
    ).run(uid, targetId, targetId, uid);
    db.prepare('INSERT INTO friendships (id, requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, ?, ?)').run(
      `fr_${crypto.randomUUID().slice(0, 12)}`,
      uid,
      targetId,
      'blocked',
      new Date().toISOString()
    );
    sendToUser(targetId, { type: 'social:update' });
    return res.json({ ok: true });
  }

  if (action === 'unblock' || action === 'remove' || action === 'decline') {
    db.prepare(
      'DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)'
    ).run(uid, targetId, targetId, uid);
    sendToUser(targetId, { type: 'social:update' });
    return res.json({ ok: true });
  }

  if (action === 'accept') {
    db.prepare(
      "UPDATE friendships SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'"
    ).run(targetId, uid);
    sendToUser(targetId, { type: 'social:update' });
    return res.json({ ok: true });
  }

  res.status(400).json({ error: 'Invalid social action' });
});

app.get('/api/social/messages/:friendId', requireAuth, (req: AuthReq, res) => {
  const uid = req.authUser!.id;
  const friendId = String(req.params.friendId);

  db.prepare('UPDATE direct_messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0').run(friendId, uid);

  const rows = db
    .prepare(
      `SELECT * FROM direct_messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC LIMIT 100`
    )
    .all(uid, friendId, friendId, uid) as Record<string, unknown>[];

  res.json({
    messages: rows.map((r) => ({
      id: String(r.id),
      senderId: String(r.sender_id),
      receiverId: String(r.receiver_id),
      content: String(r.content),
      read: Number(r.read) === 1,
      createdAt: String(r.created_at),
    })),
  });
});

app.post('/api/social/messages/:friendId', requireAuth, (req: AuthReq, res) => {
  const uid = req.authUser!.id;
  const friendId = String(req.params.friendId);
  const locks = getFeatureLocks();
  if (locks.chat) {
    return res.status(423).json({ error: 'Chat is currently locked by an administrator.' });
  }

  const content = sanitizeText(req.body?.content, 500);
  if (!content) return res.status(400).json({ error: 'Message cannot be empty' });

  const rel = db
    .prepare(
      "SELECT * FROM friendships WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)) AND status = 'accepted'"
    )
    .get(uid, friendId, friendId, uid);
  if (!rel) return res.status(403).json({ error: 'You must be friends to send direct messages.' });

  const msg = {
    id: `dm_${crypto.randomUUID().slice(0, 12)}`,
    senderId: uid,
    receiverId: friendId,
    content,
    read: false,
    createdAt: new Date().toISOString(),
  };

  db.prepare('INSERT INTO direct_messages (id, sender_id, receiver_id, content, read, created_at) VALUES (?, ?, ?, ?, 0, ?)').run(
    msg.id,
    msg.senderId,
    msg.receiverId,
    msg.content,
    msg.createdAt
  );

  sendToUser(friendId, { type: 'dm:new', message: msg });
  sendToUser(uid, { type: 'dm:new', message: msg });
  res.json({ message: msg });
});

// ─── GAME & MATCH ROUTES ──────────────────────────────────────────────────────
function normalizeTurnTimeLimit(val: unknown, gameType: GameType): TurnTimeLimit {
  const n = Number(val);
  if (n === 10 || n === 15 || n === 20 || n === 30) return n;
  return gameType === 'ttt' ? 15 : 20;
}

// ─── SAKAR-HTAR SOLO, CUSTOM ROOMS (2-8 PLAYERS) & RIDDLE ROUTES ─────────────
function generateRoomCode(): string {
  for (let i = 0; i < 20; i++) {
    const code = `#SKH-${crypto.randomInt(1000, 9999)}`;
    const exists = Array.from(customRooms.values()).some((r) => r.code === code);
    if (!exists) return code;
  }
  return `#SKH-${Date.now().toString().slice(-4)}`;
}

app.get('/api/riddles', requireAuth, (_req, res) => {
  res.json({ riddles: getRiddlePool() });
});

app.post('/api/sakar/solo', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  if (isUserSuspended(user)) {
    return res.status(403).json({
      error: `Your account is temporarily suspended until ${new Date(user.suspendedUntil!).toLocaleString()}.`,
    });
  }
  const locks = getFeatureLocks();
  if (locks.sakar_htar) {
    return res.status(423).json({ error: 'Sakar-Htar is currently in maintenance mode.' });
  }
  if (userActiveMatch.has(user.id)) {
    return res.status(409).json({ error: 'You already have an active match.' });
  }

  const p1 = toParticipant(user, getUserPingMs(user.id));
  const match = startNewMatch({
    gameType: 'sakar_htar',
    mode: 'bot',
    player1: p1,
    player2: p1,
    participants: [p1],
    seatCapacity: 6,
    turnTimeLimit: 15,
  });

  res.json({ match: serializeMatchForViewer(match, user.id) });
});

app.get('/api/sakar/rooms', requireAuth, (_req, res) => {
  res.json({ rooms: getOpenCustomRoomsList() });
});

app.post('/api/sakar/rooms', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  if (isUserSuspended(user)) {
    return res.status(403).json({ error: 'Suspended accounts cannot create rooms.' });
  }
  const locks = getFeatureLocks();
  if (locks.sakar_htar) {
    return res.status(423).json({ error: 'Sakar-Htar is currently locked.' });
  }
  if (userActiveMatch.has(user.id)) {
    return res.status(409).json({ error: 'Finish your current match first.' });
  }

  removeUserFromQueues(user.id);
  removeUserFromCustomRooms(user.id);

  const rawMax = Number(req.body?.maxPlayers || 6);
  const maxPlayers = Math.max(2, Math.min(8, Number.isFinite(rawMax) ? Math.floor(rawMax) : 6));
  const title = sanitizeText(req.body?.title || `${user.displayName}'s Courtyard`, 48) || `${user.displayName}'s Courtyard`;

  const room: CustomRoom = {
    id: `room_${crypto.randomUUID().slice(0, 10)}`,
    code: generateRoomCode(),
    title,
    gameType: 'sakar_htar',
    hostId: user.id,
    maxPlayers,
    status: 'waiting',
    activeMatchId: null,
    participants: [toParticipant(user, getUserPingMs(user.id))],
    createdAt: new Date().toISOString(),
  };

  customRooms.set(room.id, room);
  customRoomChats.set(room.id, []);
  emitRoomState(room);
  broadcastOpenRooms();
  res.json({ room });
});

app.post('/api/sakar/rooms/join', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  if (isUserSuspended(user)) {
    return res.status(403).json({ error: 'Suspended accounts cannot join rooms.' });
  }
  const locks = getFeatureLocks();
  if (locks.sakar_htar) {
    return res.status(423).json({ error: 'Sakar-Htar is currently locked.' });
  }
  if (userActiveMatch.has(user.id)) {
    return res.status(409).json({ error: 'Finish your current match first.' });
  }

  const query = sanitizeText(req.body?.roomId || req.body?.code || '', 32).toUpperCase();
  if (!query) return res.status(400).json({ error: 'Room ID or code is required.' });

  const normalizedCode = query.startsWith('#') ? query : query.startsWith('SKH-') ? `#${query}` : query;
  const room = Array.from(customRooms.values()).find(
    (r) => r.id.toUpperCase() === query || r.code.toUpperCase() === normalizedCode
  );
  if (!room) return res.status(404).json({ error: 'Custom Room not found. Check the #SKH-XXXX Room ID.' });
  if (room.status !== 'waiting') return res.status(409).json({ error: 'Match in this room has already started.' });
  if (room.participants.some((p) => p.id === user.id)) {
    emitRoomState(room);
    return res.json({ room });
  }
  if (room.participants.length >= room.maxPlayers) {
    return res.status(409).json({ error: 'This custom room is full.' });
  }

  removeUserFromQueues(user.id);
  removeUserFromCustomRooms(user.id);

  room.participants.push(toParticipant(user, getUserPingMs(user.id)));
  emitRoomState(room);
  broadcastOpenRooms();
  res.json({ room });
});

app.post('/api/sakar/rooms/:id/leave', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  const room = customRooms.get(String(req.params.id));
  if (!room) {
    sendToUser(user.id, { type: 'room:state', room: null, chat: [] });
    return res.json({ ok: true });
  }
  const idx = room.participants.findIndex((p) => p.id === user.id);
  if (idx !== -1) {
    room.participants.splice(idx, 1);
  }
  sendToUser(user.id, { type: 'room:state', room: null, chat: [] });

  if (room.participants.length === 0) {
    customRooms.delete(room.id);
    customRoomChats.delete(room.id);
  } else {
    if (room.hostId === user.id) {
      room.hostId = room.participants[0].id;
    }
    emitRoomState(room);
  }
  broadcastOpenRooms();
  res.json({ ok: true });
});

app.post('/api/sakar/rooms/:id/kick', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  const room = customRooms.get(String(req.params.id));
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (room.hostId !== user.id) return res.status(403).json({ error: 'Only the Room Leader can kick players.' });

  const targetUserId = String(req.body?.userId || '');
  if (!targetUserId || targetUserId === user.id) {
    return res.status(400).json({ error: 'Invalid target player.' });
  }
  const idx = room.participants.findIndex((p) => p.id === targetUserId);
  if (idx === -1) return res.status(404).json({ error: 'Player is not in this room.' });

  room.participants.splice(idx, 1);
  sendToUser(targetUserId, { type: 'room:kicked', roomId: room.id, reason: 'Removed by the Room Leader.' });
  sendToUser(targetUserId, { type: 'room:state', room: null, chat: [] });
  emitRoomState(room);
  broadcastOpenRooms();
  res.json({ room });
});

app.post('/api/sakar/rooms/:id/start', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  const room = customRooms.get(String(req.params.id));
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (room.hostId !== user.id) return res.status(403).json({ error: 'Only the Room Leader can start the match.' });
  if (room.status !== 'waiting') return res.status(409).json({ error: 'Room match is already active.' });
  if (room.participants.length < 2) {
    return res.status(400).json({ error: 'At least 2 players are required to start a Custom Room match.' });
  }

  const participants = room.participants.map((p) => {
    const fresh = getUserById(p.id);
    return fresh ? toParticipant(fresh, getUserPingMs(fresh.id)) : p;
  });

  room.status = 'in_game';
  const match = startNewMatch({
    gameType: 'sakar_htar',
    mode: 'custom_room',
    player1: participants[0],
    player2: participants[1] || participants[0],
    participants,
    seatCapacity: room.maxPlayers,
    roomId: room.id,
    turnTimeLimit: 15,
  });
  room.activeMatchId = match.id;
  emitRoomState(room);
  broadcastOpenRooms();
  res.json({ match: serializeMatchForViewer(match, user.id) });
});

app.post('/api/matches/bot', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  if (isUserSuspended(user)) {
    return res.status(403).json({ error: `Your account is temporarily suspended until ${new Date(user.suspendedUntil!).toLocaleString()}.` });
  }
  const gameType = String(req.body?.gameType || '') as GameType;
  const difficulty = (String(req.body?.difficulty || 'medium') as Difficulty) || 'medium';
  const bestOf = req.body?.bestOf === 5 ? 5 : req.body?.bestOf === 1 ? 1 : 3;
  const turnTimeLimit = normalizeTurnTimeLimit(req.body?.turnTimeLimit, gameType);

  if (!['connect4', 'ttt', 'rps', 'sakar_htar'].includes(gameType)) {
    return res.status(400).json({ error: 'Invalid game type' });
  }

  const locks = getFeatureLocks();
  if (locks[gameType]) {
    return res.status(423).json({ error: 'This game is currently in maintenance mode.' });
  }

  // Clean up any prior unfinished bot match for this user
  const prevMatchId = userActiveMatch.get(user.id);
  if (prevMatchId) {
    const prev = activeMatches.get(prevMatchId);
    if (prev && prev.mode === 'bot') {
      clearMatchTimers(prev.id);
      activeMatches.delete(prev.id);
      activeMatchChats.delete(prev.id);
      userActiveMatch.delete(user.id);
    } else if (prev && prev.status === 'active') {
      return res.status(409).json({ error: 'You already have an active multiplayer match.' });
    }
  }

  const p1 = toParticipant(user, getUserPingMs(user.id));
  const match = startNewMatch({
    gameType,
    mode: 'bot',
    difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
    bestOf,
    turnTimeLimit,
    player1: p1,
    player2: gameType === 'sakar_htar' ? p1 : createBotParticipant(difficulty),
    participants: gameType === 'sakar_htar' ? [p1] : undefined,
    seatCapacity: gameType === 'sakar_htar' ? 6 : undefined,
  });

  res.json({ match: serializeMatchForViewer(match, user.id) });
});

app.post('/api/matches/:id/move', requireAuth, (req: AuthReq, res) => {
  const result = processMatchMove(String(req.params.id), req.authUser!.id, req.body || {});
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }
  const match = activeMatches.get(String(req.params.id));
  res.json({ ok: true, match: match ? serializeMatchForViewer(match, req.authUser!.id) : null });
});

// ─── PLAYER REPORTING & WARNING ACKNOWLEDGMENT ────────────────────────────────
app.post('/api/reports', requireAuth, (req: AuthReq, res) => {
  const reporter = req.authUser!;
  const matchId = sanitizeText(req.body?.matchId, 64);
  const reportedId = sanitizeText(req.body?.reportedId, 64);
  const category = String(req.body?.category || '') as ReportCategory;
  const notes = sanitizeText(req.body?.notes || '', 500);

  if (!matchId || !reportedId) {
    return res.status(400).json({ error: 'Match ID and reported player ID are required.' });
  }
  if (reportedId === reporter.id || reportedId.startsWith('bot_')) {
    return res.status(400).json({ error: 'Cannot file a report against yourself or a bot.' });
  }
  if (!['toxic_chat', 'cheating', 'afk_stalling', 'inappropriate_profile'].includes(category)) {
    return res.status(400).json({ error: 'Invalid report category.' });
  }

  let gameType: GameType = 'connect4';
  let reportedName = 'Unknown Player';
  let chatTranscript: ChatMessage[] = [];
  let moveHistory: MatchMoveLogEntry[] = [];

  const liveMatch = activeMatches.get(matchId);
  if (liveMatch) {
    const inMatch =
      liveMatch.player1.id === reporter.id ||
      liveMatch.player2.id === reporter.id ||
      Boolean(liveMatch.participants?.some((p) => p.id === reporter.id));
    if (!inMatch) {
      return res.status(403).json({ error: 'You are not a participant of this match.' });
    }
    gameType = liveMatch.gameType;
    const reportedPart =
      liveMatch.participants?.find((p) => p.id === reportedId) ||
      (liveMatch.player1.id === reportedId ? liveMatch.player1 : liveMatch.player2);
    reportedName = reportedPart.displayName;
    chatTranscript = [...(activeMatchChats.get(matchId) || [])];
    moveHistory = [...(liveMatch.moveLog || [])];
  } else {
    const dbMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as Record<string, unknown> | undefined;
    if (!dbMatch) {
      return res.status(404).json({ error: 'Match log not found.' });
    }
    if (String(dbMatch.player1_id) !== reporter.id && String(dbMatch.player2_id) !== reporter.id) {
      return res.status(403).json({ error: 'You are not a participant of this match.' });
    }
    gameType = String(dbMatch.game_type) as GameType;
    reportedName =
      String(dbMatch.player1_id) === reportedId ? String(dbMatch.player1_name) : String(dbMatch.player2_name);
    try {
      chatTranscript = JSON.parse(String(dbMatch.chat_transcript_json || '[]'));
    } catch {
      chatTranscript = [];
    }
    try {
      moveHistory = JSON.parse(String(dbMatch.move_history_json || '[]'));
    } catch {
      moveHistory = [];
    }
  }

  const reportId = `rep_${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO reports (id, match_id, game_type, reporter_id, reporter_name, reported_id, reported_name, category, notes, chat_transcript_json, move_history_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(
    reportId,
    matchId,
    gameType,
    reporter.id,
    reporter.displayName,
    reportedId,
    reportedName,
    category,
    notes,
    JSON.stringify(chatTranscript),
    JSON.stringify(moveHistory),
    now
  );

  // Notify online admins in real time
  const reports = getReportsList();
  for (const client of clientsBySocket.values()) {
    if (client.role === 'admin') {
      sendToSocket(client.ws, { type: 'reports:update', reports });
    }
  }

  res.json({ ok: true, reportId });
});

app.post('/api/warnings/:id/ack', requireAuth, (req: AuthReq, res) => {
  const warningId = String(req.params.id);
  db.prepare('UPDATE warnings SET acknowledged = 1 WHERE id = ? AND user_id = ?').run(warningId, req.authUser!.id);
  res.json({ ok: true });
});

// ─── TOURNAMENT PLAYER ROUTES ─────────────────────────────────────────────────
app.post('/api/tournaments/:id/join', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  if (isUserSuspended(user)) {
    return res.status(403).json({ error: `Your account is temporarily suspended until ${new Date(user.suspendedUntil!).toLocaleString()}.` });
  }
  const locks = getFeatureLocks();
  if (locks.tournaments) return res.status(423).json({ error: 'Tournaments are currently locked.' });

  const tId = String(req.params.id);
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tId) as Record<string, unknown> | undefined;
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  if (t.status !== 'registration') return res.status(400).json({ error: 'Registration is not open.' });

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM tournament_participants WHERE tournament_id = ?').get(tId) as { cnt: number };
  if (Number(countRow.cnt) >= Number(t.max_players)) {
    return res.status(400).json({ error: 'Tournament bracket is full.' });
  }

  db.prepare('INSERT OR IGNORE INTO tournament_participants (tournament_id, user_id, joined_at) VALUES (?, ?, ?)').run(
    tId,
    user.id,
    new Date().toISOString()
  );

  const tournaments = getTournaments();
  broadcastAll({ type: 'tournaments:update', tournaments });
  res.json({ tournaments });
});

app.post('/api/tournaments/:id/leave', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  const tId = String(req.params.id);
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tId) as Record<string, unknown> | undefined;
  if (!t || t.status !== 'registration') return res.status(400).json({ error: 'Cannot leave at this stage.' });

  db.prepare('DELETE FROM tournament_participants WHERE tournament_id = ? AND user_id = ?').run(tId, user.id);
  const tournaments = getTournaments();
  broadcastAll({ type: 'tournaments:update', tournaments });
  res.json({ tournaments });
});

app.post('/api/tournaments/:id/matches/:bmId/launch', requireAuth, (req: AuthReq, res) => {
  const user = req.authUser!;
  if (isUserSuspended(user)) {
    return res.status(403).json({ error: `Your account is temporarily suspended until ${new Date(user.suspendedUntil!).toLocaleString()}.` });
  }
  const tId = String(req.params.id);
  const bmId = String(req.params.bmId);
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tId) as Record<string, unknown> | undefined;
  if (!t || t.status !== 'live') return res.status(400).json({ error: 'Tournament is not live.' });

  const rounds: BracketMatch[][] = JSON.parse(String(t.rounds_json || '[]'));
  let targetBm: BracketMatch | null = null;
  for (const round of rounds) {
    for (const bm of round) {
      if (bm.id === bmId) targetBm = bm;
    }
  }
  if (!targetBm || !targetBm.player1 || !targetBm.player2) {
    return res.status(400).json({ error: 'Bracket match is not ready.' });
  }
  if (targetBm.player1.id !== user.id && targetBm.player2.id !== user.id) {
    return res.status(403).json({ error: 'You are not a participant in this bracket match.' });
  }
  if (targetBm.status === 'completed') {
    return res.status(400).json({ error: 'Match already completed.' });
  }
  if (targetBm.liveMatchId && activeMatches.has(targetBm.liveMatchId)) {
    const existing = activeMatches.get(targetBm.liveMatchId)!;
    return res.json({ match: serializeMatchForViewer(existing, user.id) });
  }

  const p1 = getUserById(targetBm.player1.id);
  const p2 = getUserById(targetBm.player2.id);
  if (!p1 || !p2) return res.status(400).json({ error: 'Players unavailable' });
  if (isUserSuspended(p1) || isUserSuspended(p2)) {
    return res.status(403).json({ error: 'One of the bracket participants is currently suspended.' });
  }

  const gameType = (targetBm.gameType || String(t.game_type)) as GameType;
  const bestOf = targetBm.bestOf === 3 || targetBm.bestOf === 5 ? targetBm.bestOf : 1;
  const turnTimeLimit = normalizeTurnTimeLimit(t.turn_time_limit, gameType);

  const match = startNewMatch({
    gameType,
    mode: 'tournament',
    bestOf: gameType === 'rps' ? bestOf : undefined,
    turnTimeLimit,
    player1: toParticipant(p1, getUserPingMs(p1.id)),
    player2: toParticipant(p2, getUserPingMs(p2.id)),
    tournamentId: tId,
    bracketMatchId: bmId,
  });

  targetBm.liveMatchId = match.id;
  targetBm.status = 'active';
  db.prepare('UPDATE tournaments SET rounds_json = ? WHERE id = ?').run(JSON.stringify(rounds), tId);
  broadcastAll({ type: 'tournaments:update', tournaments: getTournaments() });
  res.json({ match: serializeMatchForViewer(match, user.id) });
});

// ─── ISOLATED ADMIN CONTROL PANEL ROUTES ──────────────────────────────────────
app.get('/api/admin/overview', requireAdmin, (req: AuthReq, res) => {
  const userRows = db
    .prepare("SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];

  const usersWithTelemetry = userRows.map((r) => {
    const u = rowToUser(r);
    const set = socketsByUser.get(u.id);
    return {
      ...u,
      isOnline: Boolean(set && set.size > 0),
      deviceCount: set ? set.size : 0,
      pingMs: set && set.size > 0 ? getUserPingMs(u.id) : 0,
      inMatch: userActiveMatch.has(u.id),
    };
  });

  const onlineUserCount = usersWithTelemetry.filter((u) => u.isOnline).length;
  const totalQueue =
    Object.values(matchmakingQueues).reduce((sum, q) => sum + q.length, 0) + sakarQuickQueue.length;
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20').all() as Record<string, unknown>[];
  const reports = getReportsList();
  const pendingReports = reports.filter((r) => r.status === 'pending').length;

  res.json({
    telemetry: {
      totalUsers: usersWithTelemetry.length,
      onlineUsers: onlineUserCount,
      activeDevices: clientsBySocket.size,
      activeMatches: activeMatches.size,
      queueSize: totalQueue,
      pendingReports,
      serverUptimeSec: Math.floor(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      serverStatus: 'healthy',
    },
    adminPingMs: getUserPingMs(req.authUser!.id),
    users: usersWithTelemetry,
    frames: getFrames(false),
    featureLocks: getFeatureLocks(),
    matchmakingSettings: getMatchmakingSettings(),
    tournaments: getTournaments(),
    landingContent: getLandingContent(),
    reports,
    riddles: getRiddlePool(),
    announcements: announcements.map((a) => ({
      id: String(a.id),
      title: String(a.title),
      message: String(a.message),
      targetUserId: a.target_user_id ? String(a.target_user_id) : null,
      createdAt: String(a.created_at),
    })),
  });
});

app.get('/api/admin/matchmaking', requireAdmin, (_req, res) => {
  res.json({ matchmakingSettings: getMatchmakingSettings() });
});

app.post('/api/admin/matchmaking', requireAdmin, (req, res) => {
  const next = saveMatchmakingSettings({
    maxSearchSeconds: req.body?.maxSearchSeconds,
    botFillDelaySeconds: req.body?.botFillDelaySeconds,
    autoBotFillDefault: req.body?.autoBotFillDefault,
  });
  broadcastAll({ type: 'matchmaking:settings', matchmakingSettings: next });
  res.json({ matchmakingSettings: next });
});

// ─── ADMIN RIDDLE BANK CRUD (စကားထာ) ────────────────────────────────────────
app.post('/api/admin/riddles', requireAdmin, (req, res) => {
  const questionMy = sanitizeText(req.body?.questionMy, 280);
  const hintEn = sanitizeText(req.body?.hintEn || '', 200);
  const rawOptions = Array.isArray(req.body?.options) ? req.body.options : [];
  const options = rawOptions.map((o: unknown) => sanitizeText(o, 120)).filter(Boolean);
  const ci = Number(req.body?.correctIndex);
  const correctIndex: 0 | 1 | 2 | 3 = ci === 1 || ci === 2 || ci === 3 ? ci : 0;
  const explanationMy = sanitizeText(req.body?.explanationMy || '', 260);
  const explanationEn = sanitizeText(req.body?.explanationEn || '', 260);

  if (!questionMy || options.length !== 4) {
    return res.status(400).json({ error: 'Riddle question and exactly 4 answer options are required.' });
  }

  const id = `riddle_${crypto.randomUUID().slice(0, 10)}`;
  db.prepare(
    `INSERT INTO sakar_riddles (id, question_my, hint_en, options_json, correct_index, explanation_my, explanation_en, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    questionMy,
    hintEn,
    JSON.stringify(options),
    correctIndex,
    explanationMy,
    explanationEn,
    new Date().toISOString()
  );

  res.json({ riddles: getRiddlePool(), createdId: id });
});

app.put('/api/admin/riddles/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  const existing = db.prepare('SELECT id FROM sakar_riddles WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Riddle not found.' });

  const questionMy = sanitizeText(req.body?.questionMy, 280);
  const hintEn = sanitizeText(req.body?.hintEn || '', 200);
  const rawOptions = Array.isArray(req.body?.options) ? req.body.options : [];
  const options = rawOptions.map((o: unknown) => sanitizeText(o, 120)).filter(Boolean);
  const ci = Number(req.body?.correctIndex);
  const correctIndex: 0 | 1 | 2 | 3 = ci === 1 || ci === 2 || ci === 3 ? ci : 0;
  const explanationMy = sanitizeText(req.body?.explanationMy || '', 260);
  const explanationEn = sanitizeText(req.body?.explanationEn || '', 260);

  if (!questionMy || options.length !== 4) {
    return res.status(400).json({ error: 'Riddle question and exactly 4 answer options are required.' });
  }

  db.prepare(
    `UPDATE sakar_riddles
     SET question_my = ?, hint_en = ?, options_json = ?, correct_index = ?, explanation_my = ?, explanation_en = ?
     WHERE id = ?`
  ).run(questionMy, hintEn, JSON.stringify(options), correctIndex, explanationMy, explanationEn, id);

  res.json({ riddles: getRiddlePool() });
});

app.delete('/api/admin/riddles/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM sakar_riddles').get() as { cnt: number };
  if (Number(countRow.cnt) <= 10) {
    return res.status(400).json({ error: 'At least 10 riddles must remain in the Sakar-Htar bank.' });
  }
  db.prepare('DELETE FROM sakar_riddles WHERE id = ?').run(id);
  res.json({ riddles: getRiddlePool() });
});

function saveCmsImageIfDataUrl(raw: unknown, prefix: string, fallbackUrl: string): string {
  if (typeof raw !== 'string' || !raw.trim()) return fallbackUrl;
  const match = raw.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (match) {
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buf = Buffer.from(match[2], 'base64');
    if (buf.length <= 3 * 1024 * 1024) {
      const fname = `cms_${prefix}_${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, fname), buf);
      return `/uploads/${fname}`;
    }
  }
  if (raw.startsWith('/uploads/') || raw.startsWith('/src/assets/')) {
    return raw;
  }
  return fallbackUrl;
}

app.post('/api/admin/landing', requireAdmin, (req, res) => {
  const current = getLandingContent();
  const body = (req.body || {}) as Record<string, unknown>;
  const incomingGames = (body.games || {}) as Record<string, Record<string, unknown>>;

  const next: LandingContent = {
    heroTitleEn: sanitizeText(body.heroTitleEn, 120) || current.heroTitleEn,
    heroTitleMy: sanitizeText(body.heroTitleMy, 160) || current.heroTitleMy,
    heroSubtitleEn: sanitizeText(body.heroSubtitleEn, 360) || current.heroSubtitleEn,
    heroSubtitleMy: sanitizeText(body.heroSubtitleMy, 420) || current.heroSubtitleMy,
    heroBannerUrl: saveCmsImageIfDataUrl(body.heroBannerUrl, 'hero', current.heroBannerUrl),
    games: {
      connect4: {
        nameEn: sanitizeText(incomingGames.connect4?.nameEn, 60) || current.games.connect4.nameEn,
        nameMy: sanitizeText(incomingGames.connect4?.nameMy, 80) || current.games.connect4.nameMy,
        taglineEn: sanitizeText(incomingGames.connect4?.taglineEn, 200) || current.games.connect4.taglineEn,
        taglineMy: sanitizeText(incomingGames.connect4?.taglineMy, 240) || current.games.connect4.taglineMy,
        bannerUrl: saveCmsImageIfDataUrl(incomingGames.connect4?.bannerUrl, 'connect4', current.games.connect4.bannerUrl),
      },
      ttt: {
        nameEn: sanitizeText(incomingGames.ttt?.nameEn, 60) || current.games.ttt.nameEn,
        nameMy: sanitizeText(incomingGames.ttt?.nameMy, 80) || current.games.ttt.nameMy,
        taglineEn: sanitizeText(incomingGames.ttt?.taglineEn, 200) || current.games.ttt.taglineEn,
        taglineMy: sanitizeText(incomingGames.ttt?.taglineMy, 240) || current.games.ttt.taglineMy,
        bannerUrl: saveCmsImageIfDataUrl(incomingGames.ttt?.bannerUrl, 'ttt', current.games.ttt.bannerUrl),
      },
      rps: {
        nameEn: sanitizeText(incomingGames.rps?.nameEn, 60) || current.games.rps.nameEn,
        nameMy: sanitizeText(incomingGames.rps?.nameMy, 80) || current.games.rps.nameMy,
        taglineEn: sanitizeText(incomingGames.rps?.taglineEn, 200) || current.games.rps.taglineEn,
        taglineMy: sanitizeText(incomingGames.rps?.taglineMy, 240) || current.games.rps.taglineMy,
        bannerUrl: saveCmsImageIfDataUrl(incomingGames.rps?.bannerUrl, 'rps', current.games.rps.bannerUrl),
      },
      sakar_htar: {
        nameEn: sanitizeText(incomingGames.sakar_htar?.nameEn, 60) || current.games.sakar_htar.nameEn,
        nameMy: sanitizeText(incomingGames.sakar_htar?.nameMy, 80) || current.games.sakar_htar.nameMy,
        taglineEn: sanitizeText(incomingGames.sakar_htar?.taglineEn, 200) || current.games.sakar_htar.taglineEn,
        taglineMy: sanitizeText(incomingGames.sakar_htar?.taglineMy, 240) || current.games.sakar_htar.taglineMy,
        bannerUrl: saveCmsImageIfDataUrl(incomingGames.sakar_htar?.bannerUrl, 'sakar_htar', current.games.sakar_htar.bannerUrl),
      },
    },
    updatedAt: new Date().toISOString(),
  };

  db.prepare(
    'INSERT OR REPLACE INTO landing_content (id, content_json, updated_at) VALUES (?, ?, ?)'
  ).run('default', JSON.stringify(next), next.updatedAt);

  broadcastAll({ type: 'landing:update', landingContent: next });
  res.json({ landingContent: next });
});

function removeUserFromQueues(userId: string) {
  for (const gt of ['connect4', 'ttt', 'rps', 'sakar_htar'] as GameType[]) {
    matchmakingQueues[gt] = matchmakingQueues[gt].filter((item) => item.userId !== userId);
  }
  const sqIdx = sakarQuickQueue.findIndex((item) => item.userId === userId);
  if (sqIdx !== -1) {
    sakarQuickQueue.splice(sqIdx, 1);
    broadcastSakarQueueCount();
  }
}

function kickUserActiveSession(targetId: string, reason: string) {
  removeUserFromQueues(targetId);
  const activeMid = userActiveMatch.get(targetId);
  if (activeMid) {
    const m = activeMatches.get(activeMid);
    if (m && m.status === 'active') {
      if (m.mode === 'bot') {
        clearMatchTimers(m.id);
        activeMatches.delete(m.id);
        activeMatchChats.delete(m.id);
        userActiveMatch.delete(targetId);
      } else {
        const oppId = m.player1.id === targetId ? m.player2.id : m.player1.id;
        finalizeMatch(m, oppId, false);
      }
    }
  }
  const set = socketsByUser.get(targetId);
  if (set) {
    for (const client of set) {
      sendToSocket(client.ws, { type: 'kicked', reason });
      client.ws.close(4001, 'Kicked by administrator');
    }
  }
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
  schedulePresenceBroadcast();
}

function applyModerationAction(params: {
  targetId: string;
  action: 'warn' | 'kick' | 'suspend' | 'unsuspend' | 'ban' | 'unban';
  durationHours?: number;
  reason?: string;
  reportId?: string | null;
}): { ok: boolean; error?: string; label: string } {
  const { targetId, action, durationHours, reason, reportId } = params;
  const user = getUserById(targetId);
  if (!user) return { ok: false, error: 'User not found', label: '' };
  if (user.role === 'admin') return { ok: false, error: 'Cannot moderate administrator', label: '' };

  if (action === 'warn') {
    const warnId = `warn_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    const msg = sanitizeText(reason || 'Official conduct warning issued by Arena Moderation.', 300);
    db.prepare('INSERT INTO warnings (id, user_id, report_id, reason, acknowledged, created_at) VALUES (?, ?, ?, ?, 0, ?)').run(
      warnId,
      targetId,
      reportId || null,
      msg,
      now
    );
    db.prepare('UPDATE users SET warning_count = warning_count + 1 WHERE id = ?').run(targetId);
    const updated = getUserById(targetId);
    const warning: OfficialWarning = {
      id: warnId,
      userId: targetId,
      reportId: reportId || null,
      reason: msg,
      acknowledged: false,
      createdAt: now,
    };
    sendToUser(targetId, { type: 'warning:official', warning });
    if (updated) sendToUser(targetId, { type: 'user:update', user: updated });
    return { ok: true, label: 'Official Warning Sent' };
  }

  if (action === 'kick') {
    kickUserActiveSession(targetId, sanitizeText(reason || 'Your session was disconnected by an administrator.', 240));
    return { ok: true, label: 'Kicked from Session' };
  }

  if (action === 'suspend') {
    const allowedHours = [1, 6, 24, 72, 168];
    const hrs = allowedHours.includes(Number(durationHours)) ? Number(durationHours) : 1;
    const until = new Date(Date.now() + hrs * 3600_000).toISOString();
    db.prepare('UPDATE users SET suspended_until = ? WHERE id = ?').run(until, targetId);
    removeUserFromQueues(targetId);
    const updated = getUserById(targetId);
    if (updated) {
      sendToUser(targetId, { type: 'user:update', user: updated });
      sendToUser(targetId, {
        type: 'toast',
        level: 'error',
        message: `You have been suspended from matchmaking and tournaments for ${hrs}h.`,
      });
    }
    schedulePresenceBroadcast();
    return { ok: true, label: `Suspended (${hrs}h)` };
  }

  if (action === 'unsuspend') {
    db.prepare('UPDATE users SET suspended_until = NULL WHERE id = ?').run(targetId);
    const updated = getUserById(targetId);
    if (updated) sendToUser(targetId, { type: 'user:update', user: updated });
    return { ok: true, label: 'Suspension Lifted' };
  }

  if (action === 'ban') {
    db.prepare('UPDATE users SET is_banned = 1 WHERE id = ?').run(targetId);
    kickUserActiveSession(targetId, 'Your account has been permanently banned by an administrator.');
    return { ok: true, label: 'Permanently Banned' };
  }

  if (action === 'unban') {
    db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(targetId);
    return { ok: true, label: 'Unbanned' };
  }

  return { ok: false, error: 'Unsupported moderation action', label: '' };
}

app.post('/api/admin/users/:id/moderate', requireAdmin, (req, res) => {
  const targetId = String(req.params.id);
  const action = String(req.body?.action || '') as 'warn' | 'kick' | 'suspend' | 'unsuspend' | 'ban' | 'unban';
  const durationHours = req.body?.durationHours !== undefined ? Number(req.body.durationHours) : undefined;
  const reason = sanitizeText(req.body?.reason || '', 300);

  const result = applyModerationAction({ targetId, action, durationHours, reason });
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ ok: true, actionTaken: result.label });
});

app.post('/api/admin/reports/:id/action', requireAdmin, (req, res) => {
  const reportId = String(req.params.id);
  const rep = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as Record<string, unknown> | undefined;
  if (!rep) return res.status(404).json({ error: 'Report not found.' });

  const action = String(req.body?.action || '') as 'warn' | 'kick' | 'suspend' | 'ban' | 'dismiss';
  const durationHours = req.body?.durationHours !== undefined ? Number(req.body.durationHours) : undefined;
  const adminNotes = sanitizeText(req.body?.adminNotes || '', 300);

  let actionLabel = 'Dismissed';
  if (action !== 'dismiss') {
    const result = applyModerationAction({
      targetId: String(rep.reported_id),
      action,
      durationHours,
      reason: adminNotes || `Violation of Arena Fair Play rules (${String(rep.category)}).`,
      reportId,
    });
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    actionLabel = result.label;
  }

  db.prepare(
    "UPDATE reports SET status = 'resolved', action_taken = ?, admin_notes = ?, resolved_at = ? WHERE id = ?"
  ).run(actionLabel, adminNotes || null, new Date().toISOString(), reportId);

  const reports = getReportsList();
  for (const client of clientsBySocket.values()) {
    if (client.role === 'admin') {
      sendToSocket(client.ws, { type: 'reports:update', reports });
    }
  }
  res.json({ ok: true, reports });
});

app.post('/api/admin/users/:id/kick', requireAdmin, (req, res) => {
  const targetId = String(req.params.id);
  kickUserActiveSession(targetId, 'Your session was disconnected by an administrator.');
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/ban', requireAdmin, (req, res) => {
  const targetId = String(req.params.id);
  const banned = Boolean(req.body?.banned);
  applyModerationAction({ targetId, action: banned ? 'ban' : 'unban' });
  res.json({ ok: true });
});

app.post('/api/admin/locks', requireAdmin, (req, res) => {
  const key = String(req.body?.key || '');
  const locked = Boolean(req.body?.locked);
  if (!['connect4', 'ttt', 'rps', 'sakar_htar', 'matchmaking', 'chat', 'tournaments'].includes(key)) {
    return res.status(400).json({ error: 'Invalid lock key' });
  }
  db.prepare('UPDATE feature_locks SET locked = ?, updated_at = ? WHERE key = ?').run(
    locked ? 1 : 0,
    new Date().toISOString(),
    key
  );
  const featureLocks = getFeatureLocks();
  broadcastAll({ type: 'locks:update', featureLocks });
  res.json({ featureLocks });
});

app.post('/api/admin/broadcast', requireAdmin, (req, res) => {
  const title = sanitizeText(req.body?.title, 80);
  const message = sanitizeText(req.body?.message, 320);
  const targetUserId = req.body?.targetUserId ? String(req.body.targetUserId) : null;

  if (!title || !message) return res.status(400).json({ error: 'Title and message are required.' });

  const announcement: Announcement = {
    id: `ann_${crypto.randomUUID().slice(0, 10)}`,
    title,
    message,
    targetUserId,
    createdAt: new Date().toISOString(),
  };

  db.prepare('INSERT INTO announcements (id, title, message, target_user_id, created_at) VALUES (?, ?, ?, ?, ?)').run(
    announcement.id,
    announcement.title,
    announcement.message,
    announcement.targetUserId,
    announcement.createdAt
  );

  if (targetUserId) {
    sendToUser(targetUserId, { type: 'announcement', announcement });
  } else {
    broadcastAll({ type: 'announcement', announcement });
  }
  res.json({ announcement });
});

app.post('/api/admin/frames', requireAdmin, (req, res) => {
  const name = sanitizeText(req.body?.name, 64);
  const description = sanitizeText(req.body?.description || 'Custom decorative frame', 160);
  const unlockTier = sanitizeText(req.body?.unlockTier || 'All', 24);
  const rawImage = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : '';

  if (!name || !rawImage) return res.status(400).json({ error: 'Frame name and PNG image are required.' });

  let imageUrl = rawImage;
  const pngMatch = rawImage.match(/^data:image\/(png|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/);
  if (pngMatch) {
    const ext = pngMatch[1] === 'svg+xml' ? 'svg' : pngMatch[1];
    const buf = Buffer.from(pngMatch[2], 'base64');
    if (buf.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'Frame PNG must be under 2 MB.' });
    const fname = `frame_${Date.now()}_${crypto.randomInt(100, 999)}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, fname), buf);
    imageUrl = `/uploads/${fname}`;
  } else if (!rawImage.startsWith('data:image/svg+xml') && !rawImage.startsWith('/uploads/')) {
    return res.status(400).json({ error: 'Frame must be a PNG or SVG image.' });
  }

  const id = `frame_${crypto.randomUUID().slice(0, 10)}`;
  db.prepare(
    'INSERT INTO frames (id, name, description, image_url, unlock_tier, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  ).run(id, name, description, imageUrl, unlockTier, new Date().toISOString());

  const activeFrames = getFrames(true);
  broadcastAll({ type: 'frames:update', frames: activeFrames });
  res.json({ frames: getFrames(false) });
});

app.patch('/api/admin/frames/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  const name = sanitizeText(req.body?.name, 64);
  const description = sanitizeText(req.body?.description, 160);
  const unlockTier = sanitizeText(req.body?.unlockTier, 24);
  const isActive = req.body?.isActive !== undefined ? (req.body.isActive ? 1 : 0) : 1;

  if (name) {
    db.prepare('UPDATE frames SET name = ?, description = ?, unlock_tier = ?, is_active = ? WHERE id = ?').run(
      name,
      description,
      unlockTier || 'All',
      isActive,
      id
    );
  } else {
    db.prepare('UPDATE frames SET is_active = ? WHERE id = ?').run(isActive, id);
  }

  broadcastAll({ type: 'frames:update', frames: getFrames(true) });
  res.json({ frames: getFrames(false) });
});

app.delete('/api/admin/frames/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  if (id === 'frame_none') return res.status(400).json({ error: 'Cannot delete base frame.' });
  db.prepare("UPDATE users SET frame_id = 'frame_none' WHERE frame_id = ?").run(id);
  db.prepare('DELETE FROM frames WHERE id = ?').run(id);
  broadcastAll({ type: 'frames:update', frames: getFrames(true) });
  res.json({ frames: getFrames(false) });
});

function launchTournamentBracket(id: string): { ok: boolean; error?: string } {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!t) return { ok: false, error: 'Tournament not found' };
  if (t.status === 'live' || t.status === 'completed') return { ok: false, error: 'Tournament already started' };

  const partRows = db
    .prepare(
      `SELECT u.* FROM tournament_participants tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.tournament_id = ?
       ORDER BY u.xp DESC`
    )
    .all(id) as Record<string, unknown>[];

  const players = partRows.map((r) => toParticipant(rowToUser(r)));
  if (players.length < 2) {
    return { ok: false, error: 'At least 2 registered players are required to generate a bracket.' };
  }

  const primaryGame = String(t.game_type) as GameType;
  let includedGames: GameType[] = [primaryGame];
  try {
    const parsed = JSON.parse(String(t.included_games_json || '[]'));
    if (Array.isArray(parsed) && parsed.length > 0) {
      includedGames = parsed.filter(
        (g): g is GameType => g === 'connect4' || g === 'ttt' || g === 'rps' || g === 'sakar_htar'
      );
    }
  } catch {
    includedGames = [primaryGame];
  }
  if (includedGames.length === 0) includedGames = [primaryGame];

  const rpm = Number(t.rounds_per_match || 1);
  const bestOf: 1 | 3 | 5 = rpm === 3 || rpm === 5 ? rpm : 1;

  // Determine exact power-of-2 bracket size (2 for 2 players, else 4, 8, 16, 32, or 64)
  let bracketSize = 2;
  if (players.length > 2) bracketSize = 4;
  if (players.length > 4) bracketSize = 8;
  if (players.length > 8) bracketSize = 16;
  if (players.length > 16) bracketSize = 32;
  if (players.length > 32) bracketSize = 64;

  const totalRounds = Math.log2(bracketSize);
  const rounds: BracketMatch[][] = [];
  const half = bracketSize / 2;

  // Distribute seeds so every Round 1 slot has at least player1 (avoiding empty-vs-empty dead matches)
  const round1Game = includedGames[0];
  const round1: BracketMatch[] = [];
  for (let i = 0; i < half; i++) {
    const p1 = players[i] || null;
    const p2 = players[half + i] || null;
    let status: BracketMatch['status'] = 'pending';
    let winnerId: string | null = null;
    if (p1 && p2) {
      status = 'ready';
    } else if (p1 && !p2) {
      status = 'completed';
      winnerId = p1.id;
    }
    round1.push({
      id: `bm_${crypto.randomUUID().slice(0, 8)}`,
      round: 1,
      matchIndex: i,
      gameType: round1Game,
      player1: p1,
      player2: p2,
      p1Score: 0,
      p2Score: 0,
      bestOf,
      winnerId,
      liveMatchId: null,
      status,
    });
  }
  rounds.push(round1);

  for (let r = 2; r <= totalRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r);
    const roundGame = includedGames[(r - 1) % includedGames.length];
    const roundList: BracketMatch[] = [];
    for (let i = 0; i < matchCount; i++) {
      roundList.push({
        id: `bm_${crypto.randomUUID().slice(0, 8)}`,
        round: r,
        matchIndex: i,
        gameType: roundGame,
        player1: null,
        player2: null,
        p1Score: 0,
        p2Score: 0,
        bestOf,
        winnerId: null,
        liveMatchId: null,
        status: 'pending',
      });
    }
    rounds.push(roundList);
  }

  // Propagate Round 1 byes into Round 2
  if (rounds.length > 1) {
    for (let i = 0; i < rounds[0].length; i++) {
      const bm = rounds[0][i];
      if (bm.status === 'completed' && bm.winnerId && bm.player1) {
        const nextBm = rounds[1][Math.floor(i / 2)];
        if (i % 2 === 0) nextBm.player1 = bm.player1;
        else nextBm.player2 = bm.player1;
        if (nextBm.player1 && nextBm.player2) nextBm.status = 'ready';
      }
    }
  }

  db.prepare("UPDATE tournaments SET status = 'live', rounds_json = ?, champion_id = NULL WHERE id = ?").run(
    JSON.stringify(rounds),
    id
  );

  const tournaments = getTournaments();
  broadcastAll({ type: 'tournaments:update', tournaments });
  return { ok: true };
}

app.post('/api/admin/tournaments', requireAdmin, (req, res) => {
  const title = sanitizeText(req.body?.title, 80);
  const rawIncluded = Array.isArray(req.body?.includedGames) ? req.body.includedGames : [req.body?.gameType || 'connect4'];
  const includedGames = rawIncluded.filter(
    (g: unknown): g is GameType => g === 'connect4' || g === 'ttt' || g === 'rps' || g === 'sakar_htar'
  );
  const gameType = includedGames[0] || ('connect4' as GameType);

  const maxPlayers = [4, 8, 16, 32, 64].includes(Number(req.body?.maxPlayers)) ? Number(req.body.maxPlayers) : 8;
  const roundsPerMatch = [1, 3, 5].includes(Number(req.body?.roundsPerMatch)) ? Number(req.body.roundsPerMatch) : 1;
  const turnTimeLimit = normalizeTurnTimeLimit(req.body?.turnTimeLimit, gameType);
  const startMode = req.body?.startMode === 'auto' ? 'auto' : 'manual';
  const startTimeRaw = sanitizeText(req.body?.startTime || new Date(Date.now() + 3600_000).toISOString(), 64);
  const startDateMs = Date.parse(startTimeRaw);
  const startTime = Number.isFinite(startDateMs) ? new Date(startDateMs).toISOString() : new Date(Date.now() + 3600_000).toISOString();
  const openNow = Boolean(req.body?.openRegistration);

  if (!title || includedGames.length === 0) {
    return res.status(400).json({ error: 'Valid tournament title and at least one game are required.' });
  }

  const id = `tour_${crypto.randomUUID().slice(0, 10)}`;
  db.prepare(
    `INSERT INTO tournaments (id, title, game_type, max_players, status, start_time, rounds_json, champion_id, created_at, start_mode, rounds_per_match, turn_time_limit, included_games_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title,
    gameType,
    maxPlayers,
    openNow ? 'registration' : 'draft',
    startTime,
    '[]',
    new Date().toISOString(),
    startMode,
    roundsPerMatch,
    turnTimeLimit,
    JSON.stringify(includedGames)
  );

  const tournaments = getTournaments();
  broadcastAll({ type: 'tournaments:update', tournaments });
  res.json({ tournaments });
});

app.post('/api/admin/tournaments/:id/status', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  const status = String(req.body?.status || '');
  if (!['draft', 'registration', 'live', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run(status, id);
  const tournaments = getTournaments();
  broadcastAll({ type: 'tournaments:update', tournaments });
  res.json({ tournaments });
});

app.post('/api/admin/tournaments/:id/start', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  const result = launchTournamentBracket(id);
  if (!result.ok) {
    return res.status(400).json({ error: result.error || 'Failed to launch tournament.' });
  }
  res.json({ tournaments: getTournaments() });
});

app.delete('/api/admin/tournaments/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  db.prepare('DELETE FROM tournament_participants WHERE tournament_id = ?').run(id);
  db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
  const tournaments = getTournaments();
  broadcastAll({ type: 'tournaments:update', tournaments });
  res.json({ tournaments });
});

// Auto-Start Tournament Scheduler (checks every 2 seconds)
setInterval(() => {
  const rows = db
    .prepare("SELECT id, start_time FROM tournaments WHERE status = 'registration' AND start_mode = 'auto'")
    .all() as { id: string; start_time: string }[];
  const now = Date.now();
  for (const r of rows) {
    const startTs = Date.parse(r.start_time);
    if (Number.isFinite(startTs) && startTs <= now) {
      const cntRow = db
        .prepare('SELECT COUNT(*) as cnt FROM tournament_participants WHERE tournament_id = ?')
        .get(r.id) as { cnt: number };
      if (Number(cntRow.cnt) >= 2) {
        launchTournamentBracket(r.id);
      }
    }
  }
}, 2000);

// ─── HTTP + WEBSOCKET SERVER + VITE ───────────────────────────────────────────
async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/ws', 'http://localhost');
    const token = url.searchParams.get('token') || undefined;
    const session = getAuthSession(token);
    if (!session) {
      sendToSocket(ws, { type: 'auth:error', error: 'Invalid session' });
      ws.close(4001, 'Unauthorized');
      return;
    }

    const { user } = session;
    const client: SocketClient = {
      ws,
      userId: user.id,
      role: user.role === 'admin' ? 'admin' : 'user',
      inPlayLobby: false,
      token: session.token,
      pingMs: 22,
      lastPingSent: Date.now(),
      deviceId: crypto.randomUUID().slice(0, 8),
    };

    clientsBySocket.set(ws, client);
    let userSet = socketsByUser.get(user.id);
    if (!userSet) {
      userSet = new Set();
      socketsByUser.set(user.id, userSet);
    }
    userSet.add(client);

    // Check if user reconnected within 30s disconnect grace window
    const activeMatchId = userActiveMatch.get(user.id);
    if (activeMatchId) {
      const match = activeMatches.get(activeMatchId);
      if (match && match.status === 'active') {
        const graceKey = `${match.id}:${user.id}`;
        const existingGrace = graceTimers.get(graceKey);
        if (existingGrace) {
          clearTimeout(existingGrace);
          graceTimers.delete(graceKey);
        }
        if (match.disconnectedPlayerId === user.id) {
          match.disconnectedPlayerId = null;
          match.graceDeadline = null;
          emitMatchState(match);
        } else {
          sendToSocket(ws, { type: 'match:state', match: serializeMatchForViewer(match, user.id) });
        }
      }
    }

    // Initial state sync
    sendToSocket(ws, {
      type: 'init',
      user,
      featureLocks: getFeatureLocks(),
      matchmakingSettings: getMatchmakingSettings(),
      frames: getFrames(true),
      onlinePlayers: getOnlinePlayersList(),
      activeDevices: clientsBySocket.size,
      leaderboard: getLeaderboard(50),
      tournaments: getTournaments(),
      landingContent: getLandingContent(),
      warnings: getPendingWarningsForUser(user.id),
      openRooms: getOpenCustomRoomsList(),
      sakarQueueCount: sakarQuickQueue.length,
    });

    schedulePresenceBroadcast();

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === 'pong') {
        const sentAt = Number(msg.ts || client.lastPingSent);
        const rtt = Math.max(1, Math.min(999, Date.now() - sentAt));
        client.pingMs = rtt;
        sendToSocket(ws, { type: 'ping:ack', pingMs: rtt });
        return;
      }

      if (msg.type === 'ping:client') {
        sendToSocket(ws, { type: 'pong:server', ts: msg.ts });
        return;
      }

      if (msg.type === 'admin:mode' && user.role === 'admin') {
        client.inPlayLobby = msg.mode === 'lobby';
        schedulePresenceBroadcast();
        return;
      }

      if (msg.type === 'queue:join') {
        const freshUser = getUserById(user.id) || user;
        if (isUserSuspended(freshUser)) {
          sendToSocket(ws, {
            type: 'toast',
            level: 'error',
            message: `Matchmaking blocked: suspended until ${new Date(freshUser.suspendedUntil!).toLocaleString()}.`,
          });
          return;
        }
        const gameType = String(msg.gameType || '') as GameType;
        const turnTimeLimit = normalizeTurnTimeLimit(msg.turnTimeLimit, gameType);
        const settings = getMatchmakingSettings();
        const autoBotFill =
          msg.autoBotFill === undefined ? settings.autoBotFillDefault : Boolean(msg.autoBotFill);
        const locks = getFeatureLocks();
        if (locks.matchmaking || locks[gameType]) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Matchmaking or game is currently locked.' });
          return;
        }
        if (userActiveMatch.has(user.id)) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Finish your current match first.' });
          return;
        }
        removeUserFromQueues(user.id);
        const joinedAt = Date.now();
        if (gameType === 'sakar_htar') {
          const entry: QueuedEntry = { userId: user.id, xp: freshUser.xp, autoBotFill, joinedAt };
          sakarQuickQueue.push(entry);
          broadcastSakarQueueCount();
          sendQueueTick(entry, 'sakar_htar', sakarQuickQueue.length, settings);
          schedulePresenceBroadcast();
          if (sakarQuickQueue.length >= 6) {
            launchSakarQuickMatchNow(false);
          }
          return;
        }
        if (['connect4', 'ttt', 'rps'].includes(gameType)) {
          const entry: QueuedEntry = { userId: user.id, xp: freshUser.xp, turnTimeLimit, autoBotFill, joinedAt };
          matchmakingQueues[gameType].push(entry);
          sendQueueTick(entry, gameType, matchmakingQueues[gameType].length, settings);
          schedulePresenceBroadcast();
          tryMatchmaking(gameType);
        }
        return;
      }

      if (msg.type === 'queue:leave') {
        removeUserFromQueues(user.id);
        sendToUser(user.id, { type: 'sakar:queue', count: 0 });
        sendToUser(user.id, { type: 'queue:cancelled' });
        schedulePresenceBroadcast();
        return;
      }

      if (msg.type === 'sakar:quick:join') {
        const freshUser = getUserById(user.id) || user;
        if (isUserSuspended(freshUser)) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Play access suspended.' });
          return;
        }
        const locks = getFeatureLocks();
        if (locks.sakar_htar || locks.matchmaking) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Sakar-Htar matchmaking is locked.' });
          return;
        }
        if (userActiveMatch.has(user.id)) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Finish your current match first.' });
          return;
        }
        removeUserFromQueues(user.id);
        const settings = getMatchmakingSettings();
        const autoBotFill =
          msg.autoBotFill === undefined ? settings.autoBotFillDefault : Boolean(msg.autoBotFill);
        const entry: QueuedEntry = {
          userId: user.id,
          xp: freshUser.xp,
          autoBotFill,
          joinedAt: Date.now(),
        };
        sakarQuickQueue.push(entry);
        broadcastSakarQueueCount();
        sendQueueTick(entry, 'sakar_htar', sakarQuickQueue.length, settings);
        schedulePresenceBroadcast();
        if (sakarQuickQueue.length >= 6) {
          launchSakarQuickMatchNow(false);
        }
        return;
      }

      if (msg.type === 'sakar:quick:leave') {
        removeUserFromQueues(user.id);
        sendToUser(user.id, { type: 'sakar:queue', count: 0 });
        sendToUser(user.id, { type: 'queue:cancelled' });
        schedulePresenceBroadcast();
        return;
      }

      if (msg.type === 'sakar:quick:start_now') {
        const entry = sakarQuickQueue.find((i) => i.userId === user.id);
        if (entry) {
          launchSakarQuickMatchNow(entry.autoBotFill);
        }
        return;
      }

      if (msg.type === 'room:chat') {
        const locks = getFeatureLocks();
        if (locks.chat) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Chat is locked by an administrator.' });
          return;
        }
        const roomId = String(msg.roomId || '');
        const room = customRooms.get(roomId);
        if (!room || !room.participants.some((p) => p.id === user.id)) return;
        const content = sanitizeText(msg.content, 240);
        if (!content) return;
        const chatMsg: CustomRoomChatMessage = {
          id: `rc_${crypto.randomUUID().slice(0, 10)}`,
          roomId,
          senderId: user.id,
          senderName: user.displayName,
          content,
          createdAt: new Date().toISOString(),
        };
        const list = customRoomChats.get(roomId) || [];
        list.push(chatMsg);
        customRoomChats.set(roomId, list.slice(-80));
        for (const p of room.participants) {
          sendToUser(p.id, { type: 'room:chat', roomId, message: chatMsg });
        }
        return;
      }

      if (msg.type === 'challenge:send') {
        const freshUser = getUserById(user.id) || user;
        if (isUserSuspended(freshUser)) {
          sendToSocket(ws, {
            type: 'toast',
            level: 'error',
            message: `Challenges blocked: suspended until ${new Date(freshUser.suspendedUntil!).toLocaleString()}.`,
          });
          return;
        }
        const targetId = String(msg.targetUserId || '');
        const gameType = String(msg.gameType || '') as GameType;
        const bestOf: 1 | 3 | 5 = msg.bestOf === 5 ? 5 : msg.bestOf === 1 ? 1 : 3;
        const turnTimeLimit = normalizeTurnTimeLimit(msg.turnTimeLimit, gameType);
        const locks = getFeatureLocks();
        if (locks[gameType]) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'This game is currently in maintenance mode.' });
          return;
        }
        if (!socketsByUser.has(targetId)) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Player is currently offline.' });
          return;
        }
        if (userActiveMatch.has(targetId)) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Player is currently in another match.' });
          return;
        }
        const targetUser = getUserById(targetId);
        if (isUserSuspended(targetUser)) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Target player is currently suspended from play.' });
          return;
        }
        const blocked = db
          .prepare(
            "SELECT id FROM friendships WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)) AND status = 'blocked'"
          )
          .get(user.id, targetId, targetId, user.id);
        if (blocked) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Cannot challenge this player.' });
          return;
        }

        const inviteId = `inv_${crypto.randomUUID().slice(0, 10)}`;
        pendingChallenges.set(inviteId, {
          id: inviteId,
          fromId: user.id,
          toId: targetId,
          gameType,
          bestOf,
          turnTimeLimit,
          createdAt: Date.now(),
        });
        sendToUser(targetId, {
          type: 'challenge:received',
          invite: {
            id: inviteId,
            from: toParticipant(freshUser, getUserPingMs(user.id)),
            gameType,
            bestOf,
            turnTimeLimit,
            createdAt: Date.now(),
          },
        });
        return;
      }

      if (msg.type === 'challenge:respond') {
        const inviteId = String(msg.inviteId || '');
        const accept = Boolean(msg.accept);
        const invite = pendingChallenges.get(inviteId);
        if (!invite || invite.toId !== user.id) return;
        pendingChallenges.delete(inviteId);

        if (!accept) {
          sendToUser(invite.fromId, { type: 'toast', level: 'info', message: `${user.displayName} declined your challenge.` });
          return;
        }
        const p1 = getUserById(invite.fromId);
        const p2 = getUserById(user.id);
        if (!p1 || !p2 || isUserSuspended(p1) || isUserSuspended(p2)) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'Challenge cannot start while a player is suspended.' });
          return;
        }
        if (userActiveMatch.has(invite.fromId) || userActiveMatch.has(user.id)) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'One of the players is already in a match.' });
          return;
        }
        startNewMatch({
          gameType: invite.gameType,
          mode: 'pvp',
          bestOf: invite.bestOf,
          turnTimeLimit: invite.turnTimeLimit,
          player1: toParticipant(p1, getUserPingMs(p1.id)),
          player2: toParticipant(p2, getUserPingMs(p2.id)),
        });
        return;
      }

      if (msg.type === 'match:move') {
        const matchId = String(msg.matchId || '');
        const res = processMatchMove(matchId, user.id, (msg.payload as Record<string, unknown>) || {});
        if (!res.ok) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: res.error || 'Invalid move' });
        }
        return;
      }

      if (msg.type === 'match:forfeit') {
        const matchId = String(msg.matchId || '');
        const match = activeMatches.get(matchId);
        if (!match || match.status !== 'active') return;
        const humanIds = getHumanMatchParticipantIds(match);
        if (!humanIds.includes(user.id)) return;
        if (match.gameType === 'sakar_htar' && match.state.gameType === 'sakar_htar') {
          userActiveMatch.delete(user.id);
          const remainingActiveHumans = getHumanMatchParticipantIds(match).filter(
            (id) => id !== user.id && userActiveMatch.get(id) === matchId
          );
          const remaining = match.state.players.filter((p) => p.id !== user.id);
          if (remaining.length <= 1 || remainingActiveHumans.length === 0) {
            clearMatchTimers(matchId);
            match.status = 'finished';
            activeMatches.delete(matchId);
            activeMatchChats.delete(matchId);
            db.prepare(`UPDATE matches SET status = 'finished', finished_at = ? WHERE id = ?`).run(
              new Date().toISOString(),
              matchId
            );
          }
          sendToUser(user.id, { type: 'match:left' });
          sendToUser(user.id, { type: 'toast', level: 'info', message: 'You left the Sakar-Htar match.' });
          schedulePresenceBroadcast();
          return;
        }
        const winnerId = match.player1.id === user.id ? match.player2.id : match.player1.id;
        finalizeMatch(match, winnerId, false);
        return;
      }

      if (msg.type === 'match:chat' || msg.type === 'match:sticker') {
        const locks = getFeatureLocks();
        if (locks.chat) {
          sendToSocket(ws, { type: 'toast', level: 'error', message: 'In-game chat is locked by an administrator.' });
          return;
        }
        const matchId = String(msg.matchId || '');
        const match = activeMatches.get(matchId);
        if (!match) return;
        const humanIds = getHumanMatchParticipantIds(match);
        if (!humanIds.includes(user.id)) return;

        const content = sanitizeText(msg.content, 240);
        if (!content) return;
        const chatMsg: ChatMessage = {
          id: `chat_${crypto.randomUUID().slice(0, 10)}`,
          senderId: user.id,
          senderName: user.displayName,
          content,
          kind: msg.type === 'match:sticker' ? 'sticker' : 'text',
          createdAt: new Date().toISOString(),
        };
        const list = activeMatchChats.get(matchId) || [];
        list.push(chatMsg);
        activeMatchChats.set(matchId, list);

        for (const uid of humanIds) {
          sendToUser(uid, { type: 'match:chat', matchId, message: chatMsg });
        }
        return;
      }

      if (msg.type === 'match:sync') {
        const activeId = userActiveMatch.get(user.id);
        if (activeId && activeMatches.has(activeId)) {
          sendToSocket(ws, { type: 'match:state', match: serializeMatchForViewer(activeMatches.get(activeId)!, user.id) });
        }
      }
    });

    ws.on('close', () => {
      clientsBySocket.delete(ws);
      const set = socketsByUser.get(user.id);
      if (set) {
        set.delete(client);
        if (set.size === 0) {
          socketsByUser.delete(user.id);
          removeUserFromQueues(user.id);
          removeUserFromCustomRooms(user.id);

          // Start 30-second disconnect grace timer if in active PvP/Tournament 2-player match
          const matchId = userActiveMatch.get(user.id);
          if (matchId) {
            const match = activeMatches.get(matchId);
            if (
              match &&
              match.status === 'active' &&
              match.mode !== 'bot' &&
              match.gameType !== 'sakar_htar'
            ) {
              match.disconnectedPlayerId = user.id;
              match.graceDeadline = Date.now() + GRACE_TIMEOUT_MS;
              emitMatchState(match);

              const graceKey = `${match.id}:${user.id}`;
              const timer = setTimeout(() => {
                graceTimers.delete(graceKey);
                const cur = activeMatches.get(match.id);
                if (!cur || cur.status !== 'active') return;
                if (socketsByUser.has(user.id)) return;
                const oppId = cur.player1.id === user.id ? cur.player2.id : cur.player1.id;
                finalizeMatch(cur, oppId, false);
              }, GRACE_TIMEOUT_MS);
              graceTimers.set(graceKey, timer);
            }
          }
        }
      }
      schedulePresenceBroadcast();
    });
  });

  // Heartbeat Ping every 5s to measure live Ping (ms) across all connected devices
  setInterval(() => {
    const now = Date.now();
    for (const client of clientsBySocket.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.lastPingSent = now;
        sendToSocket(client.ws, { type: 'ping', ts: now });
      }
    }
  }, 5000);

  server.listen(3000, '0.0.0.0', () => {
    console.log('Vanguard Arena server listening on http://0.0.0.0:3000');
  });
}

bootstrap();
