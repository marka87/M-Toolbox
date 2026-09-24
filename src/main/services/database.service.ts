import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import type { RAMHistoryPoint } from '../../shared/ram.types'

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

    // RAM history table (for 24h RAM Guardian tracking)
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS ram_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        usage_percent REAL NOT NULL,
        used_mb INTEGER NOT NULL,
        available_mb INTEGER NOT NULL,
        cache_mb INTEGER NOT NULL,
        compressed_mb INTEGER NOT NULL
      )
    `).run()
    this.db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_ram_history_time ON ram_history(timestamp)
    `).run()
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

  public recordRamPoint(point: {
    usagePercent: number
    usedMB: number
    availableMB: number
    cacheMB: number
    compressedMB: number
  }): void {
    try {
      // Prune entries older than 24 hours
      this.db.prepare("DELETE FROM ram_history WHERE timestamp < datetime('now', '-24 hours')").run()

      this.db.prepare(`
        INSERT INTO ram_history (usage_percent, used_mb, available_mb, cache_mb, compressed_mb)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        point.usagePercent,
        point.usedMB,
        point.availableMB,
        point.cacheMB,
        point.compressedMB
      )
    } catch (err) {
      console.warn('[DatabaseService] Failed to record RAM point:', err)
    }
  }

  public getRamHistory24h(): RAMHistoryPoint[] {
    try {
      return this.db.prepare(`
        SELECT 
          timestamp,
          usage_percent as usagePercent,
          used_mb as usedMB,
          available_mb as availableMB,
          cache_mb as cacheMB,
          compressed_mb as compressedMB
        FROM ram_history
        WHERE timestamp >= datetime('now', '-24 hours')
        ORDER BY id ASC
      `).all() as RAMHistoryPoint[]
    } catch (err) {
      console.warn('[DatabaseService] Failed to fetch RAM history:', err)
      return []
    }
  }

  public checkPersistentHighLoad(thresholdPercent = 85, durationMinutes = 10): { isHigh: boolean; durationMinutes: number } {
    try {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(*) as count,
          MIN(usage_percent) as minUsage
        FROM ram_history
        WHERE timestamp >= datetime('now', '-' || ? || ' minutes')
      `).get(durationMinutes) as { count: number; minUsage: number | null } | undefined

      if (stats && stats.count >= 5 && stats.minUsage !== null && stats.minUsage >= thresholdPercent) {
        return { isHigh: true, durationMinutes }
      }
    } catch {
      // ignore
    }
    return { isHigh: false, durationMinutes: 0 }
  }

  public close(): void {
    this.db.close()
  }
}

export const databaseService = {
  recordRamPoint: (point: RAMHistoryPoint) => DatabaseService.getInstance().recordRamPoint(point),
  getRamHistory24h: () => DatabaseService.getInstance().getRamHistory24h(),
  checkPersistentHighLoad: (thresholdPercent = 85, durationMinutes = 10) =>
    DatabaseService.getInstance().checkPersistentHighLoad(thresholdPercent, durationMinutes)
}

