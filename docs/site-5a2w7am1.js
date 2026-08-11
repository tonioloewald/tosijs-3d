import{_B as b}from"./site-7jxv124x.js";var k="lightProxyPixelShader",q=`flat varying vec2 vLimits;flat varying highp uint vMask;void main(void) {if (gl_FragCoord.y<vLimits.x || gl_FragCoord.y>vLimits.y) {discard;}
gl_FragColor=vec4(vMask,0,0,1);}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};
export{w as Uh};

//# debugId=DEA5D5E1A30873E464756E2164756E21
//# sourceMappingURL=site-5a2w7am1.js.map
