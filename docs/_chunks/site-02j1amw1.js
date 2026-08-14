import{_B as b}from"./site-1q3afg48.js";var k="filterPixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;uniform mat4 kernelMatrix;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{vec3 baseColor=texture2D(textureSampler,vUV).rgb;vec3 updatedColor=(kernelMatrix*vec4(baseColor,1.0)).rgb;gl_FragColor=vec4(updatedColor,1.0);}`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};
export{w as Ik};

//# debugId=B421FBD3C64EAACA64756E2164756E21
//# sourceMappingURL=site-02j1amw1.js.map
