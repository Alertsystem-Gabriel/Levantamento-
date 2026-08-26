import { createClient } from '@supabase/supabase-js'
import type { ReportData, Role } from './types'
import type { AdminAccount } from './adminAuth'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const cloudEnabled = Boolean(url && key)
export const supabase = cloudEnabled ? createClient(url!, key!) : null

export async function startTechnicianSession() {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  if (data.session?.user?.is_anonymous) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase ainda não configurado.')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', data.user.id)
    .single()
  if (profileError) throw profileError
  return { user: data.user, name: profile.full_name as string, role: profile.role as Role }
}

export async function signOut() {
  await supabase?.auth.signOut()
}

export async function submitToCloud(report: ReportData, pdfBlob: Blob) {
  if (!supabase) return null
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sessão expirada. Entre novamente.')

  const path = `${auth.user.id}/${report.id}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: false })
  if (uploadError) throw uploadError

  const { data, error } = await supabase.from('reports').insert({
    id: report.id,
    protocol: report.protocol,
    created_by: auth.user.id,
    client: report.client,
    unit: report.unit,
    technician_name: report.technician,
    report_date: report.date,
    installation_mode: report.activityMode,
    vehicle: report.vehicle,
    objective: report.objective,
    details: report.details,
    pdf_path: path,
    pdf_size: pdfBlob.size,
    submitted_at: report.submittedAt,
    metadata: { coreExtensions: report.coreExtensions.length, accessories: report.accessoryPhotos.length }
  }).select('id').single()
  if (error) {
    await supabase.storage.from('reports').remove([path])
    throw error
  }
  return data.id as string
}

export async function listCloudReports() {
  if (!supabase) return []
  const { data, error } = await supabase.from('reports').select('*').order('submitted_at', { ascending: false })
  if (error) throw error
  return data
}

export async function downloadCloudPdf(path: string) {
  if (!supabase) throw new Error('Supabase ainda não configurado.')
  const { data, error } = await supabase.storage.from('reports').download(path)
  if (error) throw error
  return data
}

export async function listCloudAdmins() {
  if (!supabase) return []
  const { data, error } = await supabase.functions.invoke('manage-admins', { body: { action: 'list' } })
  if (error) throw error
  return data.accounts as AdminAccount[]
}

export async function createCloudAdmin(name: string, email: string, password: string) {
  if (!supabase) throw new Error('Supabase ainda não configurado.')
  const { data, error } = await supabase.functions.invoke('manage-admins', { body: { action: 'create', name, email, password } })
  if (error) throw error
  return data.account as AdminAccount
}
