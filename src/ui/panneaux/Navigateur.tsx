// Navigateur : projets, import de fichiers MIDI, et les 128 instruments General MIDI.

import { useRef, useState } from 'react'
import { useStudio } from '../../etat/studio'
import { LISTE_INSTRUMENTS } from '../../musique/gm'

const FAMILLES = [...new Set(LISTE_INSTRUMENTS.map((i) => i.famille))]

export function Navigateur() {
  const { chargerDemo, importerMidi, ajouterInstrument } = useStudio()
  const fichier = useRef<HTMLInputElement>(null)
  const [survol, setSurvol] = useState(false)

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-2">
      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-discret">Projets</h3>
        <button type="button" data-testid="charger-demo" onClick={chargerDemo} className="w-full rounded px-2 py-1 text-left hover:bg-panneau-2">
          ▸ Démo (4 instruments)
        </button>
      </section>

      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-discret">Fichiers MIDI</h3>
        <div
          data-testid="zone-import"
          onDragOver={(e) => {
            e.preventDefault()
            setSurvol(true)
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault()
            setSurvol(false)
            const f = e.dataTransfer.files[0]
            if (f) void importerMidi(f)
          }}
          className={`rounded border border-dashed p-2 text-center text-discret ${survol ? 'border-accent text-accent' : 'border-bord'}`}
        >
          Glisser un fichier .mid ici
          <br />
          ou{' '}
          <button type="button" onClick={() => fichier.current?.click()} className="text-accent underline underline-offset-2">
            choisir un fichier
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

      <section className="min-h-0">
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-discret">Instruments</h3>
        <button
          type="button"
          onClick={() => ajouterInstrument(0, true)}
          title="Ajouter une batterie (canal 10)"
          className="w-full rounded px-2 py-0.5 text-left hover:bg-panneau-2"
        >
          ＋ Batterie
        </button>
        {FAMILLES.map((famille) => (
          <details key={famille} className="group">
            <summary className="cursor-pointer select-none rounded px-1 py-0.5 hover:bg-panneau-2">{famille}</summary>
            <ul className="ml-3 border-l border-bord pl-1">
              {LISTE_INSTRUMENTS.filter((i) => i.famille === famille).map((i) => (
                <li key={i.programme}>
                  <button
                    type="button"
                    onClick={() => ajouterInstrument(i.programme)}
                    title={`Ajouter : ${i.nom} (programme ${i.programme + 1})`}
                    className="w-full truncate rounded px-1 py-px text-left hover:bg-panneau-2"
                  >
                    ＋ {i.nom}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </div>
  )
}
