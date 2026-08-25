import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LIMIT_BYTES = 900 * 1024 * 1024
const TARGET_BYTES = 750 * 1024 * 1024

Deno.serve(async (request) => {
  if (request.headers.get('x-cleanup-secret') !== Deno.env.get('CLEANUP_SECRET')) {
    return new Response('Não autorizado', { status: 401 })
  }

  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: reports, error } = await client.from('reports').select('id,pdf_path,pdf_size,submitted_at').is('pdf_removed_at', null).order('submitted_at')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let total = reports.reduce((sum, item) => sum + Number(item.pdf_size || 0), 0)
  const removed: string[] = []
  if (total >= LIMIT_BYTES) {
    for (const report of reports) {
      if (total <= TARGET_BYTES) break
      const { error: removeError } = await client.storage.from('reports').remove([report.pdf_path])
      if (removeError) continue
      await client.from('reports').update({ pdf_removed_at: new Date().toISOString() }).eq('id', report.id)
      total -= Number(report.pdf_size || 0)
      removed.push(report.id)
    }
  }
  return Response.json({ totalBytes: total, removed })
})
