# SaaS Studio — Protótipo

Protótipo funcional do sistema de agendamento e inteligência operacional para salões de beleza, barbearias e clínicas.

## Stack

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Recharts** (gráficos)
- **Lucide React** (ícones)

## Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Rode o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:3000** no navegador.

## Estrutura do projeto

```
saas-studio/
├── app/
│   ├── layout.tsx              ← Layout raiz (sidebar + topbar)
│   ├── page.tsx                ← Redireciona para /dashboard
│   ├── globals.css             ← Estilos globais + Tailwind
│   ├── dashboard/
│   │   └── page.tsx            ← ✅ DASHBOARD (prototipado)
│   ├── clientes/
│   │   ├── page.tsx            ← Lista de clientes
│   │   └── [id]/
│   │       └── page.tsx        ← ✅ PERFIL DO CLIENTE (prototipado)
│   ├── agenda/                 ← 🚧 Em desenvolvimento
│   ├── financeiro/             ← 🚧 Em desenvolvimento
│   ├── retencao/               ← 🚧 Em desenvolvimento
│   ├── ia/                     ← 🚧 Em desenvolvimento
│   ├── profissionais/          ← 🚧 Em desenvolvimento
│   └── configuracoes/          ← 🚧 Em desenvolvimento
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx       ← Shell principal (sidebar + topbar + content)
│   │   ├── sidebar.tsx         ← Navegação lateral
│   │   └── topbar.tsx          ← Barra superior com busca
│   └── ui/
│       └── cards.tsx           ← Componentes reutilizáveis (KPI, badges, AI cards)
├── lib/
│   └── data.ts                 ← Dados mock + tipos TypeScript
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Telas disponíveis

| Tela | Rota | Status |
|------|------|--------|
| Dashboard | `/dashboard` | ✅ Pronto |
| Perfil do Cliente | `/clientes/carla-souza` | ✅ Pronto |
| Lista de Clientes | `/clientes` | ✅ Pronto |
| Agenda | `/agenda` | 🚧 Placeholder |
| Financeiro | `/financeiro` | 🚧 Placeholder |
| Retenção | `/retencao` | 🚧 Placeholder |
| Assistente IA | `/ia` | 🚧 Placeholder |
| Profissionais | `/profissionais` | 🚧 Placeholder |
| Configurações | `/configuracoes` | 🚧 Placeholder |

## Navegação

- Clique nos nomes dos clientes na agenda do dashboard para abrir o perfil
- Use a sidebar para navegar entre as seções
- Clique no botão ☰ na topbar para expandir/recolher a sidebar

## Próximos passos

1. Prototipar as telas de Agenda e Financeiro
2. Integrar com backend Node.js + PostgreSQL + Prisma
3. Implementar autenticação com Auth0
4. Conectar dados reais via API REST
