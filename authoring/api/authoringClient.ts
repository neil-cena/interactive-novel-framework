/**
 * Typed client for authoring API (load / validate / save).
 */

export interface Diagnostic {
  code: string
  severity: 'error' | 'warning'
  file?: string
  row?: number
  column?: number
  message: string
  hint?: string
  context?: Record<string, unknown>
}

export interface AuthoringModel {
  nodes: Record<string, StoryNodeModel>
  items: Record<string, ItemModel>
  enemies: Record<string, EnemyModel>
  encounters: Record<string, EncounterModel>
}

export interface StoryNodeModel {
  id: string
  type: string
  text: string
  onEnter?: Array<{ action: string; key?: string; value?: boolean; itemId?: string; qty?: number; amount?: number }>
  choices?: Array<{
    id: string
    label: string
    visibilityRequirements?: Array<{ type: string; key?: string; itemId?: string; stat?: string; operator?: string; value?: number }>
    mechanic?: Record<string, unknown>
  }>
}

export interface ItemModel {
  id: string
  name?: string
  type: string
  damage?: string
  attackBonus?: number
  acBonus?: number
  effect?: Record<string, unknown>
  scalingAttribute?: string
  aoe?: boolean
}

export interface EnemyModel {
  id: string
  name?: string
  hp: number
  ac: number
  attackBonus?: number
  damage?: string
  xpReward?: number
}

export interface EncounterModel {
  id: string
  name?: string
  type: string
  enemies: Array<{ enemyId: string; count?: number }>
  resolution?: { onVictory?: { nextNodeId: string }; onDefeat?: { nextNodeId: string } }
}

export interface LoadResponse {
  nodes: Record<string, StoryNodeModel>
  items: Record<string, ItemModel>
  enemies: Record<string, EnemyModel>
  encounters: Record<string, EncounterModel>
  errors: Diagnostic[]
  warnings: Diagnostic[]
}

export interface ValidateResponse {
  errors: Diagnostic[]
  warnings: Diagnostic[]
}

export interface SaveResponse {
  success: true
  written: string[]
  backups: string[]
  warnings: Diagnostic[]
}

export interface SaveDraftResponse {
  success: true
  path: string
  savedAt: string
}

export interface LoadDraftResponse {
  exists: boolean
  savedAt?: string
  model?: AuthoringModel
}

export async function loadFromApi(): Promise<LoadResponse> {
  const res = await fetch('/api/authoring/load')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function validateOnApi(payload: AuthoringModel): Promise<ValidateResponse> {
  const res = await fetch('/api/authoring/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function saveToApi(payload: AuthoringModel): Promise<SaveResponse> {
  const res = await fetch('/api/authoring/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as SaveResponse
}

export async function saveDraftToApi(payload: AuthoringModel): Promise<SaveDraftResponse> {
  const res = await fetch('/api/authoring/save-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as SaveDraftResponse
}

export async function loadDraftFromApi(): Promise<LoadDraftResponse> {
  const res = await fetch('/api/authoring/load-draft')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as LoadDraftResponse
}
