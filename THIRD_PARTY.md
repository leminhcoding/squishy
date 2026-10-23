# Third-party assets

## Three.js

Version 0.180.0, copyright the Three.js authors, MIT license.
Vendored files: `dist/vendor/three.module.js`, `dist/vendor/three.core.js`.
Full license: `dist/vendor/LICENSE`.
Source: https://github.com/mrdoob/three.js/tree/r180

## Recorded Foley

All three original recordings are released under **CC0 1.0 Universal**:
https://creativecommons.org/publicdomain/zero/1.0/

| Bundled asset | Recording / creator | Source and license page | Extract |
| --- | --- | --- | --- |
| `dist/audio/foam.wav` | **sponge** — sangtao | https://freesound.org/people/sangtao/sounds/190456/ | 0.48–4.72 s |
| `dist/audio/rubber.wav` | **Rubber sound** — hz37 | https://freesound.org/people/hz37/sounds/792463/ | 0.02–0.59 s |
| `dist/audio/squelch.wav` | **squishes.wav** — Eneasz | https://freesound.org/people/Eneasz/sounds/216882/ | 19.6–23.6 s |

Audio downloaded from the creators' public HQ MP3 previews:

- https://cdn.freesound.org/previews/190/190456_3491884-hq.mp3
- https://cdn.freesound.org/previews/792/792463_123355-hq.mp3
- https://cdn.freesound.org/previews/216/216882_2103700-hq.mp3

Edits: selected excerpts, mono downmix, DC/low-rumble filtering, conservative peak normalization, fades, 24 kHz / 16-bit PCM WAV. Runtime filtering, short grains and subtle playback-rate variation adapt these excerpts to each simulated material. No oscillator-generated tones remain.

These are substitute Foley textures. The sponge recording includes shampoo; the wet recording is cold thick noodle soup stirred with a spoon. They are **not** recordings of branded squishy products. The rubber recording is an actual rubber stretch sound. Credits are retained for provenance even though CC0 does not require attribution.

To reproduce: download the previews to `qa/audio-originals/{sponge,rubber,squelch}.mp3`, decode to 16-bit WAV with any audio converter (on macOS: `afconvert -f WAVE -d LEI16 input.mp3 output.wav`), then run `python3 scripts/prepare-audio.py`.

## Fonts

Be Vietnam Pro and Playfair Display are loaded from Google Fonts with system fallbacks. Their respective licenses are available from https://fonts.google.com/specimen/Be+Vietnam+Pro and https://fonts.google.com/specimen/Playfair+Display.

## Research videos and product references

Manufacturer videos were viewed for reference only. No brand video, soundtrack, logo, product photo or branded model is bundled in `dist/`. All twenty models and procedural surface textures are original code.
