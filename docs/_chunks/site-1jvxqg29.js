import{_B as b}from"./site-1q3afg48.js";var f="meshUVSpaceRendererFinaliserVertexShader",k=`precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 worldViewProjection;varying vec2 vUV;void main() {gl_Position=worldViewProjection*vec4(position,1.0);vUV=uv;}
`;if(!b.ShadersStore[f])b.ShadersStore[f]=k;var w={name:f,shader:k};
export{w as gh};

//# debugId=AC0CF4CFD0454D4E64756E2164756E21
//# sourceMappingURL=site-1jvxqg29.js.map
