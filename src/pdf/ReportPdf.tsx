import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { PhotoItem, ReportData } from '../types'

const purple = '#4d318b'
const teal = '#00b7aa'
const styles = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 45, paddingHorizontal: 45, fontFamily: 'Helvetica', color: '#252033', fontSize: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: teal },
  logo: { width: 58, height: 58, objectFit: 'contain' },
  title: { fontSize: 21, fontWeight: 700, color: purple },
  subtitle: { marginTop: 4, color: '#696277', fontSize: 9 },
  protocol: { marginTop: 7, fontSize: 9, color: purple },
  infoGrid: { marginTop: 20, padding: 16, backgroundColor: '#f6f4fa', borderRadius: 7, flexDirection: 'row', flexWrap: 'wrap' },
  info: { width: '50%', marginBottom: 10 },
  label: { fontSize: 8, color: '#746e7f', marginBottom: 3, textTransform: 'uppercase' },
  value: { fontSize: 10.5, fontWeight: 700 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: purple, marginBottom: 7 },
  textBox: { lineHeight: 1.55, padding: 12, borderWidth: 1, borderColor: '#e4e0ea', borderRadius: 5 },
  issue: { lineHeight: 1.5, padding: 12, borderLeftWidth: 3, borderLeftColor: '#d78d24', backgroundColor: '#fff9ef' },
  footer: { position: 'absolute', bottom: 20, left: 45, right: 45, flexDirection: 'row', justifyContent: 'space-between', color: '#8a8494', fontSize: 8, borderTopWidth: 1, borderTopColor: '#e4e0ea', paddingTop: 7 },
  photoTitle: { fontSize: 16, color: purple, fontWeight: 700, marginTop: 18, marginBottom: 12 },
  photo: { width: '100%', height: 590, objectFit: 'contain', backgroundColor: '#f6f4fa' },
  signatures: { flexDirection: 'row', gap: 24, marginTop: 34 },
  signature: { width: '48%', alignItems: 'center' },
  signatureImage: { width: 190, height: 70, objectFit: 'contain' },
  signatureLine: { width: '100%', borderTopWidth: 1, borderTopColor: '#4a4552', paddingTop: 5, textAlign: 'center' },
  signatureMeta: { textAlign: 'center', color: '#777180', fontSize: 8, marginTop: 3 }
})

function Footer({ protocol }: { protocol: string }) {
  return <View style={styles.footer} fixed><Text>A4 Solutions • Relatório de Implantação</Text><Text>{protocol}</Text></View>
}

function Header({ logoUrl, protocol, photo }: { logoUrl: string; protocol: string; photo?: boolean }) {
  return <View style={styles.header}><View><Text style={styles.title}>{photo ? 'Relatório Fotográfico' : 'Relatório de Implantação'}</Text><Text style={styles.subtitle}>Documento técnico de instalação e validação</Text><Text style={styles.protocol}>{protocol}</Text></View><Image style={styles.logo} src={logoUrl} /></View>
}

function allPhotos(report: ReportData): PhotoItem[] {
  return [
    ...(report.activityMode !== 'accessory' ? report.corePhotos : []),
    ...report.coreExtensions.flatMap((extension) => extension.photos.map((photo) => ({ ...photo, title: `${extension.name} • ${photo.title}` }))),
    ...(report.activityMode !== 'core' ? report.accessoryPhotos : []),
    ...report.additionalPhotos
  ].filter((photo) => photo.dataUrl)
}

export function ReportPdf({ report, logoUrl }: { report: ReportData; logoUrl: string }) {
  return (
    <Document title={`${report.protocol} - ${report.client}`} author="A4 Solutions">
      <Page size="A4" style={styles.page}>
        <Header logoUrl={logoUrl} protocol={report.protocol} />
        <View style={styles.infoGrid}>
          {[
            ['Cliente', report.client], ['Unidade', report.unit || '—'], ['Técnico', report.technician],
            ['Data', report.date.split('-').reverse().join('/')], ['Veículo/equipamento/local', report.vehicle || '—'],
            ['Tipo', report.activityMode === 'both' ? 'Core e Acessório' : report.activityMode === 'core' ? 'Core' : 'Acessório']
          ].map(([label, value]) => <View style={styles.info} key={label}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}
        </View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Objetivo</Text><Text style={styles.textBox}>{report.objective}</Text></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Detalhes</Text><Text style={styles.textBox}>{report.details}</Text></View>
        {report.hadIssue && <View style={styles.section}><Text style={styles.sectionTitle}>Problema ou apontamento</Text><Text style={styles.issue}>{`Ocorrência: ${report.issueDescription}\nAção realizada: ${report.issueAction}\nSituação: ${report.issueStatus}`}</Text></View>}
        <Footer protocol={report.protocol} />
      </Page>

      {allPhotos(report).map((photo, index) => <Page size="A4" style={styles.page} key={`${photo.id}-${index}`}><Header logoUrl={logoUrl} protocol={report.protocol} photo /><Text style={styles.photoTitle}>{photo.title}</Text><Image style={styles.photo} src={photo.dataUrl} /><Footer protocol={report.protocol} /></Page>)}

      <Page size="A4" style={styles.page}>
        <Header logoUrl={logoUrl} protocol={report.protocol} />
        <Text style={styles.photoTitle}>Validação e assinaturas</Text>
        <Text style={styles.textBox}>As partes abaixo declaram ciência sobre as informações, atividades e resultados apresentados neste relatório.</Text>
        <View style={styles.signatures}>
          <View style={styles.signature}>{report.technicianSignature.dataUrl && <Image style={styles.signatureImage} src={report.technicianSignature.dataUrl} />}<Text style={styles.signatureLine}>{report.technicianSignature.name}</Text><Text style={styles.signatureMeta}>Técnico responsável</Text></View>
          <View style={styles.signature}>{report.clientSignature.dataUrl && <Image style={styles.signatureImage} src={report.clientSignature.dataUrl} />}<Text style={styles.signatureLine}>{report.clientSignature.name}</Text><Text style={styles.signatureMeta}>Cliente / responsável</Text></View>
        </View>
        <Footer protocol={report.protocol} />
      </Page>
    </Document>
  )
}
