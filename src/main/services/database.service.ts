import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'

export class DatabaseService {
  private static instance: DatabaseService
  private db: Database.Database

  private constructor() {
    const userDataPath = app.getPath('userData')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    const dbPath = path.join(userDataPath, 'mtoolbox.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.initTables()
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  private initTables(): void {
    // Settings table
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // Activity log table
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // Hardware snapshots cache
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS system_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshot_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
  }

  public getSetting<T>(key: string, defaultValue: T): T {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    if (!row) return defaultValue
    try {
      return JSON.parse(row.value) as T
    } catch {
      return row.value as unknown as T
    }
  }

  public setSetting<T>(key: string, value: T): void {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    this.db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, serialized)
  }

  public logActivity(module: string, action: string, status: 'success' | 'warning' | 'error', details?: string): void {
    this.db.prepare(`
      INSERT INTO activity_log (module, action, status, details) 
      VALUES (?, ?, ?, ?)
    `).run(module, action, status, details || null)
  }

  public saveSystemSnapshot(data: unknown): void {
    this.db.prepare(`
      INSERT INTO system_snapshots (snapshot_data) 
      VALUES (?)
    `).run(JSON.stringify(data))
  }

  public close(): void {
    this.db.close()
  }
}

