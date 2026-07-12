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
