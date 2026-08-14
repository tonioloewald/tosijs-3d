import{_B as k}from"./site-1q3afg48.js";var q="iblCdfxPixelShader",v=`precision highp sampler2D;
#define PI 3.1415927
varying vec2 vUV;uniform sampler2D cdfy;void main(void) {ivec2 cdfyRes=textureSize(cdfy,0);ivec2 currentPixel=ivec2(gl_FragCoord.xy);float cdfx=0.0;for (int x=1; x<=currentPixel.x; x++) {cdfx+=texelFetch(cdfy,ivec2(x-1,cdfyRes.y-1),0).x;}
gl_FragColor=vec4(vec3(cdfx),1.0);}`;if(!k.ShadersStore[q])k.ShadersStore[q]=v;var y={name:q,shader:v};
export{y as qi};

//# debugId=90C61AD8D7E54C1764756E2164756E21
//# sourceMappingURL=site-cwqvrk9t.js.map
