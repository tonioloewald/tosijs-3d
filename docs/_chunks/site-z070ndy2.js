import{_B as b}from"./site-1q3afg48.js";var k="copyTexture3DLayerToTexturePixelShader",l=`precision highp sampler3D;uniform sampler3D textureSampler;uniform int layerNum;varying vec2 vUV;void main(void) {vec3 coord=vec3(0.0,0.0,float(layerNum));coord.xy=vec2(vUV.x,vUV.y)*vec2(textureSize(textureSampler,0).xy);vec3 color=texelFetch(textureSampler,ivec3(coord),0).rgb;gl_FragColor=vec4(color,1);}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=l;var v={name:k,shader:l};
export{v as ui};

//# debugId=005D006CF441A2FA64756E2164756E21
//# sourceMappingURL=site-z070ndy2.js.map
