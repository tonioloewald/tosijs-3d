import{_B as b}from"./site-1q3afg48.js";var k="lightProxyPixelShader",q=`flat varying vec2 vLimits;flat varying highp uint vMask;void main(void) {if (gl_FragCoord.y<vLimits.x || gl_FragCoord.y>vLimits.y) {discard;}
gl_FragColor=vec4(vMask,0,0,1);}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};
export{w as Uh};

//# debugId=A24D64CCADC3CCEB64756E2164756E21
//# sourceMappingURL=site-ct37b5pp.js.map
