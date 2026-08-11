import{_B as b}from"./site-7jxv124x.js";var k="meshUVSpaceRendererPixelShader",l=`precision highp float;varying vec2 vDecalTC;uniform sampler2D textureSampler;void main(void) {if (vDecalTC.x<0. || vDecalTC.x>1. || vDecalTC.y<0. || vDecalTC.y>1.) {discard;}
gl_FragColor=texture2D(textureSampler,vDecalTC);}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=l;var v={name:k,shader:l};
export{v as th};

//# debugId=7EA4B738958383E264756E2164756E21
//# sourceMappingURL=site-sz9rt8ka.js.map
