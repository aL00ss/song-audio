// État de l'application (zustand) : le projet, le transport, le chargement du son.
// Le moteur et le transport sont créés une seule fois ; chaque modification du projet leur
// est transmise.

import { Midi } from '@tonejs/midi'
import { produce } from 'immer'
import { create } from 'zustand'
import { MoteurSon } from '../audio/moteur'
import { type EtatTransport, type ModeLecture, Transport } from '../audio/transport'
import { creerDemo } from '../projet/demo'
import { depuisMidi } from '../projet/importMidi'
import { ajouterCanal, attribuerCanauxMidi, type Canal, creerProjet, modifierCanal, type PisteMixage, type Projet } from '../projet/modele'
import { definirNombreDePas, definirNoteDefaut, definirPas, definirVelocitePas } from '../projet/pas'
import * as playlist from '../projet/playlist'
import { BASE_DEFAUT, decalerBase, detecterDisposition, type DispositionClavier } from '../musique/clavier'
import type { NoteMusicale } from '../projet/modele'

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
  /** Morceau en cours de téléchargement (navigateur), ou null. */
  morceauEnChargement: string | null
  initialiser(): Promise<void>
  remplacerProjet(projet: Projet): void
  chargerDemo(): void
  importerMidi(fichier: File): Promise<void>
  /** Charge un fichier MIDI en ligne comme projet, puis le joue si demandé. */
  chargerMidiDepuisUrl(url: string, nom: string, options?: { jouer?: boolean }): Promise<void>
  basculerLecture(): Promise<void>
  arreter(): void
  changerTempo(tempo: number): void
  modifierCanal(id: string, modifications: Partial<Omit<Canal, 'id'>>): void
  selectionnerCanal(id: string): void
  ajouterInstrument(programme: number, batterie?: boolean): void
  changerVolumeMaitre(volume: number): void
  nouveauProjet(): void
  /** Active, désactive (actif donné) ou bascule un pas du séquenceur. */
  definirPas(canalId: string, index: number, actif?: boolean): void
  definirVelocitePas(canalId: string, index: number, velocite: number): void
  definirNombreDePas(pas: number): void
  changerSwing(swing: number): void
  definirNoteDefaut(canalId: string, hauteur: number): void
  /** PAT : le pattern actif en boucle ; SONG : l'arrangement de la playlist. */
  mode: ModeLecture
  changerMode(mode?: ModeLecture): void
  nouveauPattern(): void
  dupliquerPattern(): void
  renommerPattern(id: string, nom: string): void
  choisirPattern(id: string): void
  supprimerPattern(id: string): void
  /** Pose un clip du pattern actif ; renvoie son identifiant. */
  ajouterClip(piste: number, debut: number, pattern?: string): string
  deplacerClip(id: string, piste: number, debut: number): void
  supprimerClip(id: string): void
  /** Règle une piste du mixer (0 = maître). */
  modifierPiste(index: number, modifications: Partial<Omit<PisteMixage, 'index'>>): void
  /** Envoie un canal vers une piste du mixer. */
  routerCanal(canalId: string, piste: number): void
  /** Remplace les notes d'un canal dans le pattern actif (piano roll). */
  remplacerNotes(canalId: string, notes: NoteMusicale[]): void
  // ---- jeu en direct
  /** Enregistre les notes jouées pendant la lecture dans le pattern. */
  enregistrement: boolean
  basculerEnregistrement(): void
  clavier: { base: number; disposition: DispositionClavier }
  changerOctave(sens: number): void
  changerDisposition(disposition?: DispositionClavier): void
  /** Joue une note sur un canal (le canal sélectionné par défaut). */
  jouerNote(hauteur: number, velocite?: number, canalId?: string): void
  relacherNote(hauteur: number, canalId?: string): void
  relacherTout(): void
}

/** Notes tenues en direct : « canal:hauteur » -> nombre d'appuis, instant de début (tic absolu), vélocité. */
const tenues = new Map<string, { appuis: number; debut: number | null; velocite: number }>()

/** Hauteurs jouées en direct sur un canal du projet (pour les vues d'instrument). */
export function notesEnDirect(canalId: string): Set<number> {
  const resultat = new Set<number>()
  for (const cle of tenues.keys()) {
    const [canal, hauteur] = cle.split(':')
    if (canal === canalId) resultat.add(Number(hauteur))
  }
  return resultat
}

/** Projet vide : un kit de batterie de quatre sons, un pattern d'une mesure (16 pas). */
export function projetVide(): Projet {
  let projet = creerProjet('Nouveau projet')
  for (const [nom, note] of [['Grosse caisse', 36], ['Clap', 39], ['Charleston', 42], ['Caisse claire', 38]] as const) {
    projet = ajouterCanal(projet, { batterie: true, nom, noteDefaut: note }).projet
  }
  return playlist.ajouterClip(projet, projet.patternActif, 0, 0).projet
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
    transport?.definirProjet(projet, get().mode)
  }

  /** Remplace le projet par un fichier MIDI ; faux (et un message) s'il n'a aucune note. */
  const charger = (midi: Midi, nom: string): boolean => {
    const projet = depuisMidi(midi, nom)
    if (!projet.canaux.length) {
      set({ message: `« ${nom} » ne contient aucune note.` })
      return false
    }
    get().remplacerProjet(projet)
    return true
  }

  /** Enregistre une modification du projet et la transmet au son (même en pleine lecture). */
  const appliquer = (projet: Projet) => {
    if (projet === get().projet) return
    set({ projet })
    synchroniser(projet)
  }

  const demo = creerDemo()
  return {
    projet: demo,
    canalSelectionne: demo.canaux[0]?.id ?? null,
    transport: 'arret',
    chargement: { phase: 'son', progression: 0 },
    message: null,
    morceauEnChargement: null,

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
          const disposition = await detecterDisposition()
          set({ clavier: { ...get().clavier, disposition } })
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
      const nom = fichier.name.replace(/\.midi?$/i, '')
      try {
        if (!charger(new Midi(await fichier.arrayBuffer()), nom)) return
      } catch (erreur) {
        console.error(erreur)
        set({ message: `Fichier MIDI illisible : ${fichier.name}` })
      }
    },

    async chargerMidiDepuisUrl(url, nom, { jouer = true } = {}) {
      set({ morceauEnChargement: nom, message: null })
      try {
        const reponse = await fetch(url)
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`)
        const midi = new Midi(await reponse.arrayBuffer())
        if (get().morceauEnChargement !== nom) return // un autre morceau a été demandé entre-temps
        if (charger(midi, nom) && jouer) await get().basculerLecture()
      } catch (erreur) {
        console.error(erreur)
        set({ message: `Impossible de charger « ${nom} » (fichier introuvable ou illisible).` })
      } finally {
        if (get().morceauEnChargement === nom) set({ morceauEnChargement: null })
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

    nouveauProjet() {
      get().remplacerProjet(projetVide())
    },

    definirPas(canalId, index, actif) {
      appliquer(definirPas(get().projet, canalId, index, actif))
    },

    definirVelocitePas(canalId, index, velocite) {
      appliquer(definirVelocitePas(get().projet, canalId, index, velocite))
    },

    definirNombreDePas(pas) {
      appliquer(definirNombreDePas(get().projet, pas))
    },

    changerSwing(swing) {
      appliquer({ ...get().projet, swing: Math.min(1, Math.max(0, swing)) })
    },

    definirNoteDefaut(canalId, hauteur) {
      appliquer(definirNoteDefaut(get().projet, canalId, hauteur))
    },

    mode: 'pattern',
    changerMode(mode) {
      const suivant = mode ?? (get().mode === 'pattern' ? 'morceau' : 'pattern')
      if (suivant === get().mode) return
      set({ mode: suivant })
      transport?.definirProjet(get().projet, suivant)
    },

    nouveauPattern() {
      appliquer(playlist.nouveauPattern(get().projet).projet)
    },
    dupliquerPattern() {
      appliquer(playlist.dupliquerPattern(get().projet, get().projet.patternActif).projet)
    },
    renommerPattern(id, nom) {
      appliquer(playlist.renommerPattern(get().projet, id, nom))
    },
    choisirPattern(id) {
      appliquer(playlist.choisirPattern(get().projet, id))
    },
    supprimerPattern(id) {
      appliquer(playlist.supprimerPattern(get().projet, id))
    },
    ajouterClip(piste, debut, pattern = get().projet.patternActif) {
      const { projet, id } = playlist.ajouterClip(get().projet, pattern, piste, debut)
      appliquer(projet)
      return id
    },
    deplacerClip(id, piste, debut) {
      appliquer(playlist.deplacerClip(get().projet, id, piste, debut))
    },
    supprimerClip(id) {
      appliquer(playlist.supprimerClip(get().projet, id))
    },

    modifierPiste(index, modifications) {
      appliquer(
        produce(get().projet, (p) => {
          const piste = p.mixage.find((m) => m.index === index)
          if (piste) Object.assign(piste, modifications)
        }),
      )
    },

    routerCanal(canalId, piste) {
      if (!get().projet.mixage.some((m) => m.index === piste)) return
      appliquer(modifierCanal(get().projet, canalId, { pisteMixage: piste }))
    },

    remplacerNotes(canalId, notes) {
      appliquer(
        produce(get().projet, (p) => {
          const pattern = p.patterns.find((x) => x.id === p.patternActif)
          if (pattern && p.canaux.some((c) => c.id === canalId)) pattern.notes[canalId] = notes
        }),
      )
    },

    enregistrement: false,
    basculerEnregistrement() {
      set({ enregistrement: !get().enregistrement })
    },

    clavier: { base: BASE_DEFAUT, disposition: 'azerty' },
    changerOctave(sens) {
      const { clavier } = get()
      set({ clavier: { ...clavier, base: decalerBase(clavier.base, sens) } })
    },
    changerDisposition(disposition) {
      const { clavier } = get()
      set({ clavier: { ...clavier, disposition: disposition ?? (clavier.disposition === 'azerty' ? 'qwerty' : 'azerty') } })
    },

    jouerNote(hauteur, velocite = 100, canalId = get().canalSelectionne ?? undefined) {
      if (!canalId || !moteur || hauteur < 0 || hauteur > 127) return
      const midi = attribuerCanauxMidi(get().projet.canaux).get(canalId)
      if (midi === undefined) return
      void moteur.demarrer()
      const cle = `${canalId}:${hauteur}`
      const tenue = tenues.get(cle)
      if (tenue) {
        tenue.appuis += 1
        return
      }
      const v = Math.min(127, Math.max(1, Math.round(velocite)))
      moteur.noteOn(midi, hauteur, v)
      const enLecture = transport?.etat === 'lecture'
      tenues.set(cle, { appuis: 1, debut: enLecture ? transport!.positionAbsolue : null, velocite: v })
    },

    relacherNote(hauteur, canalId = get().canalSelectionne ?? undefined) {
      if (!canalId) return
      const cle = `${canalId}:${hauteur}`
      const tenue = tenues.get(cle)
      if (!tenue) return
      if (--tenue.appuis > 0) return
      tenues.delete(cle)
      const midi = attribuerCanauxMidi(get().projet.canaux).get(canalId)
      if (midi !== undefined) moteur?.noteOff(midi, hauteur)
      // enregistrement : la note jouée s'inscrit dans le pattern, à sa place dans la boucle
      if (get().enregistrement && tenue.debut !== null && transport?.etat === 'lecture') {
        const longueur = transport.longueur
        const tic = Math.floor(tenue.debut % longueur)
        const duree = Math.max(1, Math.min(Math.round(transport.positionAbsolue - tenue.debut), longueur - tic))
        const pattern = get().projet.patterns.find((p) => p.id === get().projet.patternActif)
        const notes = pattern?.notes[canalId] ?? []
        get().remplacerNotes(canalId, [...notes, { tic, duree, hauteur, velocite: tenue.velocite }])
      }
    },

    relacherTout() {
      for (const cle of [...tenues.keys()]) {
        const [canal, hauteur] = cle.split(':')
        const tenue = tenues.get(cle)
        if (tenue) tenue.appuis = 1
        get().relacherNote(Number(hauteur), canal)
      }
    },

    changerVolumeMaitre(volume) {
      get().modifierPiste(0, { volume: Math.min(1, Math.max(0, volume)) })
    },
  }
})
