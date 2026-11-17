// Panneau dont le contenu arrive à une étape ultérieure du plan (docs/PLAN.md).

export function Attente({ titre, etape, description }: { titre: string; etape: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center text-discret">
      <p className="font-semibold text-texte">{titre}</p>
      <p>{description}</p>
      <p className="text-[11px]">Arrive à l'étape {etape} du plan.</p>
    </div>
  )
}
