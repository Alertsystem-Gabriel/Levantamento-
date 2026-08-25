import Dexie, { type EntityTable } from 'dexie'
import type { StoredReport } from './types'

class ReportDatabase extends Dexie {
  reports!: EntityTable<StoredReport, 'id'>

  constructor() {
    super('a4-report-database')
    this.version(1).stores({
      reports: 'id, protocol, status, date, client, technician, submittedAt, updatedAt'
    })
  }
}

export const db = new ReportDatabase()

export async function saveDraft(report: StoredReport) {
  await db.reports.put({ ...report, updatedAt: new Date().toISOString() })
}

export async function listReports() {
  return db.reports.orderBy('updatedAt').reverse().toArray()
}

export async function removeReport(id: string) {
  await db.reports.delete(id)
}
