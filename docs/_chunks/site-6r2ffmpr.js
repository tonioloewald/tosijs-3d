import{i}from"./site-1yf4ncc8.js";var e="lodCubePixelShader",r=`precision highp float;const float GammaEncodePowerApprox=1.0/2.2;varying vec2 vUV;uniform samplerCube textureSampler;uniform float lod;uniform int gamma;void main(void)
{vec2 uv=vUV*2.0-1.0;
#ifdef POSITIVEX
gl_FragColor=textureCube(textureSampler,vec3(1.001,uv.y,uv.x),lod);
#endif
#ifdef NEGATIVEX
gl_FragColor=textureCube(textureSampler,vec3(-1.001,uv.y,uv.x),lod);
#endif
#ifdef POSITIVEY
gl_FragColor=textureCube(textureSampler,vec3(uv.y,1.001,uv.x),lod);
#endif
#ifdef NEGATIVEY
gl_FragColor=textureCube(textureSampler,vec3(uv.y,-1.001,uv.x),lod);
#endif
#ifdef POSITIVEZ
gl_FragColor=textureCube(textureSampler,vec3(uv,1.001),lod);
#endif
#ifdef NEGATIVEZ
gl_FragColor=textureCube(textureSampler,vec3(uv,-1.001),lod);
#endif
if (gamma==0) {gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(GammaEncodePowerApprox));}}
`;if(!i.ShadersStore[e])i.ShadersStore[e]=r;var r1={name:e,shader:r};
export{r1};

//# debugId=1772726DA95BAA7B64756E2164756E21
//# sourceMappingURL=site-6r2ffmpr.js.map
