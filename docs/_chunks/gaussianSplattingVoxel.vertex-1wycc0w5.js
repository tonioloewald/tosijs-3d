import{Sy as v}from"./site-67aqcvea.js";import{Ty as q}from"./site-14gd6nnx.js";import{Uy as w}from"./site-29yt6p1a.js";import{Xy as k}from"./site-cgnh4nqy.js";import{Yy as j}from"./site-vsp6hkzp.js";import{_B as b}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var h="gaussianSplattingVoxelVertexShader",y=`#include<__decl__gaussianSplattingVertex>
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
vPatchPosition=position.xy;}`;if(!b.ShadersStore[h])b.ShadersStore[h]=y;var z=[q,j,k,v,w];for(let f of z)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var H={name:h,shader:y};export{H as gaussianSplattingVoxelVertexShader};

//# debugId=77A8D2699568BD2E64756E2164756E21
//# sourceMappingURL=gaussianSplattingVoxel.vertex-1wycc0w5.js.map
