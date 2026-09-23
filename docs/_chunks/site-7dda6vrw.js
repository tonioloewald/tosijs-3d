import{FD as o}from"./site-vrsvvb55.js";var r="oitBackBlendPixelShader",e=`precision highp float;uniform sampler2D uBackColor;void main() {glFragColor=texelFetch(uBackColor,ivec2(gl_FragCoord.xy),0);if (glFragColor.a==0.0) { 
discard;}}`;if(!o.ShadersStore[r])o.ShadersStore[r]=e;var i={name:r,shader:e};
export{i as Qm};

//# debugId=5629491C5302D17564756E2164756E21
//# sourceMappingURL=site-7dda6vrw.js.map
