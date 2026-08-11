import{_B as b}from"./site-7jxv124x.js";var k="fluidRenderingParticleDiffusePixelShader",q=`uniform float particleAlpha;varying vec2 uv;varying vec3 diffuseColor;void main(void) {vec3 normal;normal.xy=uv*2.0-1.0;float r2=dot(normal.xy,normal.xy);if (r2>1.0) discard;glFragColor=vec4(diffuseColor,1.0);}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};
export{w as og};

//# debugId=F52916AACCF6117364756E2164756E21
//# sourceMappingURL=site-dzbcvn9y.js.map
