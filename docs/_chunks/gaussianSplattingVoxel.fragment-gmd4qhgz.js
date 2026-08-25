import{_B as a}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var e="gaussianSplattingVoxelPixelShader",n=`precision highp float;layout(location=0) out highp float glFragData[MAX_DRAW_BUFFERS];varying vec3 vNormalizedPosition;varying vec3 vNormalizedCenterPosition;varying float vAlpha;varying vec2 vPatchPosition;uniform float nearPlane;uniform float farPlane;uniform float stepSize;float max3(vec3 v) { return max(max(v.x,v.y),v.z); }
float prngCanonical1d(float co)
{return fract(sin(co*91.3458)*47453.5453);}
float prngCanonical2d(vec2 co)
{return fract(sin(dot(vec2(co.x,co.y),vec2(12.9898,78.233)))*43758.5453);}
float prngCanonical3d(vec3 co)
{return prngCanonical2d(vec2(co.x,co.y)+prngCanonical1d(co.z));}
void main(void) {vec3 normPos=vNormalizedPosition.xyz;if (normPos.z<nearPlane || normPos.z>farPlane) {discard;}
float distToCenter=max3(abs(vNormalizedCenterPosition-normPos));float shadowingOpacity=clamp((distToCenter<stepSize ? 1.0 : exp(-dot(vPatchPosition,vPatchPosition)))*vAlpha,0.0,1.0);if (shadowingOpacity<1.0 && shadowingOpacity<prngCanonical3d(normPos/stepSize)) {discard;}
glFragData[0]=normPos.z<nearPlane+stepSize ? 1.0 : 0.0;glFragData[1]=normPos.z>=nearPlane+stepSize && normPos.z<nearPlane+2.0*stepSize ? 1.0 : 0.0;glFragData[2]=normPos.z>=nearPlane+2.0*stepSize && normPos.z<nearPlane+3.0*stepSize ? 1.0 : 0.0;glFragData[3]=normPos.z>=nearPlane+3.0*stepSize && normPos.z<nearPlane+4.0*stepSize ? 1.0 : 0.0;
#if MAX_DRAW_BUFFERS>4
glFragData[4]=normPos.z>=nearPlane+4.0*stepSize && normPos.z<nearPlane+5.0*stepSize ? 1.0 : 0.0;glFragData[5]=normPos.z>=nearPlane+5.0*stepSize && normPos.z<nearPlane+6.0*stepSize ? 1.0 : 0.0;
#if MAX_DRAW_BUFFERS>6
glFragData[6]=normPos.z>=nearPlane+6.0*stepSize && normPos.z<nearPlane+7.0*stepSize ? 1.0 : 0.0;glFragData[7]=normPos.z>=nearPlane+7.0*stepSize && normPos.z<nearPlane+8.0*stepSize ? 1.0 : 0.0;
#endif
#endif
}`;if(!a.ShadersStore[e])a.ShadersStore[e]=n;var r={name:e,shader:n};export{r as gaussianSplattingVoxelPixelShader};

//# debugId=437970B3F34D908C64756E2164756E21
//# sourceMappingURL=gaussianSplattingVoxel.fragment-gmd4qhgz.js.map
