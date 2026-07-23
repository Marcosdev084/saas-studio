import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermissao } from "@/lib/auth"

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

function parseMes(mesParam: string | null): { inicio: Date; fim: Date; ano: number; mes: number } {
  const agora = new Date()
  let ano: number, mes: number

  if (mesParam) {
    const [a, m] = mesParam.split("-").map(Number)
    ano = a
    mes = m - 1
  } else {
    ano = agora.getFullYear()
    mes = agora.getMonth()
  }

  const inicio = new Date(ano, mes, 1)
  const fim = new Date(ano, mes + 1, 1)
  return { inicio, fim, ano, mes }
}

function csvEscape(value: string | number | null | undefined): string {
  const str = String(value ?? "")
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const bom = "﻿"
  const headerLine = headers.map(csvEscape).join(",")
  const dataLines = rows.map((row) => row.map(csvEscape).join(","))
  return bom + [headerLine, ...dataLines].join("\r\n")
}

let ExcelJS: any = null
try {
  ExcelJS = require("exceljs")
} catch {
  // exceljs not installed — will fall back to CSV
}

async function gerarDRE(estabId: string, inicio: Date, fim: Date) {
  const estab = await prisma.estabelecimento.findUnique({
    where: { id: estabId },
    select: { proLabore: true },
  })

  const receitaAgg = await prisma.agendamento.aggregate({
    where: { estabelecimentoId: estabId, status: "CONCLUIDO", dataHoraInicio: { gte: inicio, lt: fim } },
    _sum: { valorTotal: true },
  })
  const receitaBruta = Number(receitaAgg._sum.valorTotal ?? 0)

  const taxasAgg = await prisma.transacao.aggregate({
    where: { estabelecimentoId: estabId, tipo: "DESPESA", categoria: "Taxa de pagamento", dataTransacao: { gte: inicio, lt: fim } },
    _sum: { valor: true },
  })
  const taxas = Number(taxasAgg._sum.valor ?? 0)

  const receitaLiquida = receitaBruta - taxas

  const cmvMovs = await prisma.movimentacaoEstoque.findMany({
    where: { estabelecimentoId: estabId, tipo: "SAIDA", criadoEm: { gte: inicio, lt: fim } },
    select: { quantidade: true, custoUnitario: true },
  })
  const cmv = cmvMovs.reduce((sum, m) => sum + m.quantidade * Number(m.custoUnitario ?? 0), 0)

  const lucroBruto = receitaLiquida - cmv

  const despOpAgg = await prisma.transacao.aggregate({
    where: {
      estabelecimentoId: estabId,
      tipo: "DESPESA",
      dataTransacao: { gte: inicio, lt: fim },
      NOT: { categoria: "Taxa de pagamento" },
    },
    _sum: { valor: true },
  })
  const despesasOperacionais = Number(despOpAgg._sum.valor ?? 0)

  const despPorCat = await prisma.transacao.groupBy({
    by: ["categoria"],
    where: {
      estabelecimentoId: estabId,
      tipo: "DESPESA",
      dataTransacao: { gte: inicio, lt: fim },
      NOT: { categoria: "Taxa de pagamento" },
    },
    _sum: { valor: true },
    orderBy: { _sum: { valor: "desc" } },
  })

  const comissoesAgg = await prisma.comissao.aggregate({
    where: {
      agendamento: { estabelecimentoId: estabId, dataHoraInicio: { gte: inicio, lt: fim }, status: "CONCLUIDO" },
    },
    _sum: { valorComissao: true },
  })
  const comissoes = Number(comissoesAgg._sum.valorComissao ?? 0)

  const ebitda = lucroBruto - despesasOperacionais - comissoes
  const proLabore = Number(estab?.proLabore ?? 0)
  const lucroLiquido = ebitda - proLabore

  return {
    dreRows: [
      { label: "Receita Bruta", valor: receitaBruta },
      { label: "(-) Taxas de Pagamento", valor: -taxas },
      { label: "= Receita Liquida", valor: receitaLiquida },
      { label: "(-) CMV (Custo Mercadoria Vendida)", valor: -cmv },
      { label: "= Lucro Bruto", valor: lucroBruto },
      { label: "(-) Despesas Operacionais", valor: -despesasOperacionais },
      { label: "(-) Comissoes", valor: -comissoes },
      { label: "= EBITDA", valor: ebitda },
      { label: "(-) Pro-labore", valor: -proLabore },
      { label: "= Lucro Liquido", valor: lucroLiquido },
    ],
    despesasPorCategoria: despPorCat.map((d) => ({
      categoria: d.categoria ?? "Sem categoria",
      valor: Number(d._sum.valor ?? 0),
    })),
  }
}

async function gerarDREExcel(estabId: string, inicio: Date, fim: Date): Promise<Buffer> {
  const { dreRows, despesasPorCategoria } = await gerarDRE(estabId, inicio, fim)
  const workbook = new ExcelJS.Workbook()

  const sheetDRE = workbook.addWorksheet("DRE")
  sheetDRE.columns = [
    { header: "Item", key: "label", width: 40 },
    { header: "Valor", key: "valor", width: 20 },
  ]
  for (const row of dreRows) {
    const r = sheetDRE.addRow({ label: row.label, valor: formatCurrency(row.valor) })
    if (row.label.startsWith("=")) r.font = { bold: true }
  }

  const sheetDetalhe = workbook.addWorksheet("Detalhamento")
  sheetDetalhe.columns = [
    { header: "Categoria", key: "categoria", width: 30 },
    { header: "Valor", key: "valor", width: 20 },
  ]
  for (const d of despesasPorCategoria) {
    sheetDetalhe.addRow({ categoria: d.categoria, valor: formatCurrency(d.valor) })
  }

  return await workbook.xlsx.writeBuffer()
}

function gerarDRECSV(dreRows: { label: string; valor: number }[], despesasPorCategoria: { categoria: string; valor: number }[]): string {
  const headers = ["Item", "Valor"]
  const rows: (string | number)[][] = dreRows.map((r) => [r.label, formatCurrency(r.valor)])
  rows.push(["", ""])
  rows.push(["--- Detalhamento por Categoria ---", ""])
  for (const d of despesasPorCategoria) {
    rows.push([d.categoria, formatCurrency(d.valor)])
  }
  return toCSV(headers, rows)
}

async function gerarComissoes(estabId: string, inicio: Date, fim: Date) {
  const comissoes = await prisma.comissao.findMany({
    where: {
      agendamento: {
        estabelecimentoId: estabId,
        dataHoraInicio: { gte: inicio, lt: fim },
        status: "CONCLUIDO",
      },
    },
    include: {
      profissional: { select: { nome: true, modeloComissao: true } },
      agendamento: {
        select: {
          dataHoraInicio: true,
          valorTotal: true,
          cliente: { select: { nome: true } },
          servicos: { select: { servico: { select: { nome: true } } } },
        },
      },
    },
    orderBy: { criadoEm: "asc" },
  })

  const resumoMap = new Map<string, { nome: string; modelo: string; totalBase: number; totalComissao: number; pago: number; naoPago: number }>()

  for (const c of comissoes) {
    const key = c.profissionalId
    const existing = resumoMap.get(key) ?? { nome: c.profissional.nome, modelo: c.profissional.modeloComissao, totalBase: 0, totalComissao: 0, pago: 0, naoPago: 0 }
    existing.totalBase += Number(c.valorBase)
    existing.totalComissao += Number(c.valorComissao)
    if (c.pago) existing.pago += Number(c.valorComissao)
    else existing.naoPago += Number(c.valorComissao)
    resumoMap.set(key, existing)
  }

  const resumo = Array.from(resumoMap.values())
  const detalhado = comissoes.map((c) => ({
    data: c.agendamento.dataHoraInicio.toLocaleDateString("pt-BR"),
    profissional: c.profissional.nome,
    cliente: c.agendamento.cliente.nome,
    servico: c.agendamento.servicos.map((s) => s.servico.nome).join(", "),
    valorBase: Number(c.valorBase),
    percentual: Number(c.percentual),
    valorComissao: Number(c.valorComissao),
    status: c.pago ? "Pago" : "Pendente",
  }))

  return { resumo, detalhado }
}

async function gerarComissoesExcel(estabId: string, inicio: Date, fim: Date): Promise<Buffer> {
  const { resumo, detalhado } = await gerarComissoes(estabId, inicio, fim)
  const workbook = new ExcelJS.Workbook()

  const sheetResumo = workbook.addWorksheet("Resumo")
  sheetResumo.columns = [
    { header: "Profissional", key: "nome", width: 25 },
    { header: "Modelo", key: "modelo", width: 20 },
    { header: "Total Base", key: "totalBase", width: 18 },
    { header: "Total Comissao", key: "totalComissao", width: 18 },
    { header: "Pago", key: "pago", width: 18 },
    { header: "Pendente", key: "naoPago", width: 18 },
  ]
  for (const r of resumo) {
    sheetResumo.addRow({ nome: r.nome, modelo: r.modelo, totalBase: formatCurrency(r.totalBase), totalComissao: formatCurrency(r.totalComissao), pago: formatCurrency(r.pago), naoPago: formatCurrency(r.naoPago) })
  }

  const sheetDetalhado = workbook.addWorksheet("Detalhado")
  sheetDetalhado.columns = [
    { header: "Data", key: "data", width: 12 },
    { header: "Profissional", key: "profissional", width: 25 },
    { header: "Cliente", key: "cliente", width: 25 },
    { header: "Servico", key: "servico", width: 30 },
    { header: "Valor Base", key: "valorBase", width: 18 },
    { header: "% Comissao", key: "percentual", width: 12 },
    { header: "Valor Comissao", key: "valorComissao", width: 18 },
    { header: "Status", key: "status", width: 12 },
  ]
  for (const d of detalhado) {
    sheetDetalhado.addRow({ data: d.data, profissional: d.profissional, cliente: d.cliente, servico: d.servico, valorBase: formatCurrency(d.valorBase), percentual: `${d.percentual}%`, valorComissao: formatCurrency(d.valorComissao), status: d.status })
  }

  return await workbook.xlsx.writeBuffer()
}

function gerarComissoesCSV(detalhado: { data: string; profissional: string; cliente: string; servico: string; valorBase: number; percentual: number; valorComissao: number; status: string }[]): string {
  const headers = ["Data", "Profissional", "Cliente", "Servico", "Valor Base", "% Comissao", "Valor Comissao", "Status"]
  const rows = detalhado.map((d) => [d.data, d.profissional, d.cliente, d.servico, formatCurrency(d.valorBase), `${d.percentual}%`, formatCurrency(d.valorComissao), d.status])
  return toCSV(headers, rows)
}

async function gerarFluxoCaixa(estabId: string, inicio: Date, fim: Date) {
  const transacoes = await prisma.transacao.findMany({
    where: { estabelecimentoId: estabId, dataTransacao: { gte: inicio, lt: fim } },
    orderBy: { dataTransacao: "asc" },
  })

  let saldoAcumulado = 0
  const fluxo = transacoes.map((t) => {
    const valor = Number(t.valor)
    const sinal = t.tipo === "RECEITA" ? 1 : -1
    saldoAcumulado += valor * sinal
    return { data: t.dataTransacao.toLocaleDateString("pt-BR"), tipo: t.tipo, descricao: t.descricao, categoria: t.categoria ?? "Sem categoria", valor: valor * sinal, saldoAcumulado }
  })

  const categoriaMap = new Map<string, { receita: number; despesa: number }>()
  for (const t of transacoes) {
    const cat = t.categoria ?? "Sem categoria"
    const existing = categoriaMap.get(cat) ?? { receita: 0, despesa: 0 }
    const valor = Number(t.valor)
    if (t.tipo === "RECEITA") existing.receita += valor
    else existing.despesa += valor
    categoriaMap.set(cat, existing)
  }

  const resumo = Array.from(categoriaMap.entries()).map(([categoria, vals]) => ({
    categoria, receita: vals.receita, despesa: vals.despesa, saldo: vals.receita - vals.despesa,
  }))

  return { fluxo, resumo }
}

async function gerarFluxoCaixaExcel(estabId: string, inicio: Date, fim: Date): Promise<Buffer> {
  const { fluxo, resumo } = await gerarFluxoCaixa(estabId, inicio, fim)
  const workbook = new ExcelJS.Workbook()

  const sheetFluxo = workbook.addWorksheet("Fluxo de Caixa")
  sheetFluxo.columns = [
    { header: "Data", key: "data", width: 12 },
    { header: "Tipo", key: "tipo", width: 12 },
    { header: "Descricao", key: "descricao", width: 35 },
    { header: "Categoria", key: "categoria", width: 20 },
    { header: "Valor", key: "valor", width: 18 },
    { header: "Saldo Acumulado", key: "saldoAcumulado", width: 18 },
  ]
  for (const f of fluxo) {
    sheetFluxo.addRow({ data: f.data, tipo: f.tipo, descricao: f.descricao, categoria: f.categoria, valor: formatCurrency(f.valor), saldoAcumulado: formatCurrency(f.saldoAcumulado) })
  }

  const sheetResumo = workbook.addWorksheet("Resumo")
  sheetResumo.columns = [
    { header: "Categoria", key: "categoria", width: 25 },
    { header: "Receita", key: "receita", width: 18 },
    { header: "Despesa", key: "despesa", width: 18 },
    { header: "Saldo", key: "saldo", width: 18 },
  ]
  for (const r of resumo) {
    sheetResumo.addRow({ categoria: r.categoria, receita: formatCurrency(r.receita), despesa: formatCurrency(r.despesa), saldo: formatCurrency(r.saldo) })
  }

  return await workbook.xlsx.writeBuffer()
}

function gerarFluxoCaixaCSV(fluxo: { data: string; tipo: string; descricao: string; categoria: string; valor: number; saldoAcumulado: number }[]): string {
  const headers = ["Data", "Tipo", "Descricao", "Categoria", "Valor", "Saldo Acumulado"]
  const rows = fluxo.map((f) => [f.data, f.tipo, f.descricao, f.categoria, formatCurrency(f.valor), formatCurrency(f.saldoAcumulado)])
  return toCSV(headers, rows)
}

export async function GET(request: Request) {
  const auth = await requirePermissao("ADMIN", "GERENTE")
  if (auth.error) return auth.error
  const estabId = auth.usuario.estabelecimentoId

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get("tipo")
  const mesParam = searchParams.get("mes")
  const formato = searchParams.get("formato") ?? "xlsx"

  if (!tipo || !["dre", "comissoes", "fluxo-caixa"].includes(tipo)) {
    return NextResponse.json({ error: "Parametro 'tipo' invalido. Use: dre, comissoes, fluxo-caixa" }, { status: 400 })
  }

  if (formato !== "xlsx" && formato !== "csv") {
    return NextResponse.json({ error: "Parametro 'formato' invalido. Use: xlsx, csv" }, { status: 400 })
  }

  const { inicio, fim } = parseMes(mesParam)
  const mesLabel = mesParam ?? `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}`

  try {
    if (formato === "csv") {
      let csvString: string

      if (tipo === "dre") {
        const { dreRows, despesasPorCategoria } = await gerarDRE(estabId, inicio, fim)
        csvString = gerarDRECSV(dreRows, despesasPorCategoria)
      } else if (tipo === "comissoes") {
        const { detalhado } = await gerarComissoes(estabId, inicio, fim)
        csvString = gerarComissoesCSV(detalhado)
      } else {
        const { fluxo } = await gerarFluxoCaixa(estabId, inicio, fim)
        csvString = gerarFluxoCaixaCSV(fluxo)
      }

      return new Response(csvString, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="relatorio-${tipo}-${mesLabel}.csv"`,
        },
      })
    }

    if (!ExcelJS) {
      let csvString: string

      if (tipo === "dre") {
        const { dreRows, despesasPorCategoria } = await gerarDRE(estabId, inicio, fim)
        csvString = gerarDRECSV(dreRows, despesasPorCategoria)
      } else if (tipo === "comissoes") {
        const { detalhado } = await gerarComissoes(estabId, inicio, fim)
        csvString = gerarComissoesCSV(detalhado)
      } else {
        const { fluxo } = await gerarFluxoCaixa(estabId, inicio, fim)
        csvString = gerarFluxoCaixaCSV(fluxo)
      }

      return new Response(csvString, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="relatorio-${tipo}-${mesLabel}.csv"`,
          "X-Fallback": "exceljs not installed - returning CSV instead of XLSX",
        },
      })
    }

    let buffer: Buffer | Uint8Array

    if (tipo === "dre") {
      buffer = await gerarDREExcel(estabId, inicio, fim)
    } else if (tipo === "comissoes") {
      buffer = await gerarComissoesExcel(estabId, inicio, fim)
    } else {
      buffer = await gerarFluxoCaixaExcel(estabId, inicio, fim)
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio-${tipo}-${mesLabel}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("[relatorios] Erro ao gerar relatorio:", error)
    return NextResponse.json({ error: "Erro ao gerar relatorio" }, { status: 500 })
  }
}
