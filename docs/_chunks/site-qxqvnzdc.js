import{DD as e}from"./site-53d1aqt6.js";var r="meshUVSpaceRendererFinaliserVertexShader",i=`precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 worldViewProjection;varying vec2 vUV;void main() {gl_Position=worldViewProjection*vec4(position,1.0);vUV=uv;}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=i;var t={name:r,shader:i};
export{t as mh};

//# debugId=76068DC10D82F56764756E2164756E21
//# sourceMappingURL=site-qxqvnzdc.js.map
