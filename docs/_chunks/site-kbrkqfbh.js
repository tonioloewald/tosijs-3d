import{Sz as i}from"./site-1n06q2g1.js";import{DD as e}from"./site-53d1aqt6.js";var o="pickingPixelShader",a=`#ifdef GPUPICKER_DEPTH
#extension GL_EXT_draw_buffers : require
#endif
#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
precision highp int;
#endif
#ifdef GPUPICKER_DEPTH
layout(location=0) out highp vec4 glFragData[2];
#endif
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
#if defined(INSTANCES)
flat varying float vMeshID;
#else
uniform float meshID;
#endif
void main(void) {float id;
#if defined(INSTANCES)
id=vMeshID;
#else
id=meshID;
#endif
#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
int castedId=int(id);vec3 color=vec3(
float((castedId>>16) & 0xFF),
float((castedId>>8) & 0xFF),
float(castedId & 0xFF)
)/255.0;
#ifdef GPUPICKER_DEPTH
glFragData[0]=vec4(color,1.0);
#ifdef GPUPICKER_PACK_DEPTH
glFragData[1]=pack(gl_FragCoord.z);
#else
glFragData[1]=vec4(gl_FragCoord.z,0.0,0.0,1.0);
#endif
#else
gl_FragColor=vec4(color,1.0);
#endif
#else
float castedId=floor(id+0.5);vec3 color=vec3(
floor(mod(castedId,16777216.0)/65536.0),
floor(mod(castedId,65536.0)/256.0),
mod(castedId,256.0)
)/255.0;
#ifdef GPUPICKER_DEPTH
glFragData[0]=vec4(color,1.0);
#ifdef GPUPICKER_PACK_DEPTH
glFragData[1]=pack(gl_FragCoord.z);
#else
glFragData[1]=vec4(gl_FragCoord.z,0.0,0.0,1.0);
#endif
#else
gl_FragColor=vec4(color,1.0);
#endif
#endif
}
`;if(!e.ShadersStore[o])e.ShadersStore[o]=a;var f=[i];for(let d of f)if(!e.IncludesShadersStore[d.name])e.IncludesShadersStore[d.name]=d.shader;var l={name:o,shader:a};
export{l as _x};

//# debugId=CD008D2FBC696C1564756E2164756E21
//# sourceMappingURL=site-kbrkqfbh.js.map
