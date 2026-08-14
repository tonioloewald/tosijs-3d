import{_B as b}from"./site-1q3afg48.js";var k="meshUVSpaceRendererPixelShader",l=`precision highp float;varying vec2 vDecalTC;uniform sampler2D textureSampler;void main(void) {if (vDecalTC.x<0. || vDecalTC.x>1. || vDecalTC.y<0. || vDecalTC.y>1.) {discard;}
gl_FragColor=texture2D(textureSampler,vDecalTC);}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=l;var v={name:k,shader:l};
export{v as th};

//# debugId=56A3320BF138E20964756E2164756E21
//# sourceMappingURL=site-tr9f1mhc.js.map
