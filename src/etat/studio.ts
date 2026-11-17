// État de l'application (zustand) : le projet, le transport, le chargement du son.
// Le moteur et le transport sont créés une seule fois ; chaque modification du projet leur
// est transmise.

import { Midi } from '@tonejs/midi'
import { produce } from 'immer'
import { create } from 'zustand'
import { MoteurSon } from '../audio/moteur'
import { type EtatTransport, Transport } from '../audio/transport'
import { creerDemo } from '../projet/demo'
import { depuisMidi } from '../projet/importMidi'
import { ajouterCanal, attribuerCanauxMidi, type Canal, modifierCanal, type Projet } from '../projet/modele'

export const URL_BANQUE = `${import.meta.env.BASE_URL}soundfonts/GeneralUserGS.sf3`

export type Chargement =
  | { phase: 'son'; progression: number }
  | { phase: 'pret' }
  | { phase: 'erreur'; message: string }

interface EtatStudio {
  projet: Projet
  /** Canal sélectionné dans le rack (piano roll et vue d'instrument le suivent). */
  canalSelectionne: string | null
  transport: EtatTransport
  chargement: Chargement
  message: string | null
  initialiser(): Promise<void>
  remplacerProjet(projet: Projet): void
  chargerDemo(): void
  importerMidi(fichier: File): Promise<void>
  basculerLecture(): Promise<void>
  arreter(): void
  changerTempo(tempo: number): void
  modifierCanal(id: string, modifications: Partial<Omit<Canal, 'id'>>): void
  selectionnerCanal(id: string): void
  ajouterInstrument(programme: number, batterie?: boolean): void
  changerVolumeMaitre(volume: number): void
}

let moteur: MoteurSon | null = null
let transport: Transport | null = null
/** Chargement en cours : un second appel (React StrictMode) attend le même, sans créer un autre contexte audio. */
let initialisation: Promise<void> | null = null

export const audio = {
  get moteur() {
    return moteur
  },
  get transport() {
    return transport
  },
}

export const useStudio = create<EtatStudio>()((set, get) => {
  /** Transmet le projet courant au moteur et au transport. */
  const synchroniser = (projet: Projet) => {
    moteur?.appliquerProjet(projet)
    transport?.definirProjet(projet)
  }

  const demo = creerDemo()
  return {
    projet: demo,
    canalSelectionne: demo.canaux[0]?.id ?? null,
    transport: 'arret',
    chargement: { phase: 'son', progression: 0 },
    message: null,

    initialiser() {
      initialisation ??= (async () => {
        try {
          moteur = await MoteurSon.creer(URL_BANQUE, (recus, total) => {
            set({ chargement: { phase: 'son', progression: total ? recus / total : 0 } })
          })
          transport = new Transport(moteur, moteur)
          transport.surEtat((etat) => set({ transport: etat }))
          synchroniser(get().projet)
          set({ chargement: { phase: 'pret' } })
        } catch (erreur) {
          console.error(erreur)
          set({ chargement: { phase: 'erreur', message: "Le son n'a pas pu être chargé." } })
        }
      })()
      return initialisation
    },

    remplacerProjet(projet) {
      transport?.arreter()
      set({ projet, message: null, canalSelectionne: projet.canaux[0]?.id ?? null })
      synchroniser(projet)
    },

    chargerDemo() {
      get().remplacerProjet(creerDemo())
    },

    async importerMidi(fichier) {
      try {
        const midi = new Midi(await fichier.arrayBuffer())
        const projet = depuisMidi(midi, fichier.name.replace(/\.midi?$/i, ''))
        if (!projet.canaux.length) {
          set({ message: 'Ce fichier ne contient aucune note.' })
          return
        }
        get().remplacerProjet(projet)
      } catch (erreur) {
        console.error(erreur)
        set({ message: `Fichier MIDI illisible : ${fichier.name}` })
      }
    },

    async basculerLecture() {
      if (!moteur || !transport) return
      await moteur.demarrer()
      if (transport.etat === 'lecture') transport.pause()
      else transport.jouer()
    },

    arreter() {
      transport?.arreter()
    },

    changerTempo(tempo) {
      const valeur = Math.min(300, Math.max(20, Math.round(tempo * 100) / 100))
      if (!Number.isFinite(valeur)) return
      const projet = { ...get().projet, tempo: valeur }
      set({ projet })
      synchroniser(projet)
    },

    modifierCanal(id, modifications) {
      const projet = modifierCanal(get().projet, id, modifications)
      set({ projet })
      synchroniser(projet)
    },

    selectionnerCanal(id) {
      if (get().projet.canaux.some((c) => c.id === id)) set({ canalSelectionne: id })
    },

    ajouterInstrument(programme, batterie = false) {
      try {
        const { projet, id } = ajouterCanal(get().projet, { programme, batterie })
        attribuerCanauxMidi(projet.canaux) // refuse au-delà du nombre de canaux MIDI disponibles
        set({ projet, canalSelectionne: id, message: null })
        synchroniser(projet)
      } catch (erreur) {
        set({ message: erreur instanceof Error ? erreur.message : String(erreur) })
      }
    },

    changerVolumeMaitre(volume) {
      const valeur = Math.min(1, Math.max(0, volume))
      const projet = produce(get().projet, (p) => {
        if (p.mixage[0]) p.mixage[0].volume = valeur
      })
      set({ projet })
      synchroniser(projet)
    },
  }
})
