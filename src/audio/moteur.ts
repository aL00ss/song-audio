// Moteur sonore : un seul synthétiseur SpessaSynth (AudioWorklet) et une banque General MIDI.
// Chaque canal du projet joue sur son canal MIDI ; la batterie sur le canal 10.

import { WorkletSynthesizer } from 'spessasynth_lib'
import urlProcesseur from 'spessasynth_lib/dist/spessasynth_processor.min.js?url'
import { attribuerCanauxMidi, type Projet } from '../projet/modele'
import { Mixeur, type NiveauStereo } from './mixer'
import type { Destination, Horloge } from './transport'

const CC_VOLUME = 7
const CC_PAN = 10
const CC_REVERB = 91 // la réverbération est celle du mixer : celle du synthétiseur est coupée
const CC_CHORUS = 93
/** Le synthétiseur a 16 sorties séparées, une par canal MIDI (au-delà, elles se partagent). */
const SORTIES_SEPAREES = 16
const CC_COUPER_LE_SON = 120 // All Sound Off : coupe net

export type Progression = (recus: number, total: number) => void

/** Télécharge un fichier en suivant l'avancement (taille inconnue : total = 0). */
async function telecharger(url: string, progression?: Progression): Promise<ArrayBuffer> {
  const reponse = await fetch(url)
  if (!reponse.ok || !reponse.body) throw new Error(`Téléchargement impossible : ${url} (HTTP ${reponse.status})`)
  const total = Number(reponse.headers.get('content-length')) || 0
  const lecteur = reponse.body.getReader()
  const morceaux: Uint8Array[] = []
  let recus = 0
  for (;;) {
    const { done, value } = await lecteur.read()
    if (done) break
    morceaux.push(value)
    recus += value.length
    progression?.(recus, total)
  }
  const resultat = new Uint8Array(recus)
  let position = 0
  for (const m of morceaux) {
    resultat.set(m, position)
    position += m.length
  }
  return resultat.buffer
}

/**
 * Routage du mixer : canal MIDI (sortie séparée, 16 au plus) -> piste qui le reçoit (0 = maître
 * si la piste demandée n'existe pas).
 */
export function routageMixer(projet: Projet): Map<number, number> {
  const attribution = attribuerCanauxMidi(projet.canaux)
  const pistes = new Set(projet.mixage.map((p) => p.index))
  const routage = new Map<number, number>()
  for (const canal of projet.canaux) {
    const midi = attribution.get(canal.id)
    if (midi !== undefined) routage.set(midi % SORTIES_SEPAREES, pistes.has(canal.pisteMixage) ? canal.pisteMixage : 0)
  }
  return routage
}

export class MoteurSon implements Destination, Horloge {
  readonly contexte: AudioContext
  readonly synth: WorkletSynthesizer
  /** Copie de la banque de sons (l'original est transféré au processeur), pour l'export WAV. */
  readonly banque: ArrayBuffer
  readonly mixeur: Mixeur
  readonly #analyseur: AnalyserNode
  readonly #onde = new Float32Array(1024)
  /** Notes programmées dans le futur : [canal, instant]. Voir toutCouper(). */
  #enAttente: [number, number][] = []
  #disponibleA = 0

  private constructor(contexte: AudioContext, synth: WorkletSynthesizer, banque: ArrayBuffer) {
    this.contexte = contexte
    this.synth = synth
    this.banque = banque
    // Chaque canal MIDI sort séparément vers sa tranche du mixer ; la sortie principale du
    // synthétiseur (tous les canaux mélangés) n'est pas utilisée.
    const sortie = contexte.createGain()
    this.#analyseur = contexte.createAnalyser()
    this.#analyseur.fftSize = 1024
    sortie.connect(this.#analyseur)
    sortie.connect(contexte.destination)
    this.mixeur = new Mixeur(contexte, synth, sortie)
  }

  static async creer(urlBanque: string, progression?: Progression): Promise<MoteurSon> {
    const contexte = new AudioContext({ latencyHint: 'interactive' })
    const [banque] = await Promise.all([telecharger(urlBanque, progression), contexte.audioWorklet.addModule(urlProcesseur)])
    const copie = banque.slice(0)
    const synth = new WorkletSynthesizer(contexte)
    await synth.soundBankManager.addSoundBank(banque, 'gm')
    await synth.isReady
    return new MoteurSon(contexte, synth, copie)
  }

  /** À appeler depuis un geste de l'utilisateur : les navigateurs bloquent le son avant. */
  async demarrer(): Promise<void> {
    if (this.contexte.state !== 'running') await this.contexte.resume()
  }

  get actif(): boolean {
    return this.contexte.state === 'running'
  }

  maintenant(): number {
    return this.contexte.currentTime
  }

  /** Instruments, volumes et panoramiques de chaque canal ; pistes et routage du mixer. */
  appliquerProjet(projet: Projet): void {
    const attribution = attribuerCanauxMidi(projet.canaux)
    const plusHaut = Math.max(-1, ...attribution.values())
    for (let i = this.synth.midiChannels.length; i <= plusHaut; i++) this.synth.addNewChannel()
    for (const canal of projet.canaux) {
      const midi = attribution.get(canal.id)
      if (midi === undefined) continue
      this.synth.midiChannels[midi]?.setDrums(canal.batterie)
      if (!canal.batterie) this.synth.programChange(midi, canal.programme)
      this.synth.controllerChange(midi, CC_VOLUME, Math.round(canal.volume * 127))
      this.synth.controllerChange(midi, CC_PAN, Math.round(((canal.pan + 1) / 2) * 127))
      this.synth.controllerChange(midi, CC_REVERB, 0)
      this.synth.controllerChange(midi, CC_CHORUS, 0)
    }
    this.mixeur.configurer(projet.mixage)
    this.mixeur.router(routageMixer(projet))
  }

  /** Crête stéréo d'une piste du mixer (0 = maître). */
  niveauPiste(index: number): NiveauStereo {
    return this.mixeur.niveau(index)
  }

  noteOn(canal: number, hauteur: number, velocite: number, temps?: number): void {
    if (temps !== undefined && temps > this.contexte.currentTime) {
      this.#enAttente.push([canal, temps])
      if (this.#enAttente.length > 2048) this.#oublierPassees()
      this.synth.noteOn(canal, hauteur, velocite, { time: temps })
    } else {
      this.synth.noteOn(canal, hauteur, velocite)
    }
  }

  noteOff(canal: number, hauteur: number, temps?: number): void {
    if (temps !== undefined && temps > this.contexte.currentTime) this.synth.noteOff(canal, hauteur, { time: temps })
    else this.synth.noteOff(canal, hauteur)
  }

  /**
   * Coupe ce qui sonne et annule ce qui est programmé. SpessaSynth ne permet pas de vider sa
   * file de messages datés : pour chaque note encore en attente, on programme au même instant
   * (juste après elle, le tri de la file étant stable) une coupure nette du canal (CC 120), et
   * la note n'est jamais entendue. Un simple relâchement (CC 123) ne suffit pas : mesuré, un
   * piano relâché dès son attaque sonne aussi fort qu'une note normale. Contrepartie : sur ces
   * canaux, la fin des notes relâchées par l'arrêt est coupée au plus HORIZON plus tard.
   */
  toutCouper(): void {
    const maintenant = this.contexte.currentTime
    this.synth.stopAll(false)
    const instants = new Map<string, [number, number]>()
    for (const [canal, temps] of this.#enAttente) if (temps > maintenant) instants.set(`${canal}:${temps}`, [canal, temps])
    for (const [canal, temps] of instants.values()) {
      this.synth.controllerChange(canal, CC_COUPER_LE_SON, 0, { time: temps })
      this.#disponibleA = Math.max(this.#disponibleA, temps + 0.005)
    }
    this.#enAttente = []
  }

  /** Premier instant où de nouvelles notes ne risquent plus d'être coupées par toutCouper(). */
  disponibleA(): number {
    return this.#disponibleA
  }

  /** Niveau efficace du mixage (0 = silence). */
  niveau(): number {
    this.#analyseur.getFloatTimeDomainData(this.#onde)
    let somme = 0
    for (const v of this.#onde) somme += v * v
    return Math.sqrt(somme / this.#onde.length)
  }

  /** Nombre de voix qui sonnent sur un canal MIDI. */
  voix(canal: number): number {
    return this.synth.midiChannels[canal]?.voiceCount ?? 0
  }

  #oublierPassees(): void {
    const maintenant = this.contexte.currentTime
    this.#enAttente = this.#enAttente.filter(([, t]) => t > maintenant)
  }
}
