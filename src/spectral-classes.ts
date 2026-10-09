/*
The spectral classes and their draw weights — a LEAF module on purpose.

`galaxy-data` and `voxel-galaxy` used to import each other (`generateGalaxy`
was an adapter over the voxel galaxy until 0.10), and a cycle is only safe
while neither side reads the other at MODULE EVALUATION. `voxel-galaxy` builds
its default mixes from these at load time, so they live here, where both can
reach them whatever imports what.
*/

/** The spectral classes, hot → cool. */
export const SPECTRAL_CLASSES = ['O', 'B', 'A', 'F', 'G', 'K', 'M'] as const
/**
 * Their draw weights. Top-heavy ON PURPOSE: with one global population a
 * realistic mix needs an obscene star count before a galaxy looks interesting
 * (see GALAXY-DESIGN.md).
 */
export const SPECTRAL_WEIGHTS = [0.0001, 0.2, 1, 3, 8, 12, 20]
