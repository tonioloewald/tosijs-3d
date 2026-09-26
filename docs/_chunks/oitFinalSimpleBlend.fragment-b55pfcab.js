import{i}from"./site-1yf4ncc8.js";var o="oitFinalSimpleBlendPixelShader",r=`precision highp float;uniform sampler2D uFrontColor;void main() {ivec2 fragCoord=ivec2(gl_FragCoord.xy);vec4 frontColor=texelFetch(uFrontColor,fragCoord,0);glFragColor=frontColor;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;

//# debugId=76B55787BAA6EB2B64756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-b55pfcab.js.map
