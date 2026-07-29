import{oz as v}from"./site-fdg03zpz.js";import{pz as q}from"./site-ex7cky94.js";import{_B as b}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var k="selectionPixelShader",w=`#ifdef INSTANCES
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

//# debugId=6CE7F631900EE91B64756E2164756E21
//# sourceMappingURL=selection.fragment-2ns4ja14.js.map
