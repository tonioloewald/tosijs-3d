import{_B as e}from"./site-ea0e8ybd.js";var r="meshUVSpaceRendererFinaliserVertexShader",i=`precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 worldViewProjection;varying vec2 vUV;void main() {gl_Position=worldViewProjection*vec4(position,1.0);vUV=uv;}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=i;var t={name:r,shader:i};
export{t as gh};

//# debugId=AE10753568FB54B864756E2164756E21
//# sourceMappingURL=site-6hdq5sjv.js.map
