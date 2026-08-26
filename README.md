# Relatório de Implantação A4

Aplicação PWA para criação de relatórios em campo e consulta administrativa. A interface é única, mas o conteúdo muda conforme o perfil autenticado.

## Funcionalidades

- Perfil técnico sem consulta aos relatórios finalizados.
- Fluxos Core, Acessório ou Core + Acessório.
- Core Extensions adicionáveis e removíveis.
- Até cinco acessórios e fotos adicionais livres.
- Compressão de fotografias antes do PDF.
- Assinatura do técnico e do cliente na tela.
- PDF A4 com texto selecionável.
- Rascunho offline no IndexedDB.
- Painel administrativo com filtros e download.
- Criação de novos administradores pelo próprio painel.
- Download local do PDF sem envio obrigatório.
- Supabase preparado para Auth, PostgreSQL, Storage e RLS.
- Política de retenção preparada para 900 MB → 750 MB.

## Executar localmente

Requer Node.js LTS.

```bash
npm install
npm run dev
```

Sem arquivo `.env`, o sistema inicia em modo de demonstração. O formulário técnico permanece livre e os dados ficam somente no navegador.

No primeiro acesso administrativo em modo local, o sistema solicita a criação do e-mail e da senha. Esse acesso fica protegido somente no navegador utilizado e deve ser substituído assim que o Supabase estiver conectado.

## Conectar ao Supabase

1. Crie um projeto no Supabase.
2. Execute `supabase/migrations/001_initial_schema.sql` no SQL Editor.
3. Crie usuários em Authentication.
4. Ative **Anonymous Sign-Ins** em Authentication para permitir o formulário livre aos técnicos.
5. Altere o perfil do usuário administrativo na tabela `profiles` para a função `admin`.
6. Copie `.env.example` para `.env.local` e preencha URL e chave publicável.
7. Publique a função `manage-admins` para permitir que administradores criem outros acessos.

Nunca coloque a chave `service_role` no frontend ou no GitHub.

## Cloudflare

- Build command: `npm run build`
- Output directory: `dist`
- Variáveis: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`

O endereço gratuito será criado no formato `nome-do-projeto.pages.dev`.
