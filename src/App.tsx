import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, Cloud, Download, FilePlus2, FileText, LogOut, Plus, Search, ShieldCheck, Trash2, UserPlus, Users, WifiOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import logoUrl from '../images.png'
import { db, listReports, removeReport, saveDraft } from './db'
import { PhotoField } from './components/PhotoField'
import { SignaturePad } from './components/SignaturePad'
import { cloudEnabled, downloadCloudPdf, listCloudReports, signIn, signOut, startTechnicianSession, submitToCloud } from './supabase'
import { authenticateLocalAdmin, createLocalAdmin, hasLocalAdmins, listLocalAdmins, type AdminAccount } from './adminAuth'
import { createCloudAdmin, listCloudAdmins } from './supabase'
import { createEmptyReport, createId, emptyPhoto, EXTENSION_PHOTO_TITLES, type CoreExtension, type PhotoItem, type ReportData, type Role, type StoredReport } from './types'

interface Session { role: Role; name: string; demo: boolean }
interface CloudReport { id: string; protocol: string; client: string; unit: string; technician_name: string; report_date: string; installation_mode: string; pdf_path: string; pdf_size: number; submitted_at: string; pdf_removed_at?: string }

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Header({ session, onLogout }: { session: Session; onLogout: () => void }) {
  return <header className="app-header"><div className="brand"><img src={logoUrl} alt="A4 Solutions" /><div><strong>Relatório de Implantação</strong><span>{session.role === 'admin' ? 'Painel administrativo' : 'Área do técnico'}</span></div></div><div className="header-actions"><span className={`connection ${cloudEnabled ? 'online' : ''}`}>{cloudEnabled ? <Cloud size={15} /> : <WifiOff size={15} />}{cloudEnabled ? 'Nuvem ativa' : 'Modo demonstração'}</span><button className="user-button" onClick={onLogout}><span>{session.name}</span><LogOut size={18} /></button></div></header>
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [adminMode, setAdminMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const authenticate = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('')
    try {
      if (!cloudEnabled) {
        if (!hasLocalAdmins()) {
          await createLocalAdmin('Gabriel Alcantara', email, password)
          onLogin({ role: 'admin', name: 'Gabriel Alcantara', demo: true })
          return
        }
        const name = await authenticateLocalAdmin(email, password)
        onLogin({ role: 'admin', name, demo: true })
      } else {
        const result = await signIn(email, password)
        if (result.role !== 'admin') { await signOut(); throw new Error('Este usuário não possui acesso administrativo.') }
        onLogin({ role: 'admin', name: result.name, demo: false })
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.') }
    finally { setLoading(false) }
  }

  const enterTechnicianArea = async () => {
    setLoading(true); setError('')
    try {
      await startTechnicianSession()
      onLogin({ role: 'technician', name: 'Acesso livre', demo: !cloudEnabled })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o formulário.') }
    finally { setLoading(false) }
  }

  const firstAdminSetup = !cloudEnabled && !hasLocalAdmins()
  return <main className="login-page"><section className="login-hero"><div className="hero-overlay"><img src={logoUrl} alt="A4 Solutions" /><span className="eyebrow light">Implantação em campo</span><h1>Relatório de Operação</h1><p>Registre instalações, evidências e assinaturas pelo celular. Consulte tudo em um único painel.</p><div className="hero-points"><span><CheckCircle2 /> Funciona no celular</span><span><CheckCircle2 /> Preparado para uso offline</span><span><ShieldCheck /> Administração protegida</span></div></div></section><section className="login-panel"><div className="login-card"><span className="eyebrow">A4 Solutions</span>{!adminMode ? <div className="demo-access"><h2>Acessar o sistema</h2><p className="access-description">A criação de relatórios é livre. O painel de consulta é exclusivo para administradores.</p>{error && <div className="alert error"><AlertCircle size={18} />{error}</div>}<button className="primary-button" disabled={loading} onClick={() => void enterTechnicianArea()}>{loading ? 'Abrindo...' : 'Criar relatório'}<ChevronRight size={19} /></button><button className="secondary-button" onClick={() => { setAdminMode(true); setError('') }}><ShieldCheck size={18} />Entrar como administrador</button></div> : <div className="admin-login"><button className="back-link" type="button" onClick={() => { setAdminMode(false); setError('') }}><ArrowLeft size={17} />Voltar</button><h2>{firstAdminSetup ? 'Criar primeiro administrador' : 'Acesso administrativo'}</h2><p className="access-description">{firstAdminSetup ? 'Informe seu e-mail e crie uma senha para este navegador.' : 'Informe o e-mail e a senha do administrador.'}</p><form onSubmit={authenticate}><label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label className="field"><span>Senha</span><input type="password" minLength={8} autoComplete={firstAdminSetup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>{!cloudEnabled && <div className="alert"><WifiOff size={18} /><span>{firstAdminSetup ? 'Este primeiro acesso ficará protegido somente neste navegador até conectarmos o banco.' : 'Acesso provisório ativo até conectarmos o banco de dados.'}</span></div>}{error && <div className="alert error"><AlertCircle size={18} />{error}</div>}<button className="primary-button" disabled={loading}>{loading ? 'Entrando...' : firstAdminSetup ? 'Criar acesso' : 'Entrar'}<ChevronRight size={19} /></button></form></div>}<small className="login-footer">A4 Solutions • Uso interno</small></div></section></main>
}

function ModeSelector({ value, onChange }: { value: ReportData['activityMode']; onChange: (value: ReportData['activityMode']) => void }) {
  return <div className="mode-selector">{([['core', 'Core', 'Configuração principal e extensões'], ['accessory', 'Acessório', 'Registro de até 5 acessórios'], ['both', 'Core + Acessório', 'Implantação completa']] as const).map(([key, title, text]) => <button type="button" key={key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}><span className="radio-dot" /><strong>{title}</strong><small>{text}</small></button>)}</div>
}

function TechnicianForm({ session }: { session: Session }) {
  const technicianName = session.name === 'Acesso livre' ? '' : session.name
  const [report, setReport] = useState<ReportData>(() => createEmptyReport(technicianName))
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (report.status !== 'draft') return
    const timer = setTimeout(() => void saveDraft(report), 700)
    return () => clearTimeout(timer)
  }, [report])

  const update = <K extends keyof ReportData>(key: K, value: ReportData[K]) => setReport((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }))
  const updatePhoto = (key: 'corePhotos' | 'accessoryPhotos' | 'additionalPhotos', index: number, photo: PhotoItem) => update(key, report[key].map((item, itemIndex) => itemIndex === index ? photo : item))
  const addExtension = () => update('coreExtensions', [...report.coreExtensions, { id: createId(), name: `Core Extension ${report.coreExtensions.length + 1}`, photos: EXTENSION_PHOTO_TITLES.map(emptyPhoto) }])
  const updateExtension = (index: number, extension: CoreExtension) => update('coreExtensions', report.coreExtensions.map((item, itemIndex) => itemIndex === index ? extension : item))

  const validate = () => {
    const required = [[report.client, 'Informe o cliente.'], [report.technician, 'Informe o técnico.'], [report.date, 'Informe a data.'], [report.objective, 'Preencha o objetivo.'], [report.details, 'Preencha os detalhes.'], [report.technicianSignature.name, 'Informe o nome do técnico na assinatura.'], [report.technicianSignature.dataUrl, 'Colete a assinatura do técnico.'], [report.clientSignature.name, 'Informe o nome do cliente na assinatura.'], [report.clientSignature.dataUrl, 'Colete a assinatura do cliente.']]
    const missing = required.find(([value]) => !value.trim())
    return missing?.[1] ?? ''
  }

  const buildPdf = async (data: ReportData) => {
    const [{ pdf }, { ReportPdf }] = await Promise.all([import('@react-pdf/renderer'), import('./pdf/ReportPdf')])
    return pdf(<ReportPdf report={data} logoUrl={logoUrl} />).toBlob()
  }

  const downloadOnly = async () => {
    const validation = validate()
    if (validation) { setError(validation); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setDownloading(true); setError('')
    try {
      const generatedAt = new Date().toISOString()
      const printableReport: ReportData = { ...report, updatedAt: generatedAt, submittedAt: generatedAt }
      const blob = await buildPdf(printableReport)
      const clientName = report.client.trim().replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '_') || 'cliente'
      downloadBlob(blob, `${report.protocol}_${clientName}.pdf`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível baixar o PDF.') }
    finally { setDownloading(false) }
  }

  const submit = async () => {
    const validation = validate()
    if (validation) { setError(validation); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setSaving(true); setError('')
    const submittedAt = new Date().toISOString()
    const finalReport: ReportData = { ...report, status: 'submitted', submittedAt, updatedAt: submittedAt }
    try {
      const blob = await buildPdf(finalReport)
      let remoteId: string | undefined
      let status: ReportData['status'] = 'submitted'
      if (cloudEnabled) {
        try { remoteId = (await submitToCloud(finalReport, blob)) ?? undefined }
        catch { status = 'sync_pending' }
      }
      await saveDraft({ ...finalReport, status, pdfBlob: blob, pdfSize: blob.size, remoteId })
      setSubmitted(finalReport.protocol)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o relatório.') }
    finally { setSaving(false) }
  }

  if (submitted) return <main className="success-page"><div className="success-card"><div className="success-icon"><CheckCircle2 size={45} /></div><span className="eyebrow">Envio concluído</span><h1>Relatório registrado</h1><p>O relatório foi salvo com sucesso. Guarde o protocolo para referência.</p><strong className="protocol">{submitted}</strong><button className="primary-button" onClick={() => { setReport(createEmptyReport(technicianName)); setSubmitted(null) }}><FilePlus2 size={19} />Criar novo relatório</button></div></main>

  return <main className="workspace"><div className="page-intro"><div><span className="eyebrow">Nova implantação</span><h1>Relatório de campo</h1><p>Preencha os dados, registre as evidências e colete as assinaturas.</p></div><div className="draft-status"><CheckCircle2 size={17} />Rascunho salvo neste aparelho</div></div>{error && <div className="alert error sticky-alert"><AlertCircle size={19} />{error}</div>}
    <section className="form-section"><div className="section-heading"><div><span className="step">01</span><h2>Dados da atividade</h2></div><p>Identificação básica da implantação.</p></div><div className="form-grid"><label className="field"><span>Cliente *</span><input value={report.client} onChange={(e) => update('client', e.target.value)} /></label><label className="field"><span>Unidade</span><input value={report.unit} onChange={(e) => update('unit', e.target.value)} /></label><label className="field"><span>Técnico *</span><input value={report.technician} onChange={(e) => update('technician', e.target.value)} /></label><label className="field"><span>Data *</span><input type="date" value={report.date} onChange={(e) => update('date', e.target.value)} /></label><label className="field wide"><span>Equipamento, veículo ou local</span><input value={report.vehicle} onChange={(e) => update('vehicle', e.target.value)} placeholder="Ex.: Veículo 42 / Placa ABC1D23" /></label></div></section>

    <section className="form-section"><div className="section-heading"><div><span className="step">02</span><h2>Tipo de implantação</h2></div><p>As evidências mudam conforme a seleção.</p></div><ModeSelector value={report.activityMode} onChange={(value) => update('activityMode', value)} />
      {report.activityMode !== 'accessory' && <div className="subsection">
        <div className="subsection-title"><div><span className="eyebrow">Core principal</span><h3>Evidências do Core</h3></div></div>
        <h4 className="photo-group-title">Configurações do Core</h4>
        <div className="photo-grid">{report.corePhotos.slice(0, 3).map((photo, index) => <PhotoField key={photo.id} photo={photo} onChange={(item) => updatePhoto('corePhotos', index, item)} />)}</div>
        <h4 className="photo-group-title">Instalação do Core</h4>
        <div className="photo-grid">{report.corePhotos.slice(3).map((photo, index) => <PhotoField key={photo.id} photo={photo} onChange={(item) => updatePhoto('corePhotos', index + 3, item)} />)}</div>
        <div className="extensions">{report.coreExtensions.map((extension, extensionIndex) => <section className="extension-card" key={extension.id}>
          <div className="extension-header"><label className="field inline-field"><span>Identificação da extensão</span><input value={extension.name} onChange={(e) => updateExtension(extensionIndex, { ...extension, name: e.target.value })} /></label><button type="button" className="danger-button" onClick={() => update('coreExtensions', report.coreExtensions.filter((_, index) => index !== extensionIndex))}><Trash2 size={17} />Remover</button></div>
          <h4 className="photo-group-title compact">Configurações do Core Extension</h4>
          <div className="photo-grid">{extension.photos.slice(0, 3).map((photo, photoIndex) => <PhotoField key={photo.id} photo={photo} onChange={(item) => updateExtension(extensionIndex, { ...extension, photos: extension.photos.map((current, index) => index === photoIndex ? item : current) })} />)}</div>
          <h4 className="photo-group-title">Instalação do Core Extension</h4>
          <div className="photo-grid">{extension.photos.slice(3).map((photo, photoIndex) => <PhotoField key={photo.id} photo={photo} onChange={(item) => updateExtension(extensionIndex, { ...extension, photos: extension.photos.map((current, index) => index === photoIndex + 3 ? item : current) })} />)}</div>
        </section>)}</div>
        <button type="button" className="add-button" onClick={addExtension}><Plus size={19} />Adicionar Core Extension</button>
      </div>}
      {report.activityMode !== 'core' && <div className="subsection"><div className="subsection-title"><div><span className="eyebrow">Acessórios</span><h3>Fotos dos acessórios</h3></div><span>{report.accessoryPhotos.length}/5</span></div><div className="photo-grid">{report.accessoryPhotos.map((photo, index) => <PhotoField key={photo.id} photo={photo} editableTitle removable onChange={(item) => updatePhoto('accessoryPhotos', index, item)} onRemove={() => update('accessoryPhotos', report.accessoryPhotos.filter((_, itemIndex) => itemIndex !== index))} />)}</div>{report.accessoryPhotos.length < 5 && <button type="button" className="add-button" onClick={() => update('accessoryPhotos', [...report.accessoryPhotos, emptyPhoto(`Acessório ${report.accessoryPhotos.length + 1}`)])}><Plus size={19} />Adicionar acessório</button>}</div>}
    </section>

    <section className="form-section"><div className="section-heading"><div><span className="step">03</span><h2>Descrição técnica</h2></div><p>Registre o objetivo e os resultados da atividade.</p></div><label className="field"><span>Objetivo *</span><textarea value={report.objective} onChange={(e) => update('objective', e.target.value)} placeholder="Ex.: Instalação do dispositivo Smart Safety no veículo..." /></label><label className="field"><span>Detalhes *</span><textarea rows={7} value={report.details} onChange={(e) => update('details', e.target.value)} placeholder="Descreva instalação, configuração, parametrização e testes realizados..." /></label><label className="switch-row"><input type="checkbox" checked={report.hadIssue} onChange={(e) => update('hadIssue', e.target.checked)} /><span className="switch" /><div><strong>Houve problema ou apontamento do cliente?</strong><small>Ative para documentar a ocorrência e o tratamento.</small></div></label>{report.hadIssue && <div className="issue-fields"><label className="field"><span>Problema ou apontamento</span><textarea value={report.issueDescription} onChange={(e) => update('issueDescription', e.target.value)} /></label><label className="field"><span>Ação realizada</span><textarea value={report.issueAction} onChange={(e) => update('issueAction', e.target.value)} /></label><label className="field"><span>Situação e próximo passo</span><textarea value={report.issueStatus} onChange={(e) => update('issueStatus', e.target.value)} placeholder="Resolvida, pendente ou em acompanhamento..." /></label></div>}</section>

    <section className="form-section"><div className="section-heading"><div><span className="step">04</span><h2>Fotos adicionais</h2></div><p>Inclua quantas evidências extras forem necessárias.</p></div><div className="photo-grid">{report.additionalPhotos.map((photo, index) => <PhotoField key={photo.id} photo={photo} editableTitle removable onChange={(item) => updatePhoto('additionalPhotos', index, item)} onRemove={() => update('additionalPhotos', report.additionalPhotos.filter((_, itemIndex) => itemIndex !== index))} />)}</div><button type="button" className="add-button" onClick={() => update('additionalPhotos', [...report.additionalPhotos, emptyPhoto(`Foto adicional ${report.additionalPhotos.length + 1}`)])}><Plus size={19} />Adicionar foto</button></section>

    <section className="form-section"><div className="section-heading"><div><span className="step">05</span><h2>Validação</h2></div><p>As duas assinaturas serão incluídas no PDF.</p></div><div className="signature-grid"><SignaturePad label="Técnico responsável" value={report.technicianSignature} onChange={(value) => update('technicianSignature', value)} /><SignaturePad label="Cliente / responsável" value={report.clientSignature} onChange={(value) => update('clientSignature', value)} /></div></section>
    <div className="submit-bar"><div><strong>{report.protocol}</strong><span>Revise os dados antes de finalizar.</span></div><div className="submit-actions"><button className="secondary-button" disabled={saving || downloading} onClick={() => void downloadOnly()}><Download size={18} />{downloading ? 'Gerando PDF...' : 'Baixar PDF'}</button><button className="primary-button" disabled={saving || downloading} onClick={() => void submit()}>{saving ? 'Gerando relatório...' : 'Finalizar e enviar'}<ChevronRight size={19} /></button></div></div>
  </main>
}

function AdminUsers() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [savingUser, setSavingUser] = useState(false)
  const [message, setMessage] = useState('')
  const [userError, setUserError] = useState('')

  const refresh = async () => setAccounts(cloudEnabled ? await listCloudAdmins() : listLocalAdmins())
  useEffect(() => { void refresh().catch((cause) => setUserError(cause instanceof Error ? cause.message : 'Não foi possível listar os administradores.')) }, [])

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault(); setSavingUser(true); setUserError(''); setMessage('')
    try {
      if (password.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.')
      if (cloudEnabled) await createCloudAdmin(name, email, password)
      else await createLocalAdmin(name, email, password)
      setName(''); setEmail(''); setPassword(''); setMessage('Novo administrador criado com sucesso.')
      await refresh()
    } catch (cause) { setUserError(cause instanceof Error ? cause.message : 'Não foi possível criar o administrador.') }
    finally { setSavingUser(false) }
  }

  return <section className="admin-card admin-users"><div className="admin-toolbar"><div><h2>Usuários administradores</h2><p>Todo administrador pode criar um novo acesso.</p></div><span className="admin-count"><Users size={17} />{accounts.length} usuário(s)</span></div>
    {!cloudEnabled && <div className="alert"><WifiOff size={18} /><span>Enquanto o banco não estiver conectado, os novos usuários ficam salvos somente neste navegador.</span></div>}
    <div className="admin-users-layout"><form className="admin-user-form" onSubmit={createUser}><h3><UserPlus size={19} />Criar novo login</h3><label className="field"><span>Nome</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="field"><span>E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label className="field"><span>Senha inicial</span><input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{userError && <div className="alert error"><AlertCircle size={18} />{userError}</div>}{message && <div className="alert success"><CheckCircle2 size={18} />{message}</div>}<button className="primary-button" disabled={savingUser}><UserPlus size={18} />{savingUser ? 'Criando...' : 'Criar administrador'}</button></form>
      <div className="admin-user-list"><h3>Administradores ativos</h3>{accounts.map((account) => <article key={account.id}><div className="admin-avatar">{account.name.slice(0, 1).toUpperCase()}</div><div><strong>{account.name}</strong><span>{account.email}</span></div>{account.temporary && <small>Provisório</small>}</article>)}</div>
    </div>
  </section>
}

function AdminDashboard() {
  const [reports, setReports] = useState<StoredReport[]>([])
  const [cloudReports, setCloudReports] = useState<CloudReport[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    setReports((await listReports()).filter((report) => report.status !== 'draft'))
    if (cloudEnabled) setCloudReports((await listCloudReports()) as CloudReport[])
    setLoading(false)
  }
  useEffect(() => { void refresh() }, [])

  const filtered = useMemo(() => reports.filter((report) => `${report.protocol} ${report.client} ${report.technician} ${report.unit}`.toLowerCase().includes(query.toLowerCase())), [reports, query])
  const used = reports.reduce((sum, report) => sum + (report.pdfSize ?? 0), 0)

  const downloadLocal = (report: StoredReport) => report.pdfBlob && downloadBlob(report.pdfBlob, `${report.protocol}_${report.client.replace(/\s+/g, '_')}.pdf`)
  const downloadRemote = async (report: CloudReport) => downloadBlob(await downloadCloudPdf(report.pdf_path), `${report.protocol}_${report.client.replace(/\s+/g, '_')}.pdf`)

  return <main className="admin-workspace"><div className="page-intro"><div><span className="eyebrow">Gestão documental</span><h1>Relatórios de implantação</h1><p>Consulte e extraia os documentos enviados pela equipe de campo.</p></div></div><section className="metrics"><article><span>Relatórios disponíveis</span><strong>{cloudEnabled ? cloudReports.length : reports.length}</strong><FileText /></article><article><span>Armazenamento local</span><strong>{(used / 1024 / 1024).toFixed(1)} MB</strong><Cloud /></article><article><span>Fonte de dados</span><strong>{cloudEnabled ? 'Supabase' : 'Demonstração'}</strong>{cloudEnabled ? <ShieldCheck /> : <WifiOff />}</article></section><AdminUsers /><section className="admin-card"><div className="admin-toolbar"><div><h2>Base de relatórios</h2><p>{loading ? 'Atualizando...' : `${cloudEnabled ? cloudReports.length : filtered.length} documento(s) encontrado(s)`}</p></div><label className="search-box"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente, técnico ou protocolo" /></label></div><div className="table-wrap"><table><thead><tr><th>Protocolo</th><th>Cliente / Unidade</th><th>Técnico</th><th>Data</th><th>Tipo</th><th>Documento</th></tr></thead><tbody>{cloudEnabled ? cloudReports.filter((item) => `${item.protocol} ${item.client} ${item.technician_name}`.toLowerCase().includes(query.toLowerCase())).map((item) => <tr key={item.id}><td><strong>{item.protocol}</strong></td><td>{item.client}<small>{item.unit}</small></td><td>{item.technician_name}</td><td>{item.report_date.split('-').reverse().join('/')}</td><td><span className="tag">{item.installation_mode}</span></td><td><button className="download-button" onClick={() => void downloadRemote(item)} disabled={Boolean(item.pdf_removed_at)}><Download size={17} />{item.pdf_removed_at ? 'Removido' : 'Baixar'}</button></td></tr>) : filtered.map((item) => <tr key={item.id}><td><strong>{item.protocol}</strong></td><td>{item.client}<small>{item.unit}</small></td><td>{item.technician}</td><td>{item.date.split('-').reverse().join('/')}</td><td><span className="tag">{item.activityMode}</span></td><td><div className="row-actions"><button className="download-button" onClick={() => downloadLocal(item)} disabled={!item.pdfBlob}><Download size={17} />Baixar</button><button className="icon-button danger" onClick={() => void removeReport(item.id).then(refresh)} aria-label="Excluir relatório local"><Trash2 size={17} /></button></div></td></tr>)}</tbody></table>{!loading && (cloudEnabled ? cloudReports.length === 0 : filtered.length === 0) && <div className="empty-state"><FileText size={34} /><h3>Nenhum relatório encontrado</h3><p>Os relatórios enviados pelos técnicos aparecerão aqui.</p></div>}</div></section></main>
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => { const saved = sessionStorage.getItem('a4-session'); return saved ? JSON.parse(saved) as Session : null })
  const login = (value: Session) => { sessionStorage.setItem('a4-session', JSON.stringify(value)); setSession(value) }
  const logout = async () => { await signOut(); sessionStorage.removeItem('a4-session'); setSession(null) }
  useEffect(() => { void db.open() }, [])
  if (!session) return <Login onLogin={login} />
  return <><Header session={session} onLogout={() => void logout()} />{session.role === 'admin' ? <AdminDashboard /> : <TechnicianForm session={session} />}</>
}
