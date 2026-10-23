# Material and motion references

Researched 2026-10-23. Observations below distinguish direct video inspection, manufacturer descriptions, and implementation choices.

## Video actually inspected

**Mellojoy product demonstration**, embedded on https://mellojoyus.com/.

[Direct 17.6-second video](https://mellojoyus.com/cdn/shop/videos/c/vp/f0e4157b096a4fbca97d12537567eb58/f0e4157b096a4fbca97d12537567eb58.HD-1080p-7.2Mbps-49260939.mp4).

The clip was played/searched in Chrome; frames were inspected at 0–16 seconds. Useful observations:

- **0–1 s:** the roll-shaped object has a visibly fine, irregular crumb-like surface rather than a polished plastic skin.
- **2–3 s:** a hand pulls the object upward; the section narrows as it stretches, while its base remains on the tray.
- **4–5 s:** two hands stretch it horizontally and compress it back together. Deformation follows the hands; the painted pattern travels with the material.
- **7 s:** a small protrusion is pulled away from the main mass, creating a narrow neck.
- **8–10 s:** a different animal-shaped object is supported on a palm. This is an edited transition, not proof of the previous object's recovery time.
- **12 s:** two thumbs form localized indentations; nearby material folds and moves to the sides.
- **14–16 s:** deep grip and thumb indentations change the silhouette substantially while surface details remain attached.

The edits, unknown force and changing products prevent trustworthy recovery-time, modulus or damping measurements. This video is used qualitatively, not as a calibrated physics experiment.

A second, 64.448-second homepage video was also opened. Its sampled introduction at 2, 6 and 10 seconds is animated brand storytelling, so it was excluded as evidence of real material behavior.

## Additional references and access limits

- [Schylling — NeeDoh Nice Cube](https://schylling.com/product/needoh-nice-cube/): the manufacturer explicitly describes softer slow squeezing and firmer fast squeezing, plus a dough-like filling. Used to motivate rate-dependent resistance and lateral bulging for the gel preset. No precise chemical formulation or physical constants are assumed.
- [iBLOOM — About us](https://i-bloom.shop/en-us/pages/about-us): describes the soft tactile design of its squishies. [I Love Peach King product page](https://i-bloom.shop/en-us/products/i-love-peach-king-2) supplied the official embedded [YouTube demonstration](https://www.youtube.com/watch?v=7x21s517w_g). The embed could be opened but its video stream did not load in this environment. It was **not** counted as watched or used for frame-based measurements.
- [Mellojoy homepage](https://mellojoyus.com/): identifies silicone and a soft mousse-like tactile direction. Its product demo above supplied the observable local stretching and thumb-press behavior.
- The Schylling product page's embedded video was not accessible in the local browser. Manufacturer text supports the qualitative gel response; no video measurement of Nice Cube is claimed.

## Mapping to the application

| Preset | Surface | Deformation direction | Memory / recovery |
| --- | --- | --- | --- |
| Foam hồi chậm | Matte, procedural fine pores | Local compressible dent, limited side bulge | Large slow component; no cartoon spring overshoot |
| Foam marshmallow | Softer matte, slightly more pore detail | Broad, deep, easily compressed area | Slower recovery than the standard foam |
| Mochi đàn hồi | Smooth, modest clearcoat | Stronger lateral bulge and draggable surface | Mostly quick elastic response |
| Silicone dẻo | Smooth satin skin | Wider stretch, cohesive surface | Intermediate memory and recovery |
| Gel đặc | Smooth glossy skin | Strong lateral bulge, resistance to fast motion | Delayed creep and gradual settling |

These are artistic material families, not replicas of named products. “Mochi” is a feel/style label here, not a verified chemical formulation. The foam presets use a generic foam-like response; the exact resin of a particular iBLOOM model has not been established from the inspected sources.

The solver has a fast damped component and a slower exponential memory component. A held press creeps toward its target; releasing it decays stored strain over time. A material-specific factor reduces deformation under fast input, particularly for the dense gel preset. A shared displacement field keeps facial details attached and follows the contact normal, rather than always flattening along world Y.

Picking is evaluated on CPU-deformed proxy geometry. Barycentric mapping recovers the original surface point for a new press, including while old dents are still recovering. Rendered geometry and shadows use the same field on the GPU.

`dist/profiles.js` contains tunable **chosen** parameters. The `recovery` time constant is not a measured full-return duration: a simple exponential is around 95% recovered after three time constants; the UI speed control scales this value. No manufacturer claims support the numeric values in the presets.

## Limits

This is a local viscoelastic deformation-field simulation, not a finite-element solid, fluid solver or collision model of a real hand. One active pointer and four recovering contact regions are supported. Large stretches are limited to keep the meshes stable. Shader surface pores are procedural, not scans of a commercial squishy. Foley is recorded substitute material sound; provenance and edits are documented in `THIRD_PARTY.md`.

## Familiar shop shapes added

The catalog now contains 20 original models. For recognizable shop-style shapes, the [iBLOOM realistic-products catalog](https://i-bloom-squishy.com/products/real/) was consulted: it lists croissants, milk toast, donuts, strawberries, burgers and sushi among its products. The [Milk Toast page](https://i-bloom.shop/en-us/products/milk-toast-reborn) provides an additional bread-shape reference. The rounded gel block is a generic shape informed by the previously cited Nice Cube material description. The remaining additions use familiar food/toy forms without reproducing branded characters, logos, packaging artwork or product meshes.

New models: milk toast, croissant, steamed bun, strawberry donut, strawberry, watermelon slice, strawberry milk carton, ice-cream cone, pancake stack, cat paw, onigiri, tamago sushi, yellow duck, rounded gel block and burger. Each is built from code-native meshes, and uses the same shared deformation, picking, material selection and Foley system as the original five models.
