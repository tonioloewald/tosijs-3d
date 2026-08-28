import{DD as o}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var r="oitFinalSimpleBlendPixelShader",e=`precision highp float;uniform sampler2D uFrontColor;void main() {ivec2 fragCoord=ivec2(gl_FragCoord.xy);vec4 frontColor=texelFetch(uFrontColor,fragCoord,0);glFragColor=frontColor;}
`;if(!o.ShadersStore[r])o.ShadersStore[r]=e;var l={name:r,shader:e};export{l as oitFinalSimpleBlendPixelShader};

//# debugId=7ADAF1ED315C67A864756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-kcp3kbfd.js.map
