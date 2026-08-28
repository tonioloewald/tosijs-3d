import{DD as e}from"./site-53d1aqt6.js";var r="boundingBoxRendererPixelShader",n=`uniform color: vec4f;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
fragmentOutputs.color=uniforms.color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=n;var t={name:r,shader:n};
export{t as Yg};

//# debugId=F293D388F275368664756E2164756E21
//# sourceMappingURL=site-m9kf7z88.js.map
