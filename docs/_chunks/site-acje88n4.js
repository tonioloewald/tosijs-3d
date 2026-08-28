var a;(function(l){l.Animation="Animation",l.AnimationGroup="AnimationGroup",l.Mesh="Mesh",l.Material="Material",l.Camera="Camera",l.Light="Light"})(a||(a={}));function m(l,n,i,r){switch(n){case"Animation":return r?l.animations.find((u)=>u.uniqueId===i)??null:l.animations[i]??null;case"AnimationGroup":return r?l.animationGroups.find((u)=>u.uniqueId===i)??null:l.animationGroups[i]??null;case"Mesh":return r?l.meshes.find((u)=>u.uniqueId===i)??null:l.meshes[i]??null;case"Material":return r?l.materials.find((u)=>u.uniqueId===i)??null:l.materials[i]??null;case"Camera":return r?l.cameras.find((u)=>u.uniqueId===i)??null:l.cameras[i]??null;case"Light":return r?l.lights.find((u)=>u.uniqueId===i)??null:l.lights[i]??null;default:return null}}
export{a as Fp,m as Gp};

//# debugId=9DCA1AA20F90A6FA64756E2164756E21
//# sourceMappingURL=site-acje88n4.js.map
