import{oz as v}from"./site-yh10kg8k.js";import{pz as q}from"./site-b7qcx2vd.js";import{_B as b}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var k="selectionPixelShader",w=`#ifdef INSTANCES
flat varying float vSelectionId;
#else
uniform float selectionId;
#endif
#ifdef STORE_CAMERASPACE_Z
varying float vViewPosZ;
#else
varying float vDepthMetric;
#endif
#ifdef ALPHATEST
varying vec2 vUV;uniform sampler2D diffuseSampler;
#endif
#include<clipPlaneFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#ifdef ALPHATEST
if (texture2D(diffuseSampler,vUV).a<0.4)
discard;
#endif
#ifdef INSTANCES
float id=vSelectionId;
#else
float id=selectionId;
#endif
#ifdef STORE_CAMERASPACE_Z
gl_FragColor=vec4(id,vViewPosZ,0.0,1.0);
#else
gl_FragColor=vec4(id,vDepthMetric,0.0,1.0);
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=w;var x=[q,v];for(let f of x)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var B={name:k,shader:w};export{B as selectionPixelShader};

//# debugId=41B888323DF5F66464756E2164756E21
//# sourceMappingURL=selection.fragment-c5z4w3yk.js.map
