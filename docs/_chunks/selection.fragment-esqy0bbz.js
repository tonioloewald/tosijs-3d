import{oz as a}from"./site-anrhqzyz.js";import{pz as r}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var n="selectionPixelShader",d=`#ifdef INSTANCES
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
`;if(!e.ShadersStore[n])e.ShadersStore[n]=d;var o=[r,a];for(let i of o)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var S={name:n,shader:d};export{S as selectionPixelShader};

//# debugId=89A99D6B11F21D1264756E2164756E21
//# sourceMappingURL=selection.fragment-esqy0bbz.js.map
