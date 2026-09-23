import{FD as e}from"./site-vrsvvb55.js";var a="areaLightTextureProcessingPixelShader",r=`uniform sampler2D textureSampler;uniform vec2 scalingRange;varying vec2 vUV;void main(void)
{float x=(vUV.x-scalingRange.x)/(scalingRange.y-scalingRange.x);float y=(vUV.y-scalingRange.x)/(scalingRange.y-scalingRange.x);vec2 scaledUV=vec2(x,y);gl_FragColor=texture2D(textureSampler,scaledUV);}
`;if(!e.ShadersStore[a])e.ShadersStore[a]=r;var g={name:a,shader:r};
export{g as hh};

//# debugId=88C39E1FB584EE4864756E2164756E21
//# sourceMappingURL=site-9t9mftgs.js.map
