import{DD as e}from"./site-53d1aqt6.js";var o="fluidRenderingParticleThicknessVertexShader",r=`attribute vec3 position;attribute vec2 offset;uniform mat4 view;uniform mat4 projection;uniform vec2 size;varying vec2 uv;void main(void) {vec3 cornerPos;cornerPos.xy=vec2(offset.x-0.5,offset.y-0.5)*size;cornerPos.z=0.0;vec3 viewPos=(view*vec4(position,1.0)).xyz+cornerPos;gl_Position=projection*vec4(viewPos,1.0);uv=offset;}
`;if(!e.ShadersStore[o])e.ShadersStore[o]=r;var t={name:o,shader:r};
export{t as Bg};

//# debugId=4353458ADAFFEF0C64756E2164756E21
//# sourceMappingURL=site-f1zrsn93.js.map
