import{_B as e}from"./site-ea0e8ybd.js";var r="boundingBoxRendererPixelShader",n=`uniform color: vec4f;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
fragmentOutputs.color=uniforms.color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=n;var t={name:r,shader:n};
export{t as Sg};

//# debugId=71DFC3D50C301C2B64756E2164756E21
//# sourceMappingURL=site-emagn29h.js.map
