import{FD as e}from"./site-vrsvvb55.js";var r="meshUVSpaceRendererPixelShader",a=`precision highp float;varying vec2 vDecalTC;uniform sampler2D textureSampler;void main(void) {if (vDecalTC.x<0. || vDecalTC.x>1. || vDecalTC.y<0. || vDecalTC.y>1.) {discard;}
gl_FragColor=texture2D(textureSampler,vDecalTC);}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=a;var t={name:r,shader:a};
export{t as lh};

//# debugId=D9D1FE43EE16E76A64756E2164756E21
//# sourceMappingURL=site-r4fw4djt.js.map
