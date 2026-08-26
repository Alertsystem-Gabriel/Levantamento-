export interface AdminAccount {
  id: string
  name: string
  email: string
  createdAt: string
  temporary?: boolean
}

interface StoredAdmin extends AdminAccount {
  passwordHash: string
}

const STORAGE_KEY = 'a4-local-admins'

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function storedAdmins(): StoredAdmin[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as StoredAdmin[] }
  catch { return [] }
}

export function listLocalAdmins(): AdminAccount[] {
  return storedAdmins().map(({ passwordHash: _passwordHash, ...account }) => account)
}

export const hasLocalAdmins = () => storedAdmins().length > 0

export async function authenticateLocalAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const passwordHash = await hashPassword(password)
  const account = storedAdmins().find((item) => item.email === normalizedEmail && item.passwordHash === passwordHash)
  if (!account) throw new Error('Usuário ou senha inválidos.')
  return account.name
}

export async function createLocalAdmin(name: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (storedAdmins().some((item) => item.email === normalizedEmail)) throw new Error('Já existe um administrador com este e-mail.')
  const account: StoredAdmin = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...storedAdmins(), account]))
  return account
}
