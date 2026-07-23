# Contexto de Alterações — SaaS Studio (Sessão de Correção Financeira)

## Resumo Geral

Projeto: SaaS para salões de beleza/barbearias ("SaaS Studio")
Stack: Next.js 14 (App Router), Prisma, PostgreSQL, Auth0
Diretório: `C:\Users\dailt\saas-studio`

Esta sessão corrigiu dois problemas críticos nos cálculos financeiros:
1. **Unidades de consumo vs estoque**: produtos são estocados em unidades (frascos) mas consumidos em medidas menores (ml, g). O sistema não convertia corretamente.
2. **CMV inflado**: o cálculo de custo de mercadoria vendida multiplicava a quantidade bruta em ml pelo custo unitário do frasco inteiro, gerando valores absurdos (ex: R$1000 em vez de R$2).

---

## Problema Original

Exemplo concreto: Shampoo custa R$20/frasco, cada frasco tem 500ml, um serviço usa 50ml.

**Antes (errado):**
- `quantidadeUsada` no ServicoInsumo = 50 (ml)
- Na conclusão do agendamento: `Math.ceil(50) = 50` unidades descontadas do estoque
- MovimentacaoEstoque: `quantidade=50, custoUnitario=20`
- CMV: `50 × 20 = R$1.000` (deveria ser R$2)

**Depois (correto):**
- `quantidadeUsada` no ServicoInsumo = 50 (ml)
- Na conclusão: `50ml / 500ml = 0.1` frascos descontados
- MovimentacaoEstoque: `quantidade=0.1, custoUnitario=20`
- CMV: `0.1 × 20 = R$2`

---

## Schema Prisma — Campos Adicionados ao Produto

```prisma
model Produto {
  // ... campos existentes ...
  unidade              String    @default("un")        // unidade de estoque (un, cx, L, etc.)
  unidadeConsumo       String?                         // unidade de consumo (ml, g, gotas, doses)
  capacidadePorUnidade Decimal?  @db.Decimal(10, 3)    // quantos "unidadeConsumo" cabem em 1 "unidade"
}
```

Já estava no schema e migrado com `prisma db push`. Não precisa rodar novamente.

---

## Arquivos Modificados

### 1. `app/api/estoque/route.ts` — CRUD de produtos

**O que mudou:**
- **POST** (criar produto): agora aceita `unidadeConsumo` e `capacidadePorUnidade` no body e salva no banco
- **PATCH** (editar produto): idem, aceita e atualiza esses campos
- **GET**: já retornava esses campos (feito em sessão anterior)

**Trecho-chave do POST (linha ~77):**
```typescript
const { nome, descricao, categoria, sku, unidade, estoqueMinimo, custoUnitario, precoVenda, quantidadeInicial, unidadeConsumo, capacidadePorUnidade } = body
// ...
const capUnidade = capacidadePorUnidade != null && capacidadePorUnidade !== "" && !isNaN(Number(capacidadePorUnidade)) ? Number(capacidadePorUnidade) : null

const produto = await prisma.produto.create({
  data: {
    // ... outros campos ...
    unidadeConsumo: unidadeConsumo?.trim() || null,
    capacidadePorUnidade: capUnidade,
  },
})
```

**Trecho-chave do PATCH (linha ~137):**
```typescript
...(body.unidadeConsumo !== undefined && { unidadeConsumo: body.unidadeConsumo?.trim() || null }),
...(body.capacidadePorUnidade !== undefined && { capacidadePorUnidade: body.capacidadePorUnidade === "" || body.capacidadePorUnidade == null ? null : Number(body.capacidadePorUnidade) }),
```

---

### 2. `app/api/estoque/corrigir/route.ts` — NOVO ARQUIVO (cleanup de registros antigos)

**Propósito:** Endpoint POST que corrige movimentações de estoque criadas antes da correção. Identifica registros com `quantidade >= 1` e `custoUnitario === custoProduto` em produtos que têm `capacidadePorUnidade`, recalcula a quantidade fracionária e devolve as unidades ao estoque.

**Como usar:** No console do navegador (logado como ADMIN):
```js
fetch('/api/estoque/corrigir', { method: 'POST' }).then(r => r.json()).then(console.log)
```

**Arquivo completo:**
```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermissao } from "@/lib/auth"

export async function POST() {
  const auth = await requirePermissao("ADMIN")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  const movs = await prisma.movimentacaoEstoque.findMany({
    where: {
      estabelecimentoId: estabId,
      tipo: "SAIDA",
      observacao: { startsWith: "Consumo automático" },
    },
    include: {
      produto: {
        select: { id: true, custoUnitario: true, capacidadePorUnidade: true, unidadeConsumo: true },
      },
    },
  })

  let corrigidos = 0
  let estornoEstoque = 0

  for (const mov of movs) {
    const cap = mov.produto.capacidadePorUnidade ? Number(mov.produto.capacidadePorUnidade) : null
    if (!cap || cap <= 0) continue

    const qtdAtual = mov.quantidade
    const custoAtual = Number(mov.custoUnitario ?? 0)
    const custoProduto = Number(mov.produto.custoUnitario)

    if (qtdAtual >= 1 && custoAtual === custoProduto) {
      const qtdCorreta = Math.round((qtdAtual / cap) * 1000) / 1000
      const diferencaEstoque = qtdAtual - qtdCorreta

      await prisma.movimentacaoEstoque.update({
        where: { id: mov.id },
        data: {
          quantidade: qtdCorreta,
          custoUnitario: custoProduto,
          observacao: mov.observacao + " [corrigido]",
        },
      })

      if (diferencaEstoque > 0) {
        await prisma.produto.update({
          where: { id: mov.produto.id },
          data: { quantidade: { increment: Math.round(diferencaEstoque) } },
        })
        estornoEstoque += diferencaEstoque
      }
      corrigidos++
    }
  }

  return NextResponse.json({
    message: `${corrigidos} movimentação(ões) corrigida(s). ${Math.round(estornoEstoque)} unidades devolvidas ao estoque.`,
    corrigidos,
    estornoEstoque: Math.round(estornoEstoque),
  })
}
```

---

### 3. `app/api/agenda/route.ts` — Baixa automática de estoque (linhas ~386-425)

**O que mudou:** A lógica de desconto de estoque ao concluir um agendamento agora converte unidades de consumo para fração de estoque.

**Antes:**
```typescript
const qtd = Math.ceil(Number(insumo.quantidadeUsada))  // 50ml → 50 unidades!
custoUnitario: custoConsumo  // custo total, não por unidade
```

**Depois:**
```typescript
const capacidade = insumo.produto.capacidadePorUnidade ? Number(insumo.produto.capacidadePorUnidade) : null
const qtdEstoque = capacidade && capacidade > 0
  ? Math.round((quantidadeUsada / capacidade) * 1000) / 1000  // 50/500 = 0.1
  : quantidadeUsada

// ...
quantidade: qtdEstoque,                    // 0.1 (fração de unidade)
custoUnitario: insumo.produto.custoUnitario, // R$20 (custo por unidade inteira)
// CMV = 0.1 × 20 = R$2 ✓
```

O include do produto agora traz `unidadeConsumo` e `capacidadePorUnidade`:
```typescript
include: { produto: { select: { id: true, quantidade: true, custoUnitario: true, nome: true, unidadeConsumo: true, capacidadePorUnidade: true } } },
```

---

### 4. `app/api/servicos/insumos/route.ts` — API de insumos por serviço

**O que mudou:**
- GET agora inclui `unidadeConsumo` e `capacidadePorUnidade` na resposta
- Cálculo de custo usa conversão: `(qtd / capacidade) × custoUnitario`

**Trecho-chave:**
```typescript
const calcCusto = (i: typeof insumos[0]) => {
  const qtd = Number(i.quantidadeUsada)
  const custoUnit = Number(i.produto.custoUnitario)
  const cap = i.produto.capacidadePorUnidade ? Number(i.produto.capacidadePorUnidade) : null
  if (cap && cap > 0) return (qtd / cap) * custoUnit
  return qtd * custoUnit
}
```

---

### 5. `app/api/financeiro/route.ts` — Dashboard financeiro principal

**O que mudou:**
- Removida query `movSaidas` aggregate não utilizada
- **Margem por serviço** agora inclui `capacidadePorUnidade` na query e usa a fórmula de conversão:

```typescript
insumos: { include: { produto: { select: { custoUnitario: true, capacidadePorUnidade: true } } } },

// Cálculo:
const custoInsumos = s.insumos.reduce((sum, i) => {
  const qtd = Number(i.quantidadeUsada)
  const custoUnit = Number(i.produto.custoUnitario)
  const cap = i.produto.capacidadePorUnidade ? Number(i.produto.capacidadePorUnidade) : null
  if (cap && cap > 0) return sum + (qtd / cap) * custoUnit
  return sum + qtd * custoUnit
}, 0)
```

- **CMV** (`cmvTotal`): a fórmula `quantidade × custoUnitario` não mudou, pois está correta quando os dados são armazenados corretamente (quantidade em fração de unidade, custoUnitario por unidade inteira).

---

### 6. `app/api/financeiro/dre/route.ts` — DRE simplificada

**Sem alteração de código.** A fórmula do CMV (`quantidade × custoUnitario`) já estava correta. O problema eram os dados armazenados incorretamente, que são corrigidos pelo endpoint `/api/estoque/corrigir`.

---

### 7. `app/estoque/page.tsx` — UI de estoque

**O que mudou:**
- Interface `Produto` agora tem `unidadeConsumo` e `capacidadePorUnidade`
- Constantes: adicionada `unidadesConsumo = ["", "ml", "g", "gotas", "doses"]` e `emptyProd` com campos novos
- `openEdit`: preenche os novos campos ao editar
- **Modal de produto**: adicionados campos "Unidade de consumo" (select) e "Capacidade por unidade" (number input) com hint explicativo
- **Tabela de produtos**: mostra `500ml/un` quando o produto tem unidade de consumo configurada

---

### 8. `app/configuracoes/page.tsx` — Modal de insumos por serviço

**O que mudou:**
- States `insumos` e `produtos` agora incluem `unidadeConsumo` e `capacidadePorUnidade`
- `abrirInsumos`: carrega esses campos da API
- `adicionarInsumo`: propaga os campos ao criar novo insumo
- **Select de produto**: mostra info de consumo: `Shampoo (ml · 500ml/un)` em vez de `Shampoo (un)`
- **Input de quantidade**: mostra label da unidade de consumo (ex: "ml") abaixo do input
- **Cálculo de custo**: usa `(qtd / capacidade) × custoUnitario` quando há capacidade
- **Custo total**: mesma fórmula de conversão no somatório

---

### 9. `.claude/launch.json` — Configuração do dev server

Atualizado para funcionar com o preview tool do Claude Code:
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "dev",
      "runtimeExecutable": "C:\\Program Files\\nodejs\\node.exe",
      "runtimeArgs": ["node_modules/next/dist/bin/next", "dev"],
      "port": 3000,
      "autoPort": false
    }
  ]
}
```

---

## Fórmula Universal de Custo (usada em todos os pontos)

```
Se produto tem capacidadePorUnidade:
  custoConsumo = (quantidadeUsada / capacidadePorUnidade) × custoUnitario
  
Senão (produto sem unidade de consumo):
  custoConsumo = quantidadeUsada × custoUnitario
```

Exemplo: Shampoo (R$20/frasco, 500ml/frasco), serviço usa 50ml:
- `(50 / 500) × 20 = R$2,00`

---

## Pontos de cálculo (todos usando a mesma fórmula)

| Arquivo | Função | O que calcula |
|---------|--------|---------------|
| `agenda/route.ts` | Conclusão de agendamento | Baixa de estoque (MovimentacaoEstoque) |
| `financeiro/route.ts` | GET dashboard | CMV mensal + margem por serviço |
| `financeiro/dre/route.ts` | GET DRE | CMV na DRE (usa dados da MovimentacaoEstoque) |
| `servicos/insumos/route.ts` | GET insumos | Custo por insumo e custo total |
| `configuracoes/page.tsx` | Modal insumos | Preview de custo na UI |

---

## Ação pendente para o usuário

Executar a correção dos registros antigos no console do navegador (F12):
```js
fetch('/api/estoque/corrigir', { method: 'POST' }).then(r => r.json()).then(console.log)
```

Isso corrige as movimentações que foram criadas com a lógica antiga e devolve unidades ao estoque.

---

## Notas sobre o ambiente

- Auth0 exige callback em `http://localhost:3000` — não alterar a porta
- `.env` e `.env.local` contêm credenciais — NÃO commitar
- Prisma client precisa ser regenerado após mudanças no schema: `npx prisma generate`
- Dev server: `npx next dev` (porta 3000)
- O componente `Modal` exige prop `open={boolean}` e `ModalActions` exige `onCancel/onSave/saving`

---
---

# 2ª Onda de Features Financeiras — Comissões, Contas a Pagar, Relatórios

Sessão seguinte à correção de CMV/estoque. Foram implementadas 3 features novas e feita a sincronização da página principal do Financeiro com a nova página de Contas a Pagar.

## Feature #5 — Comissões Avançadas (4 modelos)

Antes, a comissão era calculada por uma fórmula estática (`receitaTotal × comissaoPadrao%`). Agora existem 4 modelos por profissional, com registros reais de `Comissao` gerados na conclusão do agendamento.

**Modelos (`modeloComissao` no Profissional):**

| Modelo | Cálculo |
|--------|---------|
| `PERCENTUAL_FIXO` | % fixo sobre o total do atendimento |
| `PERCENTUAL_SERVICO` | % por serviço (via `ComissaoServico`), fallback para `comissaoPadrao` |
| `VALOR_FIXO` | valor fixo por atendimento (`valorFixoComissao`) |
| `LOCACAO_CADEIRA` | sem comissão (profissional aluga a cadeira) |

**Arquivos:**
- `app/api/agenda/route.ts` (linhas ~365-418) — cálculo da comissão na conclusão do agendamento, suportando os 4 modelos. Grava o campo `modelo` no registro `Comissao`.
- `app/api/comissoes/route.ts` — **NOVO**. `GET` lista comissões agrupadas por profissional com filtros (`profissionalId`, `mes`, `status`). `PATCH` marca comissões como pagas por array de IDs. Retorna `{ profissionais, totais: { totalGeral, totalPago, totalPendente } }`.
- `app/api/comissoes/fechamento/route.ts` — **NOVO**. `GET` lista fechamentos passados. `POST` fecha um período atomicamente via `prisma.$transaction` — cria `FechamentoComissao` e marca todas as comissões incluídas como pagas.
- `app/api/profissionais/[id]/comissao-servico/route.ts` — **NOVO**. `GET` retorna config de comissão do profissional + todos os serviços com taxas customizadas. `PUT` atualiza o modelo e faz upsert das taxas por serviço.
- `app/financeiro/comissoes/page.tsx` — **NOVA página**. KPIs, comissões agrupadas por profissional, pagamento em lote, modal de fechamento de período, botão de exportação.

## Feature #6 — Contas a Pagar + Fornecedores

Fluxo de status: `PENDENTE` → `VENCIDO` (automático quando `dataVencimento < hoje`) → `PAGO` (cria `Transacao` de despesa).

**Arquivos:**
- `app/api/financeiro/contas-pagar/route.ts` — **NOVO**. CRUD completo. Marca vencidas automaticamente (`marcarVencidas`), estatísticas de resumo. `PATCH` para `PAGO` cria uma `Transacao`. `DELETE` bloqueia contas já pagas.
- `app/api/fornecedores/route.ts` — **NOVO**. CRUD com soft-delete (`ativo=false`).
- `app/financeiro/contas-pagar/page.tsx` — **NOVA página**. KPIs (pendente, vencido, pago, próximos 7 dias), gestão de contas, modal de fornecedores, gestão de status.

## Feature #7 — Relatórios / Exportações

- `app/api/relatorios/route.ts` — **NOVO**. `GET` gera relatórios de DRE, comissões ou fluxo-de-caixa em XLSX (via `exceljs`) ou CSV com BOM UTF-8. Faz fallback para CSV se `exceljs` não estiver instalado.
- Botões de exportação adicionados em `app/financeiro/page.tsx` (`tipo=fluxo-caixa`) e `app/financeiro/dre/page.tsx` (`tipo=dre`).
- Dependência `exceljs` instalada.

## Schema Prisma — Relações adicionadas

O model `FechamentoComissao` estava sem relações. Adicionadas:
```prisma
model FechamentoComissao {
  // ...
  estabelecimento Estabelecimento @relation(fields: [estabelecimentoId], references: [id])
  profissional    Profissional    @relation(fields: [profissionalId], references: [id])
}
model Profissional {
  // ...
  fechamentos FechamentoComissao[]
}
model Estabelecimento {
  // ...
  fechamentosComissao FechamentoComissao[]
}
```
Rodado `prisma db push` + `prisma generate` com sucesso.

---

## Sincronização da página Financeiro ↔ Contas a Pagar

A página principal (`/financeiro`) tinha seções de contas a receber/despesas dessincronizadas com a nova página de Contas a Pagar. Correções feitas:

### `app/api/financeiro/route.ts`

1. **Comissões reais**: substituída a fórmula estática por registros reais de `Comissao` via `groupBy`:
```typescript
const comissoesReais = await prisma.comissao.groupBy({
  by: ["profissionalId"],
  where: { agendamento: { estabelecimentoId: estabId, status: "CONCLUIDO", dataHoraInicio: { gte: inicioMesAtual, lt: fimMesAtual } } },
  _sum: { valorComissao: true, valorBase: true },
})
// Fallback para comissaoPadrao caso não haja registro
```
2. **Despesas do mês**: o aggregate de despesas passou a filtrar pelo mês atual (`dataTransacao: { gte: inicioMesAtual, lt: fimMesAtual }`) em vez de todo o histórico. `inicioMesAtual`/`fimMesAtual` movidos para o topo do handler `GET`.
3. **Resumo de Contas a Pagar** adicionado à resposta. Marca vencidas automaticamente e retorna pendente/vencido (totais + contagem) e as 5 próximas contas vencendo em 7 dias:
```typescript
const proxSemana = new Date(hoje); proxSemana.setDate(proxSemana.getDate() + 7)
await prisma.contaPagar.updateMany({
  where: { estabelecimentoId: estabId, status: "PENDENTE", dataVencimento: { lt: hoje } },
  data: { status: "VENCIDO" },
})
// contasPagar: { totalPendente, countPendente, totalVencido, countVencido, proximas[] }
```
> ⚠️ Cuidado com colisão de nomes: já existe `em7dias` na seção de projeção — a variável de contas a pagar foi nomeada `proxSemana`.

### `app/financeiro/page.tsx`

- Adicionada interface `ContasPagarData` e campo opcional `contasPagar` em `FinanceiroData`.
- Nova seção **"Contas a pagar"** entre "Contas a receber" e "Despesas recorrentes":
  - Badges de contagem (pendentes / vencidas)
  - Cards de KPI (total pendente em âmbar, total vencido em vermelho)
  - Lista das próximas 5 contas vencendo em 7 dias, com indicador de status
  - Link "Ver todas →" para `/financeiro/contas-pagar`

---

## Navegação do Financeiro

Botões no cabeçalho de `/financeiro`: **Registrar despesa**, **Exportar** (fluxo-de-caixa CSV), **Comissões** (`/financeiro/comissoes`), **Contas a pagar** (`/financeiro/contas-pagar`), **DRE** (`/financeiro/dre`), **Formas de pagamento**.

---

## Padrões e observações desta onda

- Todos os endpoints usam scoping multi-tenant por `estabelecimentoId` (via `getUsuarioLogado`/`requirePermissao`).
- Middleware protege todas as rotas — chamadas de API sem sessão retornam 401 e redirecionam para o Auth0 (esperado ao testar via `curl`).
- Cache do webpack pode reter erros antigos após renomear variáveis; se um erro de compilação persistir mesmo após corrigir, limpar `.next/cache` e reiniciar o dev server.
- Ação pendente do usuário permanece: rodar `fetch('/api/estoque/corrigir', { method: 'POST' })` no console para corrigir registros de estoque antigos.
