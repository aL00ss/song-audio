// Channel Rack : une ligne par instrument (diode d'activité, muet, panoramique, volume, nom,
// solo, piste de mixage) et un aperçu des notes du pattern. Le séquenceur pas à pas arrive à
// l'étape 3.

import { audio, useStudio } from '../../etat/studio'
import { nomInstrument } from '../../musique/gm'
import { attribuerCanauxMidi, type Canal, type NoteMusicale, patternActif } from '../../projet/modele'
import { BoutonRotatif } from '../commun/BoutonRotatif'
import { tableauxEgaux, useImage } from '../commun/useImage'

/** Aperçu des notes d'un canal sur toute la longueur du pattern. */
function Apercu({ notes, longueur, couleur }: { notes: readonly NoteMusicale[]; longueur: number; couleur: string }) {
  if (!notes.length) return <div className="h-5 flex-1 rounded-sm bg-black/30" />
  const basse = Math.min(...notes.map((n) => n.hauteur))
  const haute = Math.max(...notes.map((n) => n.hauteur))
  const etendue = Math.max(12, haute - basse + 1)
  return (
    <svg viewBox={`0 0 ${longueur} ${etendue}`} preserveAspectRatio="none" className="h-5 flex-1 rounded-sm bg-black/30" aria-hidden>
      {notes.map((n, i) => (
        <rect key={i} x={n.tic} y={haute - n.hauteur} width={Math.max(n.duree, longueur / 400)} height={1} fill={couleur} opacity={0.4 + (n.velocite / 127) * 0.6} />
      ))}
    </svg>
  )
}

function Ligne({ canal, voix, selectionne }: { canal: Canal; voix: number; selectionne: boolean }) {
  const { projet, modifierCanal, selectionnerCanal } = useStudio()
  const pattern = patternActif(projet)
  return (
    <div
      data-testid="canal"
      data-selectionne={selectionne || undefined}
      className={`flex items-center gap-1.5 border-b border-black/40 px-1.5 py-1 ${selectionne ? 'bg-panneau-2' : ''}`}
    >
      <span
        aria-label={voix > 0 ? 'joue' : 'silencieux'}
        data-voix={voix}
        className="size-2 shrink-0 rounded-full"
        style={{ background: voix > 0 ? canal.couleur : '#3a414b', boxShadow: voix > 0 ? `0 0 6px ${canal.couleur}` : undefined }}
      />
      <input
        type="checkbox"
        aria-label={`Couper ${canal.nom}`}
        title="Couper (muet)"
        checked={canal.muet}
        onChange={(e) => modifierCanal(canal.id, { muet: e.target.checked })}
        className="size-3.5 shrink-0 cursor-pointer appearance-none rounded-full border border-black/60 bg-actif checked:bg-[#3a414b]"
      />
      <BoutonRotatif
        etiquette={`Panoramique ${canal.nom}`}
        valeur={canal.pan}
        min={-1}
        max={1}
        ancre={0}
        defaut={0}
        texte={(v) => (Math.abs(v) < 0.01 ? 'centre' : `${Math.round(Math.abs(v) * 100)} % ${v < 0 ? 'gauche' : 'droite'}`)}
        surChangement={(v) => modifierCanal(canal.id, { pan: v })}
      />
      <BoutonRotatif
        etiquette={`Volume ${canal.nom}`}
        valeur={canal.volume}
        defaut={0.8}
        texte={(v) => `${Math.round(v * 100)} %`}
        surChangement={(v) => modifierCanal(canal.id, { volume: v })}
      />
      <span className="w-6 shrink-0 text-center font-mono text-discret" title="Piste de mixage">{canal.pisteMixage}</span>
      <button
        type="button"
        onClick={() => selectionnerCanal(canal.id)}
        title={canal.batterie ? 'Batterie (canal 10)' : nomInstrument(canal.programme)}
        className="h-6 w-36 shrink-0 truncate rounded border border-black/50 bg-gradient-to-b from-[#4a525d] to-[#3b424b] px-2 text-left font-semibold"
        style={{ color: canal.couleur }}
      >
        {canal.nom}
      </button>
      <label className="flex shrink-0 items-center gap-0.5 text-[10px] text-discret" title="Solo">
        <input
          type="checkbox"
          aria-label={`Solo ${canal.nom}`}
          checked={canal.solo}
          onChange={(e) => modifierCanal(canal.id, { solo: e.target.checked })}
          className="accent-accent"
        />
        S
      </label>
      <Apercu notes={pattern.notes[canal.id] ?? []} longueur={pattern.longueur} couleur={canal.couleur} />
    </div>
  )
}

export function ChannelRack() {
  const { projet, canalSelectionne } = useStudio()
  const attribution = attribuerCanauxMidi(projet.canaux)
  const voix = useImage(
    () => projet.canaux.map((c) => audio.moteur?.voix(attribution.get(c.id) ?? -1) ?? 0),
    tableauxEgaux,
  )
  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 whitespace-nowrap border-b border-black/50 bg-panneau px-2 py-1 text-discret">
        <span>
          <span className="font-semibold text-texte">{patternActif(projet).nom}</span> · {projet.canaux.length} instruments
        </span>
        <span className="truncate" title="Le séquenceur pas à pas arrive à l'étape 3 du plan">Pas à pas : étape 3</span>
      </div>
      {projet.canaux.map((canal, i) => (
        <Ligne key={canal.id} canal={canal} voix={voix[i] ?? 0} selectionne={canal.id === canalSelectionne} />
      ))}
      {!projet.canaux.length && <p className="p-3 text-discret">Aucun instrument : ajoutez-en depuis le navigateur (F8).</p>}
    </div>
  )
}
