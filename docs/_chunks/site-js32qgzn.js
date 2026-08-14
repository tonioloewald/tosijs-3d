import{_B as b}from"./site-1q3afg48.js";var k="areaLightTextureProcessingPixelShader",l=`uniform sampler2D textureSampler;uniform vec2 scalingRange;varying vec2 vUV;void main(void)
{float x=(vUV.x-scalingRange.x)/(scalingRange.y-scalingRange.x);float y=(vUV.y-scalingRange.x)/(scalingRange.y-scalingRange.x);vec2 scaledUV=vec2(x,y);gl_FragColor=texture2D(textureSampler,scaledUV);}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=l;var v={name:k,shader:l};
export{v as $g};

//# debugId=3E4C90568F62C27F64756E2164756E21
//# sourceMappingURL=site-js32qgzn.js.map
