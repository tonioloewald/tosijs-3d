import{dz as p}from"./site-nn0nygmy.js";import{ez as c}from"./site-f0fs45dy.js";import{fz as l}from"./site-f9zcj7v8.js";import{gz as m}from"./site-5dj2847h.js";import{pA as n}from"./site-px85h4wa.js";import{qA as a}from"./site-1d4pv99f.js";import{rA as i,sA as d}from"./site-fzx6y8wc.js";import{tA as t}from"./site-fd6t4ht9.js";import{uA as s}from"./site-ner59851.js";import{FD as e}from"./site-vrsvvb55.js";var o="pickingVertexShader",f=`attribute vec3 position;
#if defined(INSTANCES)
attribute float instanceMeshID;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<instancesDeclaration>
uniform mat4 viewProjection;
#if defined(INSTANCES)
flat varying float vMeshID;
#endif
void main(void) {vec3 positionUpdated=position;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);gl_Position=viewProjection*worldPos;
#if defined(INSTANCES)
vMeshID=instanceMeshID;
#endif
}
`;if(!e.ShadersStore[o])e.ShadersStore[o]=f;var h=[t,i,m,c,n,l,p,a,s,d];for(let r of h)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var k={name:o,shader:f};
export{k as Fv};

//# debugId=45750D6B96391AE264756E2164756E21
//# sourceMappingURL=site-xwx1kxc8.js.map
