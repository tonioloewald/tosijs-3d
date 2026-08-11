import{_B as b}from"./site-7jxv124x.js";var f="meshUVSpaceRendererFinaliserVertexShader",k=`precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 worldViewProjection;varying vec2 vUV;void main() {gl_Position=worldViewProjection*vec4(position,1.0);vUV=uv;}
`;if(!b.ShadersStore[f])b.ShadersStore[f]=k;var w={name:f,shader:k};
export{w as gh};

//# debugId=94796B7645D1980A64756E2164756E21
//# sourceMappingURL=site-wbzk0k34.js.map
