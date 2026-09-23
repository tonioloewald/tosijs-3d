import{FD as e}from"./site-vrsvvb55.js";var r="meshUVSpaceRendererFinaliserVertexShader",i=`precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 worldViewProjection;varying vec2 vUV;void main() {gl_Position=worldViewProjection*vec4(position,1.0);vUV=uv;}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=i;var t={name:r,shader:i};
export{t as oh};

//# debugId=F06C544DA65E73F964756E2164756E21
//# sourceMappingURL=site-zpkdq1ze.js.map
