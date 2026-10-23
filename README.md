# Squishy Studio

A small Vietnamese 3D squishy playground. Five original procedural characters, a shared GPU deformation field, damped spring recovery, procedural Web Audio textures, rotation, zoom, custom colors, and responsive controls.

## Run locally

No installation or build step is required. From this directory:

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173. Use a modern browser with WebGL enabled.

## Controls

- Hold a character to squeeze. Drag across its surface to move the indentation.
- Choose **Xoay** and drag to rotate; dragging empty space also rotates.
- Scroll over the model to zoom.
- **Space** squeezes, **← / →** rotate, **1–5** select characters, **B / R** switch modes.
- Softness and bounce change the spring response. Volume and mute control synthesized sound.

All character geometry and sounds are generated in the application; no paid assets or sound files are needed. This is an interactive spring and surface deformation simulation, not a volumetric finite-element soft-body solver.

Three.js 0.180.0 is vendored in `dist/vendor/` under the MIT license. Google Fonts are optional; system fallbacks are supplied. The site otherwise runs entirely in the browser without accounts, backend storage, analytics or external model requests.
