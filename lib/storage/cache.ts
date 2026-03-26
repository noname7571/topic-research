import "server-only";

import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { AnalysisResult } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "social-intelligence.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS analysis_cache (
    topic_key TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    usage_date TEXT NOT NULL,
    topic TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_usage_client_date
    ON usage_events (client_id, usage_date);
`);

const normalizeTopic = (topic: string): string => {
  return topic.trim().toLowerCase();
};

interface CacheRow {
  payload: string;
  created_at: string;
}

export const getCachedAnalysis = (
  topic: string,
  maxAgeMinutes: number,
): AnalysisResult | null => {
  const key = normalizeTopic(topic);

  const statement = db.prepare(
    "SELECT payload, created_at FROM analysis_cache WHERE topic_key = ?",
  );

  const row = statement.get(key) as CacheRow | undefined;
  if (!row) {
    return null;
  }

  const ageMs = Date.now() - new Date(row.created_at).getTime();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  if (ageMs > maxAgeMs) {
    return null;
  }

  try {
    return JSON.parse(row.payload) as AnalysisResult;
  } catch {
    return null;
  }
};

export const setCachedAnalysis = (topic: string, analysis: AnalysisResult): void => {
  const key = normalizeTopic(topic);

  const statement = db.prepare(`
    INSERT INTO analysis_cache (topic_key, topic, payload, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(topic_key)
    DO UPDATE SET
      topic = excluded.topic,
      payload = excluded.payload,
      created_at = excluded.created_at
  `);

  statement.run(key, topic.trim(), JSON.stringify(analysis), new Date().toISOString());
};

export const getDailyUsageCount = (clientId: string, usageDate: string): number => {
  const statement = db.prepare(
    "SELECT COUNT(*) as count FROM usage_events WHERE client_id = ? AND usage_date = ?",
  );

  const row = statement.get(clientId, usageDate) as { count?: number } | undefined;
  return row?.count ?? 0;
};

export const trackUsage = (clientId: string, usageDate: string, topic: string): void => {
  const statement = db.prepare(
    "INSERT INTO usage_events (client_id, usage_date, topic, created_at) VALUES (?, ?, ?, ?)",
  );

  statement.run(clientId, usageDate, topic.trim(), new Date().toISOString());
};

export const pruneUsageEvents = (daysToKeep = 30): void => {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const statement = db.prepare("DELETE FROM usage_events WHERE usage_date < ?");
  statement.run(cutoff);
};
