import{_B as b}from"./site-1q3afg48.js";var k="highlightsPixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;const vec3 RGBLuminanceCoefficients=vec3(0.2126,0.7152,0.0722);
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{vec4 tex=texture2D(textureSampler,vUV);vec3 c=tex.rgb;float luma=dot(c.rgb,RGBLuminanceCoefficients);gl_FragColor=vec4(pow(c,vec3(25.0-luma*15.0)),tex.a); }`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};
export{w as dh};

//# debugId=9D27D107E0D8C32464756E2164756E21
//# sourceMappingURL=site-dy7c5gaj.js.map
