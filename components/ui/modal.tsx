"use client"

import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-accent-900/50 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className={`relative glass-solid rounded-2xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto animate-slide-in`}>
        <div className="flex items-center justify-between p-5 border-b border-surface-border-light sticky top-0 bg-surface-card/80 backdrop-blur-xl rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-base-primary">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-2xl hover:bg-surface-border-light flex items-center justify-center text-base-muted">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}

export function Field({ label, value, onChange, type = "text", placeholder = "", required = false }: FieldProps) {
  return (
    <div>
      <label className="text-xs font-medium text-base-secondary mb-1.5 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-surface-card/60 border border-accent-800/[0.07] rounded-xl text-sm text-base-primary focus:outline-none focus:ring-[3px] focus:ring-accent-400/20 focus:border-accent-400/60 focus:bg-surface-card"
      />
    </div>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
}

export function SelectField({ label, value, onChange, options, required }: SelectFieldProps) {
  return (
    <div>
      <label className="text-xs font-medium text-base-secondary mb-1.5 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-surface-card/60 border border-accent-800/[0.07] rounded-xl text-sm text-base-primary focus:outline-none focus:ring-[3px] focus:ring-accent-400/20 focus:border-accent-400/60 focus:bg-surface-card"
      >
        <option value="">Selecione...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

interface TextAreaFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}

export function TextAreaField({ label, value, onChange, placeholder = "", rows = 3 }: TextAreaFieldProps) {
  return (
    <div>
      <label className="text-xs font-medium text-base-secondary mb-1.5 block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 bg-surface-card/60 border border-accent-800/[0.07] rounded-xl text-sm text-base-primary focus:outline-none focus:ring-[3px] focus:ring-accent-400/20 focus:border-accent-400/60 focus:bg-surface-card resize-none"
      />
    </div>
  )
}

function maskTelefone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function maskCEP(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

interface MaskedFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  mask: "telefone" | "cnpj" | "cep"
  placeholder?: string
  required?: boolean
}

const masks = { telefone: maskTelefone, cnpj: maskCNPJ, cep: maskCEP }
const placeholders = { telefone: "(00) 00000-0000", cnpj: "00.000.000/0000-00", cep: "00000-000" }

export function MaskedField({ label, value, onChange, mask, placeholder, required = false }: MaskedFieldProps) {
  const applyMask = masks[mask]
  return (
    <div>
      <label className="text-xs font-medium text-base-secondary mb-1.5 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(applyMask(e.target.value))}
        placeholder={placeholder ?? placeholders[mask]}
        className="w-full px-4 py-3 bg-surface-card/60 border border-accent-800/[0.07] rounded-xl text-sm text-base-primary focus:outline-none focus:ring-[3px] focus:ring-accent-400/20 focus:border-accent-400/60 focus:bg-surface-card"
      />
    </div>
  )
}

interface ModalActionsProps {
  onCancel: () => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

export function ModalActions({ onCancel, onSave, saving, saveLabel = "Salvar" }: ModalActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-border-light mt-4">
      <button onClick={onCancel} className="text-sm text-base-secondary hover:text-accent-700 px-4 py-2">
        Cancelar
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 px-5 py-2.5 rounded-xl shadow-sm hover:shadow-lg hover:shadow-accent-600/20 hover:-translate-y-px"
      >
        {saving ? "Salvando..." : saveLabel}
      </button>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirmar", danger = true }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-accent-900/50 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className="relative glass-solid rounded-2xl w-full max-w-sm p-6 animate-slide-in">
        <h3 className="text-base font-bold text-base-primary mb-2">{title}</h3>
        <p className="text-sm text-base-secondary mb-6">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-sm text-base-secondary hover:text-accent-700 px-4 py-2">Cancelar</button>
          <button onClick={onConfirm}
            className={`text-sm font-medium text-white px-5 py-2.5 rounded-xl shadow-sm hover:-translate-y-px ${danger ? "bg-red-500 hover:bg-red-600" : "bg-accent-600 hover:bg-accent-700"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
