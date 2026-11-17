// La coquille du studio : barre de transport, panneaux ancrables (Dockview), raccourcis,
// disposition sauvegardée d'une visite à l'autre.

import { type DockviewApi, type DockviewMessages, DockviewReact, type DockviewTheme, type IDockviewPanelProps } from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStudio } from '../../etat/studio'
import { Attente } from '../panneaux/Attente'
import { ChannelRack } from '../panneaux/ChannelRack'
import { Navigateur } from '../panneaux/Navigateur'
import { BarreTransport } from './BarreTransport'
import { type ApiDock, basculerPanneau, CLE_DISPOSITION, dispositionParDefaut, type IdPanneau, ouvrirPanneau } from './panneaux'
import { actionPourTouche, toucheDepuisEvenement } from './raccourcis'

const theme: DockviewTheme = { name: 'studio', className: 'dockview-theme-dark theme-studio', colorScheme: 'dark' }

const POSITIONS: Record<string, string> = { top: 'en haut', bottom: 'en bas', left: 'à gauche', right: 'à droite', center: 'au centre' }

/** Annonces des lecteurs d'écran, en français. */
const messages: DockviewMessages = {
  panelOpened: (t) => `${t} ouvert`,
  panelClosed: (t) => `${t} fermé`,
  groupMaximized: (t) => `${t} agrandi`,
  groupRestored: (t) => `${t} rétabli`,
  groupFloated: (t) => `${t} détaché en fenêtre flottante`,
  groupDocked: (t) => `${t} ancré`,
  groupPoppedOut: (t) => `${t} ouvert dans une nouvelle fenêtre`,
  closeTab: (t) => `Fermer ${t}`,
  closeTabPlain: () => 'Fermer',
  movePickTarget: (source, cible, n, total) => `Déplacer ${source} : ${cible}, ${n} sur ${total}. Flèches pour choisir, Entrée pour valider.`,
  movePickEdge: (position, cible) => `Déposer ${POSITIONS[position] ?? position} de ${cible}. Entrée pour valider.`,
  moveCommitted: (source, cible, position) => `${source} déplacé ${POSITIONS[position] ?? position} de ${cible}`,
  moveCancelled: () => 'Déplacement annulé',
  moveNotAllowed: () => 'Déplacement impossible',
  moveFloated: (source) => `${source} détaché en fenêtre flottante`,
}

const composants: Record<IdPanneau, React.FunctionComponent<IDockviewPanelProps>> = {
  navigateur: () => <Navigateur />,
  rack: () => <ChannelRack />,
  playlist: () => <Attente titre="Playlist" etape="6" description="Les patterns placés dans le temps pour former le morceau." />,
  pianoroll: () => <Attente titre="Piano roll" etape="4" description="L'éditeur de notes de l'instrument sélectionné." />,
  instrument: () => <Attente titre="Vue de l'instrument" etape="4" description="Clavier, batterie, manche… qui s'allume pendant la lecture et se joue." />,
  mixer: () => <Attente titre="Mixer" etape="5" description="Une tranche par piste : volume, panoramique, effets, vumètre." />,
}

function lireDisposition(): unknown {
  try {
    const texte = localStorage.getItem(CLE_DISPOSITION)
    return texte ? JSON.parse(texte) : null
  } catch {
    return null
  }
}

function ecrireDisposition(api: DockviewApi): void {
  try {
    localStorage.setItem(CLE_DISPOSITION, JSON.stringify(api.toJSON()))
  } catch {
    // stockage indisponible : la disposition vaut pour cette visite
  }
}

export function Studio() {
  const { message, basculerLecture, arreter } = useStudio()
  const apiRef = useRef<DockviewApi | null>(null)
  const [ouverts, setOuverts] = useState<ReadonlySet<string>>(new Set())

  const surPret = useCallback((evenement: { api: DockviewApi }) => {
    const api = evenement.api
    apiRef.current = api
    const sauvegarde = lireDisposition()
    let restauree = false
    if (sauvegarde) {
      try {
        api.fromJSON(sauvegarde as Parameters<DockviewApi['fromJSON']>[0])
        restauree = api.panels.length > 0
      } catch {
        restauree = false
      }
    }
    if (!restauree) dispositionParDefaut(api as unknown as ApiDock)
    const majOuverts = () => setOuverts(new Set(api.panels.map((p) => p.id)))
    majOuverts()
    api.onDidLayoutChange(() => {
      ecrireDisposition(api)
      majOuverts()
    })
  }, [])

  const ouvrir = useCallback((id: IdPanneau) => {
    if (apiRef.current) ouvrirPanneau(apiRef.current as unknown as ApiDock, id)
  }, [])

  const reinitialiser = useCallback(() => {
    if (apiRef.current) dispositionParDefaut(apiRef.current as unknown as ApiDock)
  }, [])

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const action = actionPourTouche(toucheDepuisEvenement(e))
      if (!action) return
      e.preventDefault() // F5 rechargerait la page ; Espace activerait le bouton qui a le focus
      if (action.type === 'panneau' && apiRef.current) basculerPanneau(apiRef.current as unknown as ApiDock, action.id)
      else if (action.type === 'lecture') void basculerLecture()
      else if (action.type === 'stop') arreter()
    }
    // Espace relâché sur un bouton le cliquerait : on l'empêche aussi au relâchement.
    const surRelache = (e: KeyboardEvent) => {
      if (e.code === 'Space' && actionPourTouche(toucheDepuisEvenement(e))) e.preventDefault()
    }
    window.addEventListener('keydown', surTouche)
    window.addEventListener('keyup', surRelache)
    return () => {
      window.removeEventListener('keydown', surTouche)
      window.removeEventListener('keyup', surRelache)
    }
  }, [basculerLecture, arreter])

  return (
    <div className="flex h-full flex-col">
      <BarreTransport ouvrirPanneau={ouvrir} panneauxOuverts={ouverts} />
      {message && (
        <p role="alert" data-testid="message" className="border-b border-black/50 bg-accent/15 px-3 py-1 text-accent">
          {message}
        </p>
      )}
      <main className="min-h-0 flex-1">
        <DockviewReact components={composants} onReady={surPret} theme={theme} messages={messages} />
      </main>
      <footer className="flex items-center justify-between gap-2 border-t border-black/50 bg-panneau px-2 py-0.5 text-[11px] text-discret">
        <span>Espace : lecture/pause · Maj+Espace : arrêt · F5 Playlist · F6 Rack · F7 Piano roll · F8 Navigateur · F9 Mixer</span>
        <button type="button" data-testid="reinitialiser-disposition" onClick={reinitialiser} className="underline underline-offset-2 hover:text-texte">
          Disposition par défaut
        </button>
      </footer>
    </div>
  )
}
