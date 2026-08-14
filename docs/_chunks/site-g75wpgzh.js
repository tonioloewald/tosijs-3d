import{_B as q}from"./site-1q3afg48.js";var v="blackAndWhitePixelShader",w=`varying vec2 vUV;uniform sampler2D textureSampler;uniform float degree;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{vec3 color=texture2D(textureSampler,vUV).rgb;float luminance=dot(color,vec3(0.3,0.59,0.11)); 
vec3 blackAndWhite=vec3(luminance,luminance,luminance);gl_FragColor=vec4(color-((color-blackAndWhite)*degree),1.0);}`;if(!q.ShadersStore[v])q.ShadersStore[v]=w;var y={name:v,shader:w};
export{y as Wk};

//# debugId=C38FDDC1604DA36C64756E2164756E21
//# sourceMappingURL=site-g75wpgzh.js.map
