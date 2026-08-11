var B;(function(b){b.Animation="Animation",b.AnimationGroup="AnimationGroup",b.Mesh="Mesh",b.Material="Material",b.Camera="Camera",b.Light="Light"})(B||(B={}));function E(b,D,k,z){switch(D){case"Animation":return z?b.animations.find((v)=>v.uniqueId===k)??null:b.animations[k]??null;case"AnimationGroup":return z?b.animationGroups.find((v)=>v.uniqueId===k)??null:b.animationGroups[k]??null;case"Mesh":return z?b.meshes.find((v)=>v.uniqueId===k)??null:b.meshes[k]??null;case"Material":return z?b.materials.find((v)=>v.uniqueId===k)??null:b.materials[k]??null;case"Camera":return z?b.cameras.find((v)=>v.uniqueId===k)??null:b.cameras[k]??null;case"Light":return z?b.lights.find((v)=>v.uniqueId===k)??null:b.lights[k]??null;default:return null}}
export{B as Rr,E as Sr};

//# debugId=3E1289902A26BF7464756E2164756E21
//# sourceMappingURL=site-j6qv97s6.js.map
