export type Role = 'technician' | 'admin'
export type InstallationMode = 'core' | 'accessory' | 'both'

export interface PhotoItem {
  id: string
  title: string
  dataUrl: string
}

export interface CoreExtension {
  id: string
  name: string
  photos: PhotoItem[]
}

export interface SignatureData {
  name: string
  dataUrl: string
  signedAt?: string
}

export interface ReportData {
  id: string
  protocol: string
  status: 'draft' | 'submitted' | 'sync_pending'
  createdAt: string
  updatedAt: string
  submittedAt?: string
  client: string
  unit: string
  technician: string
  date: string
  vehicle: string
  activityMode: InstallationMode
  objective: string
  details: string
  hadIssue: boolean
  issueDescription: string
  issueAction: string
  issueStatus: string
  corePhotos: PhotoItem[]
  coreExtensions: CoreExtension[]
  accessoryPhotos: PhotoItem[]
  additionalPhotos: PhotoItem[]
  technicianSignature: SignatureData
  clientSignature: SignatureData
}

export interface StoredReport extends ReportData {
  pdfBlob?: Blob
  pdfSize?: number
  pdfRemovedAt?: string
  remoteId?: string
}

export const CORE_PHOTO_TITLES = ['Network Config', 'Radius Config', 'Permit Config'] as const
export const EXTENSION_PHOTO_TITLES = [
  'Core Extension Network Config',
  'Core Extension Radius Config',
  'Core Extension Permit Config'
] as const

export const createId = () => crypto.randomUUID()

export function emptyPhoto(title: string): PhotoItem {
  return { id: createId(), title, dataUrl: '' }
}

export function createEmptyReport(technician = ''): ReportData {
  const now = new Date().toISOString()
  const id = createId()
  return {
    id,
    protocol: `A4-${new Date().getFullYear()}-${id.slice(0, 8).toUpperCase()}`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    client: '',
    unit: '',
    technician,
    date: new Date().toISOString().slice(0, 10),
    vehicle: '',
    activityMode: 'core',
    objective: '',
    details: '',
    hadIssue: false,
    issueDescription: '',
    issueAction: '',
    issueStatus: '',
    corePhotos: CORE_PHOTO_TITLES.map(emptyPhoto),
    coreExtensions: [],
    accessoryPhotos: [],
    additionalPhotos: [],
    technicianSignature: { name: technician, dataUrl: '' },
    clientSignature: { name: '', dataUrl: '' }
  }
}
