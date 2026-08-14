import{_B as b}from"./site-1q3afg48.js";var q="fluidRenderingParticleThicknessPixelShader",v=`uniform float particleAlpha;varying vec2 uv;void main(void) {vec3 normal;normal.xy=uv*2.0-1.0;float r2=dot(normal.xy,normal.xy);if (r2>1.0) discard;float thickness=sqrt(1.0-r2);glFragColor=vec4(vec3(particleAlpha*thickness),1.0);}
`;if(!b.ShadersStore[q])b.ShadersStore[q]=v;var x={name:q,shader:v};
export{x as wg};

//# debugId=64989DBFE641EF9364756E2164756E21
//# sourceMappingURL=site-zfh9wzew.js.map
