import{_B as o}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="oitFinalSimpleBlendPixelShader",e=`precision highp float;uniform sampler2D uFrontColor;void main() {ivec2 fragCoord=ivec2(gl_FragCoord.xy);vec4 frontColor=texelFetch(uFrontColor,fragCoord,0);glFragColor=frontColor;}
`;if(!o.ShadersStore[r])o.ShadersStore[r]=e;var l={name:r,shader:e};export{l as oitFinalSimpleBlendPixelShader};

//# debugId=326F9048EF50752664756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-1z60kaj4.js.map
