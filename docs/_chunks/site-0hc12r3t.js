import{_B as b}from"./site-1q3afg48.js";var q="oitBackBlendPixelShader",v=`precision highp float;uniform sampler2D uBackColor;void main() {glFragColor=texelFetch(uBackColor,ivec2(gl_FragCoord.xy),0);if (glFragColor.a==0.0) { 
discard;}}`;if(!b.ShadersStore[q])b.ShadersStore[q]=v;var x={name:q,shader:v};
export{x as Im};

//# debugId=E68B25F2184BFB7D64756E2164756E21
//# sourceMappingURL=site-0hc12r3t.js.map
