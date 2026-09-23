import{FD as r}from"./site-vrsvvb55.js";var i="lightProxyPixelShader",o=`flat varying vec2 vLimits;flat varying highp uint vMask;void main(void) {if (gl_FragCoord.y<vLimits.x || gl_FragCoord.y>vLimits.y) {discard;}
gl_FragColor=vec4(vMask,0,0,1);}
`;if(!r.ShadersStore[i])r.ShadersStore[i]=o;var t={name:i,shader:o};
export{t as Mh};

//# debugId=AF10C0FABE8D7B3A64756E2164756E21
//# sourceMappingURL=site-aqz08ffg.js.map
