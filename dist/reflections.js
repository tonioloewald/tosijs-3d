import { 
// RenderTargetTexture,
ReflectionProbe, 
// CubeTexture,
// Color3,
StandardMaterial, PBRMaterial, } from '@babylonjs/core';
export function initializeReflections(scene, probeSize = 512, refreshRate = 5) {
    const mirroredMeshes = new Map();
    const onMeshAddedObserver = scene.onNewMeshAddedObservable.add((newMesh) => {
        if (newMesh.name.includes('_mirror')) {
            console.log(`Found a mirror mesh: ${newMesh.name}. Setting up object-based dynamic reflection.`);
            const probe = new ReflectionProbe(`${newMesh.uniqueId}_probe`, probeSize, scene);
            const mirrorMaterial = newMesh.material?.clone(`${newMesh.uniqueId}_mirror_material`);
            if (mirrorMaterial instanceof StandardMaterial ||
                mirrorMaterial instanceof PBRMaterial) {
                mirrorMaterial.reflectionTexture = probe.cubeTexture;
                newMesh.material = mirrorMaterial;
            }
            else {
                console.warn(`Material on mesh "${newMesh.name}" does not support setFloat. Reflection roughness might not be set.`);
            }
            probe.refreshRate = refreshRate;
            probe.renderList = scene.meshes.filter((mesh) => mesh !== newMesh);
            probe.attachToMesh(newMesh);
            const onDisposeObserver = newMesh.onDisposeObservable.addOnce(() => {
                console.log(`Mirror mesh removed: ${newMesh.name}. Cleaning up reflection.`);
                probe.dispose();
                mirroredMeshes.delete(newMesh.uniqueId.toString());
            });
            mirroredMeshes.set(newMesh.uniqueId.toString(), {
                mesh: newMesh,
                probe,
                onDisposeObserver,
            });
        }
    });
    const onMeshRemovedObserver = scene.onMeshRemovedObservable.add((removedMesh) => {
        const mirroredEntry = mirroredMeshes.get(removedMesh.uniqueId.toString());
        if (mirroredEntry) {
            console.log(`Mirror mesh explicitly removed: ${removedMesh.name}. Cleaning up reflection.`);
            mirroredEntry.probe.dispose();
            mirroredMeshes.delete(removedMesh.uniqueId.toString());
        }
    });
    // Optional: Clean up the scene observers
    scene.onDisposeObservable.addOnce(() => {
        if (onMeshAddedObserver) {
            scene.onNewMeshAddedObservable.remove(onMeshAddedObserver);
        }
        if (onMeshRemovedObserver) {
            scene.onMeshRemovedObservable.remove(onMeshRemovedObserver);
        }
        mirroredMeshes.forEach(({ probe }) => {
            probe.dispose();
        });
        mirroredMeshes.clear();
    });
}
//# sourceMappingURL=reflections.js.map