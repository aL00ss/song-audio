# Construction des banques de sons

Ces scripts fabriquent les banques supplémentaires de `public/soundfonts/` à partir des
bibliothèques d'échantillons d'origine (non incluses dans le dépôt, trop lourdes).

Environnement : Python 3.11 avec `numpy` et `soundfile` 0.13 ou plus récent (libsndfile y est
fourni, avec l'encodeur Ogg Vorbis).

```sh
python -m venv .venv
.venv/Scripts/python -m pip install numpy==1.26.4 soundfile==0.13.1
```

- `sf3.py` : écriture d'une banque SoundFont 3 (échantillons Ogg Vorbis).
- `sfz.py` : lecture des régions d'un fichier SFZ.
- `piano.py` : piano à queue allégé, depuis Salamander Grand Piano V3 en 44,1 kHz 16 bits
  (https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html, CC BY 3.0) :
  `python piano.py <dossier du SFZ> ../../public/soundfonts/piano-salamander.sf3`
