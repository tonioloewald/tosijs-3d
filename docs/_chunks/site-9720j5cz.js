import{DD as e}from"./site-53d1aqt6.js";var a="areaLightTextureProcessingPixelShader",r=`uniform sampler2D textureSampler;uniform vec2 scalingRange;varying vec2 vUV;void main(void)
{float x=(vUV.x-scalingRange.x)/(scalingRange.y-scalingRange.x);float y=(vUV.y-scalingRange.x)/(scalingRange.y-scalingRange.x);vec2 scaledUV=vec2(x,y);gl_FragColor=texture2D(textureSampler,scaledUV);}
`;if(!e.ShadersStore[a])e.ShadersStore[a]=r;var g={name:a,shader:r};
export{g as fh};

//# debugId=A4B8B81DEB39788E64756E2164756E21
//# sourceMappingURL=site-9720j5cz.js.map
