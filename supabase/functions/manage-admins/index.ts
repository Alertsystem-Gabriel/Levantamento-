import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = request.headers.get('Authorization') ?? ''
    const adminClient = createClient(url, serviceKey, { global: { headers: { Authorization: authHeader } } })
    const token = authHeader.replace('Bearer ', '')
    const { data: authData, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !authData.user) throw new Error('Sessão inválida.')

    const serviceClient = createClient(url, serviceKey)
    const { data: profile } = await serviceClient.from('profiles').select('role, active').eq('id', authData.user.id).single()
    if (profile?.role !== 'admin' || !profile.active) throw new Error('Acesso restrito a administradores.')

    const body = await request.json()
    if (body.action === 'list') {
      const { data: users, error } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) throw error
      const { data: profiles } = await serviceClient.from('profiles').select('id, full_name, created_at').eq('role', 'admin').eq('active', true)
      const emails = new Map(users.users.map((user) => [user.id, user.email ?? '']))
      return Response.json({ accounts: (profiles ?? []).map((item) => ({ id: item.id, name: item.full_name, email: emails.get(item.id) ?? '', createdAt: item.created_at })) }, { headers: cors })
    }

    if (body.action === 'create') {
      const name = String(body.name ?? '').trim()
      const email = String(body.email ?? '').trim().toLowerCase()
      const password = String(body.password ?? '')
      if (!name || !email || password.length < 8) throw new Error('Informe nome, e-mail e uma senha com pelo menos 8 caracteres.')
      const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
      if (error) throw error
      const { error: profileError } = await serviceClient.from('profiles').upsert({ id: data.user.id, full_name: name, role: 'admin', active: true })
      if (profileError) throw profileError
      return Response.json({ account: { id: data.user.id, name, email, createdAt: data.user.created_at } }, { headers: cors })
    }

    throw new Error('Ação inválida.')
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'Erro inesperado.' }, { status: 400, headers: cors })
  }
})
