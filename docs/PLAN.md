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
| 9 | Finitions et sons améliorés (web) | Performance avec 16 instruments, mobile (un panneau à la fois), tests de chaque panneau ; sons améliorés mais légers, chargés à la demande : piano Salamander allégé (4–5 couches de vélocité, ≈ 20–30 Mo), sections d'orchestre tirées de VSCO 2 CE (CC0) converties en SF3 ; mentions obligatoires (Alexander Holm, Versilian Studios) | Suite navigateur complète |
| 10 | Version de bureau (Tauri), sons de niveau professionnel | Même interface React dans une application Tauri ; moteur sonore en Rust ; banques professionnelles gratuites et redistribuables lues depuis le disque (plusieurs Go), synthétiseurs et effets intégrés, accueil des greffons CLAP/VST3 : détail dans « Étape 10 » ci-dessous ; le site web reste disponible avec les banques légères | Justesse, niveaux, latence, charge avec 16 instruments, rendu hors ligne |

## Décisions (2026-11-17)

- Le site web garde des banques légères (GeneralUser GS + piano allégé + sections VSCO 2 à la
  demande) : chaque visiteur les télécharge, et GitHub refuse les fichiers de plus de 100 Mo.
- La qualité maximale (banques gratuites de plusieurs Go) est réservée à la version de bureau
  Tauri de l'étape 10, qui lit les sons depuis le disque.
- L'application de bureau sera dans un **nouveau dépôt**, créé après la fin de l'étape 9. Ce
  dépôt-ci (song-audio) reste la version web et doit continuer de fonctionner sur
  https://al00ss.github.io/song-audio/.

## Étape 10 : sons de niveau professionnel (recherche du 2026-11-18)

But : des sons qui tiennent la comparaison avec un studio commercial comme FL Studio. Deux
moitiés, car la musique actuelle mêle les deux : des instruments acoustiques échantillonnés
(banques gratuites enregistrées par des professionnels) et des sons électroniques (synthétiseurs
et effets), que des échantillons seuls ne remplacent pas.

Règle : seulement des banques dont la licence permet de les **redistribuer** dans une
application gratuite (CC0, CC BY, ou « sans restriction »). Les crédits obligatoires sont
affichés dans l'application (page Crédits) et dans le dépôt.

### Banques acoustiques retenues (licences vérifiées)

| Famille | Banque | Licence | Taille | Points forts |
|---|---|---|---|---|
| Piano à queue | Salamander Grand Piano V3 complet, 48 kHz 24 bits (Alexander Holm) | CC BY 3.0 | 1,2 Go | 16 couches de vélocité, sons de relâchement et de pédale |
| Pianos, clavecins | VCSL Keys (Versilian Studios) : 3 pianos à queue, 2 droits, 5 clavecins | CC0 | 680 Mo | variété de timbres |
| Orchestre | VSCO 2 CE complet (Versilian Studios) : toutes les articulations (tenu, vibrato, spiccato, pizzicato, trémolo, sourdines) | CC0 | 2,3 Go | sections et solistes |
| Instruments variés | VCSL complet (Versilian Studios) : saxophones, flûtes à bec, harmonica, orgue, percussions | CC0 | 5 Go | complète l'orchestre |
| Orchestre, complément | University of Iowa MIS (Lawrence Fritts) : pp, mf, ff, note par note | « sans restriction » | — | enregistré en chambre anéchoïque (réverbération à ajouter) |
| Batterie acoustique | Naked Drums (Wilkinson Audio) : 10 prises, 5 couches, plusieurs micros | CC BY 4.0 | 1,3 Go | qualité studio |
| Batterie acoustique | DrumGizmo DRS Kit et Muldjord Kit | CC BY 4.0 | 750 + 350 Mo | prise de son complète |
| Batterie acoustique | Karoryfer Big Rusty Drums, Unruly Drums | CC0 | — | autres couleurs |
| Basse électrique | Karoryfer Growlybass, Swagbass, Fashionbass, Black and Blue Basses | CC0 | — | 3–4 couches, 4 prises |
| Contrebasse, guitare | Karoryfer Meatbass, Emilyguitar | à vérifier avant usage | — | — |

Écartées : Piano in 162 (redistribution interdite), Philharmonia Orchestra (interdit de les
diffuser « telles quelles »), Sonatina Symphonic Orchestra (Sampling Plus, statut incertain),
Virtual Playing Orchestra (redistribution libre mais contient Philharmonia et Sonatina ; on
pourra proposer de l'installer soi-même), jRhodes3d (échantillons CC BY-NC).
Manques des banques libres : piano électrique et orgue de qualité : ils seront synthétisés.

### Sons électroniques : synthèse et effets intégrés (Rust)

- Synthétiseurs (bibliothèque fundsp, MIT/Apache) : soustractif analogique à 3 oscillateurs,
  FM à 6 opérateurs, table d'ondes ; batteries électroniques synthétisées façon boîtes à
  rythmes classiques (grosse caisse, caisse claire, charleston, clap), sans échantillons de
  machines du commerce ; orgue à roues phoniques ; piano électrique en synthèse FM.
- Effets par piste et sur le maître : réverbération algorithmique et à convolution
  (réponses impulsionnelles libres, par exemple OpenAIR, CC BY), délai, chorus, flanger,
  phaser, compresseur avec sidechain, saturation, égaliseur paramétrique, filtre automatisable.
- Bibliothèque de préréglages par style (électro, hip-hop, pop, orchestral).
- Accueil des greffons CLAP et VST3 : on peut alors jouer avec Surge XT, Vital, Dexed ou
  Odin 2 (gratuits, GPL-3) installés par l'utilisateur.

### Moteur et livraison

- Lecture des SFZ par sfizz (BSD-2, API C liée depuis Rust) ; GeneralUser GS reste la banque de
  secours pour les 128 instruments General MIDI ; sortie audio par cpal, faible latence.
- Les banques ne sont pas dans l'installeur : un gestionnaire les télécharge au premier
  lancement (choix, progression, reprise, somme de contrôle) et les range sur le disque.
- Tests : justesse et niveaux de chaque instrument (même méthode qu'à l'étape 9), latence
  sous 10 ms, charge avec 16 instruments, rendu hors ligne identique à la lecture.

### Décision à prendre à la création du dépôt

- Licence du nouveau dépôt : en GPL-3, on pourrait intégrer directement le moteur de Surge XT
  dans l'application ; avec une licence permissive (MIT), Surge XT et Vital restent utilisables
  comme greffons installés à part.

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
- [x] **Étape 3 — séquenceur pas à pas** : un pas est une note (double croche, hauteur par défaut du
  canal), grille cliquable, au clavier, peinte au glisser, effacée au clic droit ; tête de
  lecture ; édition en pleine lecture ; son de batterie par ligne (chaque batterie sur son propre
  canal MIDI réglé en batterie) ; longueur de 1 à 512 pas ; swing global ; éditeur de vélocité
  aligné sur les pas ; aperçu des notes pour les morceaux importés ; nouveau projet avec un kit de
  quatre sons ; projets anciens relus (hauteur par défaut et swing ajoutés). 46 tests unitaires,
  26 tests navigateur.
- [x] **Étape 4 — piano roll et vue d'instrument** : piano roll en Canvas (ajout aimanté, déplacement,
  redimensionnement, effacement au clic droit, lasso, Suppr, Ctrl+A, flèches, quantification,
  couloir de vélocité, molette et zoom, tête de lecture, écoute au clavier vertical) ; vue
  d'instrument (clavier 88 touches jouable à la souris en glissando, pads de batterie disposés
  comme un kit), allumée pendant la lecture ; jeu au clavier de l'ordinateur (AZERTY ou QWERTY,
  ← → octave) ; enregistrement en direct dans le pattern. 57 tests unitaires, 32 tests
  navigateur.
- [x] **Étape 5 — mixer** : chaque canal MIDI sort séparément du synthétiseur (mesuré : sorties
  isolées, volume du canal respecté) vers sa tranche : égaliseur 3 bandes, fader (loi
  quadratique, 0,8 = 0 dB), panoramique, muet, solo, vumètre stéréo, envoi vers une réverbération
  commune (réponse impulsionnelle générée) ; maître avec limiteur ; routage des canaux choisi dans
  le Channel Rack ; réverbération et chorus du synthétiseur coupés. Limite : 16 sorties séparées
  (au-delà, deux canaux partagent une tranche). 62 tests unitaires, 38 tests navigateur (mesures
  du son de chaque piste).
- [x] **Étape 6 — playlist** : plusieurs patterns (créer, dupliquer, renommer, supprimer, choisir dans
  la barre de transport ou la liste) ; playlist avec règle des mesures (clic : aller à cet
  endroit), pistes, clips aimantés à la mesure (poser, glisser, supprimer au clic droit, double
  clic pour choisir le pattern), aperçu des notes, tête de lecture, zoom ; mode PAT/SONG : le
  transport joue tout l'arrangement et boucle à sa fin. 67 tests unitaires, 42 tests navigateur.
- [x] **Publication** : https://al00ss.github.io/song-audio/, construite et publiée par la CI quand
  les tests passent sur `main` ; les tests navigateur peuvent viser le site publié (URL_STUDIO).
- [x] **Étape 7 — vues d'instruments avancées** : manche pour guitare, basse (et sitar, banjo…) avec
  doigté par programmation dynamique (une corde par note, écart de main ≤ 4 cases, préférence
  pour le bas du manche, déplacements limités ; un accord de do donne le do ouvert), touche sans
  frettes pour violon, alto, violoncelle, contrebasse ; harpe (cordes diatoniques colorées,
  glissando) ; pistons des cuivres (trompette, tuba, cor) au-dessus du clavier ; les bois restent
  joués au clavier. 75 tests unitaires, 49 tests navigateur.
- [x] **Étape 8 — jouer avec l'orchestre, export** : menu Fichier (nouveau, ouvrir et enregistrer
  un projet `.song-audio.json`, exporter en MIDI, exporter en WAV) ; export WAV rendu hors ligne
  avec le même synthétiseur, le même état des canaux et le même mixer (3 s de queue) ;
  sauvegarde automatique dans le navigateur (IndexedDB, 0,8 s après chaque modification) et
  reprise au démarrage ; « Jouer la partie » dans la vue d'instrument : le canal se tait, ses
  notes s'allument en guide, la lecture démarre et chaque note jouée est comptée juste (même
  hauteur, à un pas près, la fin de boucle rejoignant le début) ou fausse. 83 tests unitaires,
  54 tests navigateur.
- [x] **Étape 9 — finitions, sons améliorés mais légers** : banques supplémentaires chargées à
  la demande (seulement si le projet utilise un de leurs instruments ; GeneralUser GS joue en
  attendant, puis passe derrière elles) : piano à queue Salamander allégé (17 Mo, 5 couches de
  vélocité) ; cordes (11 Mo), cuivres (5 Mo) et bois (4,5 Mo) de VSCO 2 CE, avec hauteurs
  mesurées, boucles en fondu enchaîné, niveaux égalisés note par note puis alignés sur
  GeneralUser GS à ±3 dB ; outils de construction dans `outils/banques`. Export WAV sans
  normalisation (il garde le niveau du mixage). Téléphone : un panneau à la fois, choisi par
  onglets. 16 instruments (19 canaux avec les batteries) : 60 images/s pendant la lecture, tous
  entendus ; 32 canaux MIDI créés au démarrage (au-delà de 16, SpessaSynth annonçait les
  réglages d'un canal avant sa création, d'où des erreurs). Chaque panneau a ses tests
  navigateur. 86 tests unitaires, 64 tests navigateur.
- [ ] Étape 10 — version de bureau Tauri, dans un nouveau dépôt

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
