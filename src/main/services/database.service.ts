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
    // Activity log table (used by ReinstallService)
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

    // RAM Guardian was removed: drop its leftover history from older versions
    this.db.prepare('DROP TABLE IF EXISTS ram_history').run()
  }

  public logActivity(module: string, action: string, status: 'success' | 'warning' | 'error', details?: string): void {
    this.db.prepare(`
      INSERT INTO activity_log (module, action, status, details) 
      VALUES (?, ?, ?, ?)
    `).run(module, action, status, details || null)
  }

  public getActivity(module: string, action: string, limit = 50): Array<{ createdAt: string; status: string; details?: string }> {
    return this.db.prepare(
      'SELECT created_at as createdAt, status, details FROM activity_log WHERE module = ? AND action = ? ORDER BY id DESC LIMIT ?'
    ).all(module, action, limit) as Array<{ createdAt: string; status: string; details?: string }>
  }

  public close(): void {
    this.db.close()
  }
}
