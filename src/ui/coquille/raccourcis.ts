// Raccourcis clavier du studio. Fonction pure : elle reçoit la touche et sa cible, et dit
// quelle action déclencher (ou aucune).

import type { IdPanneau } from './panneaux'

export type Action =
  | { type: 'panneau'; id: IdPanneau }
  | { type: 'lecture' }
  | { type: 'stop' }

export interface Touche {
  key: string
  code: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  repeat: boolean
  /** Nom de la balise qui a le focus (INPUT, TEXTAREA, BUTTON…) et son type éventuel. */
  cible: { balise: string; type?: string; editable?: boolean }
}

const PANNEAUX_PAR_TOUCHE: Record<string, IdPanneau> = {
  F5: 'playlist',
  F6: 'rack',
  F7: 'pianoroll',
  F8: 'navigateur',
  F9: 'mixer',
}

const TYPES_SANS_SAISIE = new Set(['checkbox', 'radio', 'range', 'button', 'submit', 'color', 'file'])

/** Vrai si la touche sert à écrire dans un champ (le studio ne doit pas l'intercepter). */
export function saisieEnCours(cible: Touche['cible']): boolean {
  if (cible.editable) return true
  if (cible.balise === 'TEXTAREA' || cible.balise === 'SELECT') return true
  return cible.balise === 'INPUT' && !TYPES_SANS_SAISIE.has((cible.type ?? 'text').toLowerCase())
}

export function actionPourTouche(touche: Touche): Action | null {
  if (touche.ctrlKey || touche.metaKey || touche.altKey) return null
  const panneau = PANNEAUX_PAR_TOUCHE[touche.code]
  if (panneau) return touche.repeat ? null : { type: 'panneau', id: panneau }
  if (saisieEnCours(touche.cible)) return null
  if (touche.code === 'Space') return touche.repeat ? null : touche.shiftKey ? { type: 'stop' } : { type: 'lecture' }
  return null
}

export function toucheDepuisEvenement(e: KeyboardEvent): Touche {
  const element = e.target instanceof HTMLElement ? e.target : null
  return {
    key: e.key,
    code: e.code,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    shiftKey: e.shiftKey,
    repeat: e.repeat,
    cible: {
      balise: element?.tagName ?? '',
      type: element instanceof HTMLInputElement ? element.type : undefined,
      editable: element?.isContentEditable ?? false,
    },
  }
}
