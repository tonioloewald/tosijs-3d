import{_B as b}from"./site-7jxv124x.js";var q="oitBackBlendPixelShader",v=`precision highp float;uniform sampler2D uBackColor;void main() {glFragColor=texelFetch(uBackColor,ivec2(gl_FragCoord.xy),0);if (glFragColor.a==0.0) { 
discard;}}`;if(!b.ShadersStore[q])b.ShadersStore[q]=v;var x={name:q,shader:v};
export{x as Im};

//# debugId=347406EB712C053064756E2164756E21
//# sourceMappingURL=site-bnf1nc6y.js.map
