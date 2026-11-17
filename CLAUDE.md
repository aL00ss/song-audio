# song-audio

Studio de musique dans le navigateur, multi-instruments. Le plan complet et l'avancement sont
dans [docs/PLAN.md](docs/PLAN.md) : le lire avant toute nouvelle étape.

## Commandes

- `npm run dev` : serveur de développement
- `npm test` : tests unitaires (Vitest)
- `npm run test:e2e` : tests navigateur (Playwright, Chromium)
- `npm run build` : vérification des types puis construction
- `npm run lint` : oxlint
- Le site est publié sur https://al00ss.github.io/song-audio/ par la CI (job `publication`,
  construit avec `BASE_PUBLIC=/song-audio/`) quand les tests passent sur `main`. Sous Git Bash,
  poser `MSYS_NO_PATHCONV=1` avant de passer un chemin commençant par `/` à une commande.

## Conventions

- Code, noms et commentaires en **français**, comme les projets piano-js et piano-python.
- `src/projet/` et `src/musique/` : logique pure, sans DOM ni Web Audio, entièrement testée.
- `src/audio/` : seul endroit qui touche à la Web Audio API et à SpessaSynth.
- `src/ui/` : composants React. Les bibliothèques d'interface jeunes (audio/ui) sont toujours
  enveloppées dans nos propres composants.
- Temps musical en **tics** (96 par noire) dans le modèle ; conversion en secondes uniquement
  dans le transport.
- Chaque étape du plan se termine par : tests unitaires et navigateur verts, `npm run build`
  sans erreur, mise à jour de l'avancement dans docs/PLAN.md, puis un commit.
- Commits sans aucune ligne d'attribution (pas de `Co-Authored-By`).
- Ne jamais copier le nom, le logo, les icônes ou l'habillage exact d'un logiciel commercial.
