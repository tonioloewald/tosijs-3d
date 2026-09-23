import{FD as e}from"./site-vrsvvb55.js";var r="blackAndWhitePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;uniform float degree;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{vec3 color=texture2D(textureSampler,vUV).rgb;float luminance=dot(color,vec3(0.3,0.59,0.11)); 
vec3 blackAndWhite=vec3(luminance,luminance,luminance);gl_FragColor=vec4(color-((color-blackAndWhite)*degree),1.0);}`;if(!e.ShadersStore[r])e.ShadersStore[r]=o;var c={name:r,shader:o};
export{c as $k};

//# debugId=6A2FE41FB120374364756E2164756E21
//# sourceMappingURL=site-tbtepnx5.js.map
