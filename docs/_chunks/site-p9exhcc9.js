import{Ni as p}from"./site-ccybgrxs.js";import{_B as b}from"./site-1q3afg48.js";var k="iblVoxelGridPixelShader",q=`#extension GL_EXT_draw_buffers : require
precision highp float;varying vec3 vNormalizedPosition;
#include<mrtFragmentDeclaration>[MAX_DRAW_BUFFERS]
uniform float nearPlane;uniform float farPlane;uniform float stepSize;void main(void) {vec3 normPos=vNormalizedPosition.xyz;if (normPos.z<nearPlane || normPos.z>farPlane) {discard;}
glFragData[0]=normPos.z<nearPlane+stepSize ? vec4(1.0) : vec4(0.0);
#if MAX_DRAW_BUFFERS>1
glFragData[1]=normPos.z>=nearPlane+stepSize && normPos.z<nearPlane+2.0*stepSize ? vec4(1.0) : vec4(0.0);glFragData[2]=normPos.z>=nearPlane+2.0*stepSize && normPos.z<nearPlane+3.0*stepSize ? vec4(1.0) : vec4(0.0);glFragData[3]=normPos.z>=nearPlane+3.0*stepSize && normPos.z<nearPlane+4.0*stepSize ? vec4(1.0) : vec4(0.0);
#endif
#if MAX_DRAW_BUFFERS>4
glFragData[4]=normPos.z>=nearPlane+4.0*stepSize && normPos.z<nearPlane+5.0*stepSize ? vec4(1.0) : vec4(0.0);glFragData[5]=normPos.z>=nearPlane+5.0*stepSize && normPos.z<nearPlane+6.0*stepSize ? vec4(1.0) : vec4(0.0);glFragData[6]=normPos.z>=nearPlane+6.0*stepSize && normPos.z<nearPlane+7.0*stepSize ? vec4(1.0) : vec4(0.0);glFragData[7]=normPos.z>=nearPlane+7.0*stepSize && normPos.z<nearPlane+8.0*stepSize ? vec4(1.0) : vec4(0.0);
#endif
#if MAX_DRAW_BUFFERS>8
glFragData[8]=normPos.z>=nearPlane+8.0*stepSize && normPos.z<nearPlane+9.0*stepSize ? vec4(1.0) : vec4(0.0);
#endif
#if MAX_DRAW_BUFFERS>9
glFragData[9]=normPos.z>=nearPlane+9.0*stepSize && normPos.z<nearPlane+10.0*stepSize ? vec4(1.0) : vec4(0.0);
#endif
#if MAX_DRAW_BUFFERS>10
glFragData[10]=normPos.z>=nearPlane+10.0*stepSize && normPos.z<nearPlane+11.0*stepSize ? vec4(1.0) : vec4(0.0);
#endif
#if MAX_DRAW_BUFFERS>11
glFragData[11]=normPos.z>=nearPlane+11.0*stepSize && normPos.z<nearPlane+12.0*stepSize ? vec4(1.0) : vec4(0.0);
#endif
#if MAX_DRAW_BUFFERS>12
glFragData[12]=normPos.z>=nearPlane+12.0*stepSize && normPos.z<nearPlane+13.0*stepSize ? vec4(1.0) : vec4(0.0);
#endif
#if MAX_DRAW_BUFFERS>13
glFragData[13]=normPos.z>=nearPlane+13.0*stepSize && normPos.z<nearPlane+14.0*stepSize ? vec4(1.0) : vec4(0.0);
#endif
#if MAX_DRAW_BUFFERS>14
glFragData[14]=normPos.z>=nearPlane+14.0*stepSize && normPos.z<nearPlane+15.0*stepSize ? vec4(1.0) : vec4(0.0);
#endif
#if MAX_DRAW_BUFFERS>15
glFragData[15]=normPos.z>=nearPlane+15.0*stepSize && normPos.z<nearPlane+16.0*stepSize ? vec4(1.0) : vec4(0.0);
#endif
}`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var v=[p];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:k,shader:q};
export{y as li};

//# debugId=6FEDC7CF6EA4520864756E2164756E21
//# sourceMappingURL=site-p9exhcc9.js.map
