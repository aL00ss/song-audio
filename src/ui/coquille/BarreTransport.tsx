// Barre du haut : transport (lecture, arrêt, mode), tempo, afficheurs, volume général,
// boutons des panneaux.

import { audio, useStudio } from '../../etat/studio'
import { formaterPosition, formaterSecondes, ticsEnSecondes } from '../../musique/temps'
import { BoutonRotatif } from '../commun/BoutonRotatif'
import { useImage } from '../commun/useImage'
import { type IdPanneau, PANNEAUX } from './panneaux'

const bouton = 'h-7 rounded border border-bord bg-panneau-2 px-2.5 hover:border-discret disabled:opacity-40'

function Afficheur({ testId, titre, children }: { testId: string; titre: string; children: React.ReactNode }) {
  return (
    <span
      data-testid={testId}
      title={titre}
      className="min-w-[5.5rem] rounded border border-black/60 bg-[#0d1013] px-2 py-1 text-center font-mono text-[13px] text-actif shadow-[inset_0_1px_3px_#000]"
    >
      {children}
    </span>
  )
}

export function BarreTransport({ ouvrirPanneau, panneauxOuverts }: {
  ouvrirPanneau: (id: IdPanneau) => void
  panneauxOuverts: ReadonlySet<string>
}) {
  const { transport, chargement, projet, basculerLecture, arreter, changerTempo, changerVolumeMaitre } = useStudio()
  const position = useImage(() => audio.transport?.position ?? 0)
  const pret = chargement.phase === 'pret'
  const statut =
    chargement.phase === 'son'
      ? `Chargement des sons… ${Math.round(chargement.progression * 100)} %`
      : chargement.phase === 'erreur'
        ? chargement.message
        : 'Prêt'

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-black/50 bg-gradient-to-b from-[#2f353d] to-[#262b32] px-2 py-1.5">
      <span className="mr-1 text-[13px] font-bold tracking-wide">
        song<span className="text-accent">-audio</span>
      </span>

      <div className="flex items-center gap-1" role="group" aria-label="Transport">
        <button
          type="button"
          data-testid="lecture"
          disabled={!pret}
          onClick={() => void basculerLecture()}
          title="Lecture / pause (Espace)"
          className={`h-7 w-20 rounded font-semibold disabled:opacity-40 ${transport === 'lecture' ? 'bg-actif text-black' : 'bg-accent text-black'}`}
        >
          {transport === 'lecture' ? 'Pause' : 'Lecture'}
        </button>
        <button type="button" data-testid="stop" disabled={!pret} onClick={arreter} title="Arrêt (Maj+Espace)" className={bouton}>
          Stop
        </button>
        <span className="ml-1 inline-flex overflow-hidden rounded border border-bord" role="group" aria-label="Mode de lecture">
          <span className="bg-accent/90 px-2 py-1 font-semibold text-black" title="Lecture du pattern en boucle">PAT</span>
          <span className="px-2 py-1 text-discret" title="Lecture du morceau : arrive avec la playlist (étape 6)" aria-disabled>
            SONG
          </span>
        </span>
      </div>

      <label className="flex items-center gap-1 text-discret" title="Tempo, noires par minute">
        <input
          type="number"
          data-testid="tempo"
          aria-label="Tempo"
          min={20}
          max={300}
          step={1}
          value={projet.tempo}
          onChange={(e) => changerTempo(Number(e.target.value))}
          className="h-7 w-[4.5rem] rounded border border-black/60 bg-[#0d1013] px-1.5 text-right font-mono text-[13px] text-accent"
        />
        BPM
      </label>

      <Afficheur testId="position" titre="Position : mesure:temps:tic">{formaterPosition(position, projet.signature)}</Afficheur>
      <Afficheur testId="temps" titre="Temps écoulé dans le pattern">{formaterSecondes(ticsEnSecondes(position, projet.tempo))}</Afficheur>

      <span className="flex items-center gap-1 text-discret" title="Volume général">
        <BoutonRotatif
          etiquette="Volume général"
          taille="moyen"
          valeur={projet.mixage[0]?.volume ?? 0.8}
          defaut={0.8}
          texte={(v) => `${Math.round(v * 100)} %`}
          surChangement={changerVolumeMaitre}
        />
      </span>

      <nav aria-label="Panneaux" className="ml-auto flex flex-wrap items-center gap-1">
        {PANNEAUX.map((p) => (
          <button
            key={p.id}
            type="button"
            data-testid={`ouvrir-${p.id}`}
            aria-pressed={panneauxOuverts.has(p.id)}
            title={p.raccourci ? `${p.titre} (${p.raccourci})` : p.titre}
            onClick={() => ouvrirPanneau(p.id)}
            className="h-6 rounded px-2 text-discret hover:bg-panneau-2 hover:text-texte aria-pressed:text-texte"
          >
            {p.titre}
          </button>
        ))}
      </nav>

      <span data-testid="statut" className="w-full text-right text-discret sm:w-auto">{statut}</span>
    </header>
  )
}
