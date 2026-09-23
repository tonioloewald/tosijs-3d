import{FD as o}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var r="oitFinalSimpleBlendPixelShader",e=`precision highp float;uniform sampler2D uFrontColor;void main() {ivec2 fragCoord=ivec2(gl_FragCoord.xy);vec4 frontColor=texelFetch(uFrontColor,fragCoord,0);glFragColor=frontColor;}
`;if(!o.ShadersStore[r])o.ShadersStore[r]=e;var l={name:r,shader:e};export{l as oitFinalSimpleBlendPixelShader};

//# debugId=2C439BD51AB34A9164756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-tr4ca58g.js.map
