import{_B as r}from"./site-ea0e8ybd.js";var i="lightProxyPixelShader",o=`flat varying vec2 vLimits;flat varying highp uint vMask;void main(void) {if (gl_FragCoord.y<vLimits.x || gl_FragCoord.y>vLimits.y) {discard;}
gl_FragColor=vec4(vMask,0,0,1);}
`;if(!r.ShadersStore[i])r.ShadersStore[i]=o;var t={name:i,shader:o};
export{t as Uh};

//# debugId=F50023AD114915C564756E2164756E21
//# sourceMappingURL=site-enye5w4e.js.map
