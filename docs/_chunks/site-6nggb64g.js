import{_B as o}from"./site-ea0e8ybd.js";var r="oitBackBlendPixelShader",e=`precision highp float;uniform sampler2D uBackColor;void main() {glFragColor=texelFetch(uBackColor,ivec2(gl_FragCoord.xy),0);if (glFragColor.a==0.0) { 
discard;}}`;if(!o.ShadersStore[r])o.ShadersStore[r]=e;var i={name:r,shader:e};
export{i as Im};

//# debugId=9F958A5C4713D57364756E2164756E21
//# sourceMappingURL=site-6nggb64g.js.map
