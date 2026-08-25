import{Sy as n}from"./site-s69xd5vh.js";import{Ty as r}from"./site-5kdd0re5.js";import{Uy as l}from"./site-09xbh2bf.js";import{Xy as o}from"./site-eph9mm4n.js";import{Yy as e}from"./site-yygbvmyr.js";import{_B as t}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var i="gaussianSplattingVoxelVertexShader",s=`#include<__decl__gaussianSplattingVertex>
uniform vec2 dataTextureSize;uniform float alpha;uniform mat4 invWorldScale;uniform mat4 viewMatrix;uniform sampler2D rotationsATexture;uniform sampler2D rotationsBTexture;uniform sampler2D rotationScaleTexture;uniform sampler2D centersTexture;uniform sampler2D colorsTexture;
#if IS_COMPOUND
uniform mat4 partWorld[MAX_PART_COUNT];uniform float partVisibility[MAX_PART_COUNT];uniform sampler2D partIndicesTexture;
#endif
varying vec3 vNormalizedPosition;varying vec3 vNormalizedCenterPosition;varying float vAlpha;varying vec2 vPatchPosition;
#include<gaussianSplatting>
void main(void) {float splatIndex=getSplatIndex(int(position.z+0.5));Splat splat=readSplat(splatIndex);
#if IS_COMPOUND
if (partVisibility[splat.partIndex]==0.0) {gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
mat4 splatWorld=getPartWorld(splat.partIndex);
#else
mat4 splatWorld=world;
#endif
vec4 worldPos=computeVoxelSplatWorldPos(splat.rotationA,splat.rotationB,splat.rotationScale,splat.center.xyz,splatWorld,viewMatrix,invWorldScale,position.xy);gl_Position=viewMatrix*invWorldScale*worldPos;vNormalizedPosition=gl_Position.xyz*0.5+0.5;vec4 viewCenterPos=viewMatrix*invWorldScale*splatWorld*vec4(splat.center.xyz,1.0);vNormalizedCenterPosition=viewCenterPos.xyz*0.5+0.5;vAlpha=splat.color.w*alpha;
#if IS_COMPOUND
vAlpha*=partVisibility[splat.partIndex];
#endif
vPatchPosition=position.xy;}`;if(!t.ShadersStore[i])t.ShadersStore[i]=s;var p=[r,e,o,n,l];for(let a of p)if(!t.IncludesShadersStore[a.name])t.IncludesShadersStore[a.name]=a.shader;var S={name:i,shader:s};export{S as gaussianSplattingVoxelVertexShader};

//# debugId=1DB86A79E24D96D964756E2164756E21
//# sourceMappingURL=gaussianSplattingVoxel.vertex-zsdm1rf4.js.map
