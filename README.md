# song-audio — studio de musique dans le navigateur

[![Tests](https://github.com/aL00ss/song-audio/actions/workflows/tests.yml/badge.svg)](https://github.com/aL00ss/song-audio/actions/workflows/tests.yml)

Un studio de musique multi-instruments qui fonctionne dans le navigateur : plusieurs
instruments jouent ensemble, et chacun a une vue (clavier, batterie, manche…) qui s'allume
pendant la lecture et sur laquelle on peut jouer. Le plan complet est dans
[docs/PLAN.md](docs/PLAN.md).

**Avancement : étapes 0 (fondations) et 1 (coquille du studio) terminées.**

- Interface de studio : barre de transport, panneaux ancrables (navigateur, Channel Rack,
  playlist, piano roll, instrument, mixer), raccourcis F5 à F9 et Espace, disposition gardée

- Modèle de projet (canaux, patterns, playlist, mixage), sauvegarde JSON vérifiée
- Import de fichiers MIDI multi-pistes : chaque piste garde son instrument General MIDI,
  la batterie est reconnue, la pédale est appliquée
- Transport : notes programmées à l'avance sur l'horloge audio, boucle, pause, tempo
- Moteur sonore : SpessaSynth et la banque GeneralUser GS (128 instruments + batterie)

## Commandes

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitaires (Vitest)
npm run test:e2e   # tests navigateur (Playwright, Chromium)
npm run build
```

Pour les tests navigateur, installer une fois Chromium : `npx playwright install chromium`.

## Crédits et licences

- **Sons** : [GeneralUser GS](https://schristiancollins.com/generaluser.php) v2.0.3,
  S. Christian Collins (licence dans `public/soundfonts/GeneralUserGS-LICENSE.txt`), dans la
  version SF3 publiée par le projet SpessaSynth.
- **Moteur** : [SpessaSynth](https://github.com/spessasus/spessasynth_lib) (Apache-2.0).
- **Fichiers MIDI** : [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT).
