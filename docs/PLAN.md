# song-audio — plan de construction

Studio de musique dans le navigateur, dont l'organisation s'inspire des studios de bureau
(navigateur de sons, rack d'instruments avec séquenceur pas à pas, piano roll, playlist,
mixer). Plusieurs instruments jouent ensemble ; chaque instrument a une **vue** où l'on voit
ses touches, cordes ou fûts s'allumer pendant la lecture, et sur laquelle on peut jouer.

On reprend l'**organisation du travail**, commune à beaucoup de studios ; on ne copie ni le
nom, ni le logo, ni les icônes, ni l'habillage exact d'un logiciel existant.

## Principes d'architecture

1. **Un modèle de projet pur** (TypeScript sans DOM) : canaux (instruments), patterns,
   clips de la playlist, pistes de mixage. Sérialisé en JSON versionné.
2. **Une horloge commune** (transport) : tempo, position en tics (96 par noire), programmation
   des notes un peu à l'avance sur l'horloge audio, précise à l'échantillon.
3. **Un seul moteur sonore** : SpessaSynth (AudioWorklet) avec une banque General MIDI ;
   un canal MIDI par instrument, la batterie sur le canal 10.
4. **Des vues d'instruments** qui partagent une interface : `allumer(note)`,
   `eteindre(note)`, `noteSous(pointeur)`, événements d'attaque et de relâche. Le numéro
   d'instrument General MIDI choisit la vue (clavier, lames, batterie, manche…).
5. **Une couche d'adaptation** autour des bibliothèques d'interface encore jeunes
   (audio/ui avant la 1.0) : nos composants les enveloppent.

## Pile technique

| Rôle | Choix |
| --- | --- |
| Langage, construction | TypeScript 7, Vite 8, React 19 |
| Style | Tailwind CSS 4, thème sombre et dense |
| Panneaux ancrables | Dockview (dockview-react) |
| Commandes audio | audio/ui (boutons rotatifs, faders, vumètres, pads) |
| État | zustand + immer |
| Son | SpessaSynth (spessasynth_lib) + GeneralUser GS (SF3) |
| Fichiers MIDI | @tonejs/midi |
| Piano roll, playlist | Canvas maison |
| Sauvegarde | IndexedDB (idb-keyval), export MIDI et WAV |
| Tests | Vitest (unitaires), Playwright (navigateur) |

## Étapes

| # | Étape | Contenu | Validation |
| --- | --- | --- | --- |
| 0 | Fondations | Modèle de projet, sérialisation, import MIDI multi-pistes, transport, moteur SpessaSynth, page de démonstration | Tests unitaires ; un fichier MIDI joue tous ses instruments en même temps, synchronisés |
| 1 | Coquille du studio | Thème, panneaux Dockview, barre de transport, raccourcis F5–F9, disposition sauvegardée | Tests navigateur de la coquille |
| 1 bis | Charte graphique | Variables du thème, composants habillés, maquette de l'écran complet | Captures d'écran |
| 2 | Navigateur | Morceaux de démonstration, recherche BitMidi, 128 instruments GM, import par glisser-déposer | Un import crée canaux, pattern et pistes de mixage |
| 3 | Channel Rack | Une ligne par instrument : muet, pan, volume, piste de mixage, 16 pas (jusqu'à 512), swing, vélocité par pas | Tests du séquenceur |
| 4 | Piano roll + vue d'instrument | Édition des notes, magnétisme, quantification, vélocité ; vue clavier ou batterie qui s'allume et se joue ; enregistrement en direct | Tests d'édition et de jeu |
| 5 | Mixer | Tranches (fader, pan, muet, solo, vumètre), effets, envois, maître | Tests de routage et de niveaux |
| 6 | Playlist | Clips de patterns, déplacement, boucle, zoom, mode Pat/Song | Tests d'arrangement |
| 7 | Vues avancées | Guitare et basse (doigté par programmation dynamique), cordes frottées, cuivres et vents | Aucun accord injouable, écart ≤ 4 cases |
| 8 | Jouer avec l'orchestre, export | Couper une piste pour la jouer soi-même, export WAV et MIDI | Tests d'export |
| 9 | Finitions | Performance avec 16 instruments, mobile (un panneau à la fois), tests de chaque panneau | Suite navigateur complète |

## Avancement

- [x] **Étape 0 — fondations** : modèle, sauvegarde, import MIDI, transport, moteur ; 27 tests
  unitaires, 8 tests navigateur.
- [x] **Étape 1 — coquille du studio** : barre de transport (lecture/pause, arrêt, mode PAT,
  tempo, afficheurs position et temps, volume général), six panneaux Dockview ancrables avec
  tailles de départ, raccourcis F5–F9, Espace et Maj+Espace, disposition sauvegardée et
  réinitialisable, navigateur (démo, import par glisser-déposer, 128 instruments), Channel Rack
  (diodes d'activité, muet, solo, panoramique et volume en boutons rotatifs, aperçu des notes),
  annonces d'accessibilité en français ; intégration continue GitHub. 34 tests unitaires,
  17 tests navigateur.
- [x] **Étape 1 bis — charte graphique** : variables du thème (Tailwind et Dockview), afficheurs
  de type écran, boutons rotatifs habillés ; l'écran complet sert de maquette (capture dans les
  résultats des tests navigateur).
- [x] **Étape 2 — navigateur** : recherche en ligne BitMidi (délai de frappe, annulation des
  requêtes dépassées, messages aucun résultat / panne / fichier introuvable), un résultat chargé
  comme projet multi-pistes puis joué, cinq morceaux du domaine public, démo, import par
  glisser-déposer, 128 instruments. 36 tests unitaires, 21 tests navigateur (dont un sur le vrai
  réseau, lancé avec `RESEAU=1`).
- [ ] Étape 3 — Channel Rack et séquenceur pas à pas

## Notes techniques vérifiées

- SpessaSynth 4.4 : `noteOn(canal, note, vélocité, { time })` programme une note à un instant
  de l'horloge du processeur ; le nœud a 18 sorties : 0 = mixage principal, 1 = réverbération
  (mode convolution), 2 à 17 = un canal chacune (`connectChannel`), prévues pour la
  visualisation.
- GeneralUser GS v2.0.3 : licence permissive (utilisation dans des logiciels, modification du
  format permises ; héberger sa propre copie plutôt que de lier les fichiers de l'auteur).
  Copie SF3 de 8,4 Mo reprise du projet SpessaSynth, licence dans `public/soundfonts/`.
- BitMidi : API de recherche ouverte (`access-control-allow-origin: *`), fichiers MIDI
  téléchargeables depuis le navigateur.
- SpessaSynth ne vide pas sa file de messages datés (`stopAll` ne coupe que ce qui sonne) :
  pour annuler une note déjà programmée, on programme au même instant un CC 120 (coupure
  nette) sur son canal. Un CC 123 (relâchement) ne suffit pas : mesuré, la note s'entend
  entièrement. Test navigateur dédié dans `tests/e2e/fondations.spec.ts`.
- Le Chromium de Playwright 1.55 (Chromium 140) ne charge aucun module d'AudioWorklet
  (`addModule` ne se termine jamais, même hors ligne) ; celui de Playwright 1.64 (Chromium 156)
  fonctionne. Le projet utilise donc Playwright 1.64.
