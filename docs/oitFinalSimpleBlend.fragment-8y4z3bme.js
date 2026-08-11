import{_B as b}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var k="oitFinalSimpleBlendPixelShader",q=`precision highp float;uniform sampler2D uFrontColor;void main() {ivec2 fragCoord=ivec2(gl_FragCoord.xy);vec4 frontColor=texelFetch(uFrontColor,fragCoord,0);glFragColor=frontColor;}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};export{w as oitFinalSimpleBlendPixelShader};

//# debugId=98D814A634699D2F64756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-8y4z3bme.js.map
