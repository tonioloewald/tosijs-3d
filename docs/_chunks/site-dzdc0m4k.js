import{_B as e}from"./site-ea0e8ybd.js";var a="areaLightTextureProcessingPixelShader",r=`uniform sampler2D textureSampler;uniform vec2 scalingRange;varying vec2 vUV;void main(void)
{float x=(vUV.x-scalingRange.x)/(scalingRange.y-scalingRange.x);float y=(vUV.y-scalingRange.x)/(scalingRange.y-scalingRange.x);vec2 scaledUV=vec2(x,y);gl_FragColor=texture2D(textureSampler,scaledUV);}
`;if(!e.ShadersStore[a])e.ShadersStore[a]=r;var g={name:a,shader:r};
export{g as $g};

//# debugId=5DBC20E06B74264664756E2164756E21
//# sourceMappingURL=site-dzdc0m4k.js.map
