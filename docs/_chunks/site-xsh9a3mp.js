import{DD as o}from"./site-53d1aqt6.js";var r="oitBackBlendPixelShader",e=`precision highp float;uniform sampler2D uBackColor;void main() {glFragColor=texelFetch(uBackColor,ivec2(gl_FragCoord.xy),0);if (glFragColor.a==0.0) { 
discard;}}`;if(!o.ShadersStore[r])o.ShadersStore[r]=e;var i={name:r,shader:e};
export{i as Om};

//# debugId=FBFFC43066869A7A64756E2164756E21
//# sourceMappingURL=site-xsh9a3mp.js.map
