import{_B as b}from"./site-1q3afg48.js";var k="fluidRenderingParticleDiffusePixelShader",q=`uniform float particleAlpha;varying vec2 uv;varying vec3 diffuseColor;void main(void) {vec3 normal;normal.xy=uv*2.0-1.0;float r2=dot(normal.xy,normal.xy);if (r2>1.0) discard;glFragColor=vec4(diffuseColor,1.0);}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};
export{w as og};

//# debugId=8431C800C35AB7C764756E2164756E21
//# sourceMappingURL=site-29xqr550.js.map
