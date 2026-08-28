import{DD as r}from"./site-53d1aqt6.js";var i="lightProxyPixelShader",o=`flat varying vec2 vLimits;flat varying highp uint vMask;void main(void) {if (gl_FragCoord.y<vLimits.x || gl_FragCoord.y>vLimits.y) {discard;}
gl_FragColor=vec4(vMask,0,0,1);}
`;if(!r.ShadersStore[i])r.ShadersStore[i]=o;var t={name:i,shader:o};
export{t as Kh};

//# debugId=45268D8A85AAAE5864756E2164756E21
//# sourceMappingURL=site-6yfn1s16.js.map
