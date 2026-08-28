import{DD as e}from"./site-53d1aqt6.js";var r="highlightsPixelShader",t=`varying vec2 vUV;uniform sampler2D textureSampler;const vec3 RGBLuminanceCoefficients=vec3(0.2126,0.7152,0.0722);
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{vec4 tex=texture2D(textureSampler,vUV);vec3 c=tex.rgb;float luma=dot(c.rgb,RGBLuminanceCoefficients);gl_FragColor=vec4(pow(c,vec3(25.0-luma*15.0)),tex.a); }`;if(!e.ShadersStore[r])e.ShadersStore[r]=t;var o={name:r,shader:t};
export{o as Wg};

//# debugId=553048B074D5101764756E2164756E21
//# sourceMappingURL=site-tnmzdxd6.js.map
