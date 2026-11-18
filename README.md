# song-audio — studio de musique dans le navigateur

[![Tests](https://github.com/aL00ss/song-audio/actions/workflows/tests.yml/badge.svg)](https://github.com/aL00ss/song-audio/actions/workflows/tests.yml)

**Essayer le studio : https://al00ss.github.io/song-audio/**

Un studio de musique multi-instruments qui fonctionne dans le navigateur : plusieurs
instruments jouent ensemble, et chacun a une vue (clavier, batterie, manche…) qui s'allume
pendant la lecture et sur laquelle on peut jouer. Le plan complet est dans
[docs/PLAN.md](docs/PLAN.md).

**Avancement : étapes 0 à 7 terminées (fondations, coquille, navigateur, séquenceur pas à pas, piano roll et vue d'instrument, mixer, playlist, vues d'instruments avancées).**

- Interface de studio : barre de transport, panneaux ancrables (navigateur, Channel Rack,
  playlist, piano roll, instrument, mixer), raccourcis F5 à F9 et Espace, disposition gardée
- Navigateur : recherche de fichiers MIDI en ligne (BitMidi), morceaux de démonstration,
  import par glisser-déposer, 128 instruments General MIDI
- Séquenceur pas à pas dans le Channel Rack : pas peints à la souris, vélocité par pas, swing,
  longueur de 1 à 512 pas, un son de batterie par ligne
- Piano roll (Canvas) : ajout, déplacement, redimensionnement, lasso, quantification, vélocité
- Vue d'instrument qui s'allume pendant la lecture : clavier 88 touches ou pads de batterie,
  jouables à la souris et au clavier de l'ordinateur ; enregistrement en direct
- Mixer : une tranche par piste (égaliseur 3 bandes, fader, panoramique, muet, solo, vumètre
  stéréo, envoi de réverbération), maître avec limiteur
- Playlist : plusieurs patterns arrangés dans le temps, mode PAT (pattern en boucle) ou SONG
  (tout le morceau)
- Vues dédiées : manche de guitare et de basse (doigté calculé), cordes frottées, harpe,
  pistons des cuivres
- Jouer avec l'orchestre : la partie d'un instrument se tait et sert de guide, on la joue
  soi-même et les notes justes sont comptées
- Menu Fichier : ouvrir et enregistrer un projet, exporter en MIDI ou en WAV ; le projet est
  gardé automatiquement dans le navigateur

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
npm run test:e2e   # tests navigateur (Playwright, Chromium) ; RESEAU=1 pour le test BitMidi réel
                   # URL_STUDIO=https://al00ss.github.io/song-audio/ pour tester le site publié
npm run build
```

Pour les tests navigateur, installer une fois Chromium : `npx playwright install chromium`.

## Crédits et licences

- **Sons** : [GeneralUser GS](https://schristiancollins.com/generaluser.php) v2.0.3,
  S. Christian Collins (licence dans `public/soundfonts/GeneralUserGS-LICENSE.txt`), dans la
  version SF3 publiée par le projet SpessaSynth.
- **Moteur** : [SpessaSynth](https://github.com/spessasus/spessasynth_lib) (Apache-2.0).
- **Lecture des fichiers MIDI** : [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT).
- **Morceaux de démonstration** (`public/morceaux/`) : gravures du
  [Mutopia Project](https://www.mutopiaproject.org) dans le domaine public (Stelios Samelis,
  Keith OHara, Rune Zedeler et Chris Sawer, Guy D. Lederfein, Tobias Erbsland), interprétation
  Alexandre Besnier.
- **Recherche en ligne** : [BitMidi](https://bitmidi.com).
- **Interface** : [Dockview](https://dockview.dev) (MIT), [audio/ui](https://www.audio-ui.dev) (MIT).
