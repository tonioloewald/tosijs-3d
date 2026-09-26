import{Co,Yl,Eo}from"./site-9hv2gc9y.js";import{Rt}from"./site-sdr5y55w.js";import{nr}from"./site-j5z8knjd.js";import{i}from"./site-1yf4ncc8.js";var a="gaussianSplattingVoxelVertexShader",e=`#include<__decl__gaussianSplattingVertex>
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
vPatchPosition=position.xy;}`;if(!i.ShadersStore[a])i.ShadersStore[a]=e;var o=[Co,Rt,nr,Yl,Eo];for(let t of o)if(!i.IncludesShadersStore[t.name])i.IncludesShadersStore[t.name]=t.shader;var m={name:a,shader:e};export{m as gaussianSplattingVoxelVertexShader};

//# debugId=94E293B641A8E4FE64756E2164756E21
//# sourceMappingURL=gaussianSplattingVoxel.vertex-rkv72knk.js.map
