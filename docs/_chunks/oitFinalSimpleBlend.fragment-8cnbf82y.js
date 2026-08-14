import{_B as b}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var k="oitFinalSimpleBlendPixelShader",q=`precision highp float;uniform sampler2D uFrontColor;void main() {ivec2 fragCoord=ivec2(gl_FragCoord.xy);vec4 frontColor=texelFetch(uFrontColor,fragCoord,0);glFragColor=frontColor;}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};export{w as oitFinalSimpleBlendPixelShader};

//# debugId=43F1FAB450B07AED64756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-8cnbf82y.js.map
