# Custom silhouette masks

- [x] Branch from the merged `main` as `feature/custom-mask-import`.
- [x] Add original star, cup, brain, and moose presets.
- [x] Accept PNG, JPEG, and WebP silhouettes up to 5 MB.
- [x] Rasterize uploads to a bounded grayscale sample grid.
- [x] Add threshold, invert, preview, filename, and active-cell feedback.
- [x] Retain only the largest four-connected region so every generated maze is connected.
- [x] Apply custom masks to every generator, solver, animation, statistic, and border.
- [x] Persist custom masks in settings, saved mazes, and share links.
- [x] Complete the consolidated unit/build pass and targeted desktop/mobile browser validation.

The bundled silhouettes and mask formulas are original project assets. Raster-only
upload avoids executing or retaining uploaded SVG markup.
