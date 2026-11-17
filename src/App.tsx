// Étape 0 : page de démonstration des fondations (projet, transport, moteur multi-instruments).
// Elle sera remplacée par la coquille du studio à l'étape 1.

import { useEffect, useRef, useState } from 'react'
import { audio, useStudio } from './etat/studio'
import { familleInstrument, nomInstrument, vueInstrument } from './musique/gm'
import { formaterPosition } from './musique/temps'
import { attribuerCanauxMidi, patternActif } from './projet/modele'

/** Valeur recalculée à chaque image (position du transport, voix actives…). */
function useImage<T>(lire: () => T): T {
  const [valeur, setValeur] = useState(lire)
  const lecture = useRef(lire)
  useEffect(() => {
    lecture.current = lire
  })
  useEffect(() => {
    let id = 0
    const boucle = () => {
      setValeur(lecture.current())
      id = requestAnimationFrame(boucle)
    }
    id = requestAnimationFrame(boucle)
    return () => cancelAnimationFrame(id)
  }, [])
  return valeur
}

function Transport() {
  const { transport, chargement, projet, basculerLecture, arreter, changerTempo } = useStudio()
  const position = useImage(() => audio.transport?.position ?? 0)
  const pret = chargement.phase === 'pret'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-testid="lecture"
        disabled={!pret}
        onClick={() => void basculerLecture()}
        className="h-7 min-w-20 rounded bg-accent px-3 font-semibold text-black disabled:opacity-40"
      >
        {transport === 'lecture' ? 'Pause' : 'Lecture'}
      </button>
      <button
        type="button"
        data-testid="stop"
        disabled={!pret}
        onClick={arreter}
        className="h-7 rounded border border-bord bg-panneau-2 px-3 disabled:opacity-40"
      >
        Stop
      </button>
      <span data-testid="position" className="rounded bg-black/40 px-2 py-1 font-mono text-sm text-actif">
        {formaterPosition(position, projet.signature)}
      </span>
      <label className="flex items-center gap-1 text-discret">
        Tempo
        <input
          type="number"
          data-testid="tempo"
          min={20}
          max={300}
          step={1}
          value={projet.tempo}
          onChange={(e) => changerTempo(Number(e.target.value))}
          className="h-7 w-16 rounded border border-bord bg-black/40 px-1 font-mono text-texte"
        />
      </label>
    </div>
  )
}

function Canaux() {
  const { projet, modifierCanal } = useStudio()
  const pattern = patternActif(projet)
  const attribution = attribuerCanauxMidi(projet.canaux)
  const voix = useImage(() => projet.canaux.map((c) => audio.moteur?.voix(attribution.get(c.id) ?? -1) ?? 0))
  return (
    <table className="w-full border-collapse text-left">
      <thead className="text-discret">
        <tr>
          <th className="w-6" />
          <th className="py-1">Canal</th>
          <th>Instrument</th>
          <th>Vue</th>
          <th className="text-right">Notes</th>
          <th className="text-center">MIDI</th>
          <th className="text-center">Muet</th>
          <th className="text-center">Solo</th>
        </tr>
      </thead>
      <tbody>
        {projet.canaux.map((canal, i) => (
          <tr key={canal.id} data-testid="canal" className="border-t border-bord">
            <td>
              <span
                aria-label={voix[i] > 0 ? 'joue' : 'silencieux'}
                data-voix={voix[i]}
                className="inline-block size-2.5 rounded-full"
                style={{ background: voix[i] > 0 ? canal.couleur : '#3a414b' }}
              />
            </td>
            <td className="py-1 font-semibold" style={{ color: canal.couleur }}>{canal.nom}</td>
            <td>
              {canal.batterie ? 'Batterie (canal 10)' : `${nomInstrument(canal.programme)} · ${familleInstrument(canal.programme)}`}
            </td>
            <td className="text-discret">{vueInstrument(canal.programme, canal.batterie)}</td>
            <td className="text-right font-mono">{pattern.notes[canal.id]?.length ?? 0}</td>
            <td className="text-center font-mono">{(attribution.get(canal.id) ?? 0) + 1}</td>
            <td className="text-center">
              <input type="checkbox" aria-label={`Couper ${canal.nom}`} checked={canal.muet} onChange={(e) => modifierCanal(canal.id, { muet: e.target.checked })} />
            </td>
            <td className="text-center">
              <input type="checkbox" aria-label={`Solo ${canal.nom}`} checked={canal.solo} onChange={(e) => modifierCanal(canal.id, { solo: e.target.checked })} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function App() {
  const { projet, chargement, message, initialiser, chargerDemo, importerMidi } = useStudio()
  const fichier = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void initialiser()
  }, [initialiser])

  useEffect(() => {
    // accès pour les tests navigateur et la console
    Object.assign(window, {
      __studio: {
        etat: useStudio.getState,
        audio,
        /** Voix qui sonnent sur chaque canal du projet, dans l'ordre des canaux. */
        voixParCanal: () => {
          const { projet } = useStudio.getState()
          const attribution = attribuerCanauxMidi(projet.canaux)
          return projet.canaux.map((c) => audio.moteur?.voix(attribution.get(c.id) ?? -1) ?? 0)
        },
      },
    })
  }, [])

  const statut =
    chargement.phase === 'son'
      ? `Chargement des sons… ${Math.round(chargement.progression * 100)} %`
      : chargement.phase === 'erreur'
        ? chargement.message
        : 'Prêt'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-bold">
          song<span className="text-accent">-audio</span>
          <span className="ml-2 font-normal text-discret">étape 0 · fondations</span>
        </h1>
        <span data-testid="statut" className="text-discret">{statut}</span>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-2 rounded border border-bord bg-panneau p-2">
        <Transport />
        <div className="flex gap-2">
          <button type="button" onClick={chargerDemo} className="h-7 rounded border border-bord bg-panneau-2 px-3">
            Démo
          </button>
          <button type="button" onClick={() => fichier.current?.click()} className="h-7 rounded border border-bord bg-panneau-2 px-3">
            Importer un MIDI…
          </button>
          <input
            ref={fichier}
            type="file"
            data-testid="import"
            accept=".mid,.midi,audio/midi"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importerMidi(f)
              e.target.value = ''
            }}
          />
        </div>
      </section>

      {message && <p role="alert" className="text-accent">{message}</p>}

      <section className="rounded border border-bord bg-panneau p-2">
        <h2 className="mb-1 font-semibold">
          {projet.nom} <span className="font-normal text-discret">· {projet.canaux.length} instruments · {projet.tempo} à la noire</span>
        </h2>
        <Canaux />
      </section>

      <footer className="text-discret">
        Sons : GeneralUser GS (S. Christian Collins). Moteur : SpessaSynth.
      </footer>
    </div>
  )
}
