/*
OUR MATERIAL PLUGINS OUTLIVE THE LAST ENGINE. Babylon unregisters every
material plugin when the last engine is disposed
(`EngineStore.OnEnginesDisposedObservable` → `UnregisterAllMaterialPlugins`),
but ours are registered once, when their module is imported. So a page that
disposed its only scene and built another (a route change, the doc browser
swapping pages) made materials without them: skin shading threw 'plugin not
registered' and the rest silently stopped applying.

`registerMaterialPlugin` registers now and again after every such clear.
Babylon's own observer is added when `@babylonjs/core` is imported, before any
of ours, so it clears first and this puts ours back.
*/
import * as BABYLON from '@babylonjs/core';
const ours = new Map();
let watching = false;
export function registerMaterialPlugin(name, factory) {
    ours.set(name, factory);
    BABYLON.RegisterMaterialPlugin(name, factory);
    if (watching)
        return;
    watching = true;
    BABYLON.EngineStore.OnEnginesDisposedObservable.add(() => {
        for (const [n, f] of ours)
            BABYLON.RegisterMaterialPlugin(n, f);
    });
}
//# sourceMappingURL=material-plugins.js.map