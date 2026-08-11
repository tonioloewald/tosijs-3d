import{_B as b}from"./site-7jxv124x.js";var k="copyTexture3DLayerToTexturePixelShader",l=`precision highp sampler3D;uniform sampler3D textureSampler;uniform int layerNum;varying vec2 vUV;void main(void) {vec3 coord=vec3(0.0,0.0,float(layerNum));coord.xy=vec2(vUV.x,vUV.y)*vec2(textureSize(textureSampler,0).xy);vec3 color=texelFetch(textureSampler,ivec3(coord),0).rgb;gl_FragColor=vec4(color,1);}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=l;var v={name:k,shader:l};
export{v as ui};

//# debugId=B1316B35EBB97A7264756E2164756E21
//# sourceMappingURL=site-0zjf9hhh.js.map
