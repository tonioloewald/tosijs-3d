import{_B as f}from"./site-7jxv124x.js";var k="uvAttributeDeclaration",F=`#if defined(UV{X}) && !defined(USE_VERTEX_PULLING)
attribute uv{X}: vec2f;
#endif
`;if(!f.IncludesShadersStoreWGSL[k])f.IncludesShadersStoreWGSL[k]=F;var T={name:k,shader:F};var q="prePassVertexDeclaration",G=`#ifdef PREPASS
#ifdef PREPASS_LOCAL_POSITION
varying vPosition : vec3f;
#endif
#ifdef PREPASS_DEPTH
varying vViewPos: vec3f;
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
varying vNormViewDepth: f32;
#endif
#if defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)
uniform previousViewProjection: mat4x4f;varying vCurrentPosition: vec4f;varying vPreviousPosition: vec4f;
#endif
#endif
`;if(!f.IncludesShadersStoreWGSL[q])f.IncludesShadersStoreWGSL[q]=G;var Y={name:q,shader:G};var w="samplerVertexDeclaration",H=`#if defined(_DEFINENAME_) && _DEFINENAME_DIRECTUV==0
varying v_VARYINGNAME_UV: vec2f;
#endif
`;if(!f.IncludesShadersStoreWGSL[w])f.IncludesShadersStoreWGSL[w]=H;var $={name:w,shader:H};var y="vertexPullingVertex",J=`#ifdef USE_VERTEX_PULLING
let vpVertexIndex: u32=vp_readVertexIndex(vertexInputs.vertexIndex);positionUpdated=vp_readPosition(uniforms.vp_position_info,vpVertexIndex);
#ifdef NORMAL
normalUpdated=vp_readNormal(uniforms.vp_normal_info,vpVertexIndex);
#endif
#ifdef TANGENT
tangentUpdated=vp_readTangent(uniforms.vp_tangent_info,vpVertexIndex);
#endif
#ifdef UV1
uvUpdated=vp_readUV(uniforms.vp_uv_info,vpVertexIndex);
#endif
#ifdef UV2
uv2Updated=vp_readUV2(uniforms.vp_uv2_info,vpVertexIndex);
#endif
#ifdef UV3
var uv3Updated: vec2f=vp_readUV3(uniforms.vp_uv3_info,vpVertexIndex);
#endif
#ifdef UV4
var uv4Updated: vec2f=vp_readUV4(uniforms.vp_uv4_info,vpVertexIndex);
#endif
#ifdef UV5
var uv5Updated: vec2f=vp_readUV5(uniforms.vp_uv5_info,vpVertexIndex);
#endif
#ifdef UV6
var uv6Updated: vec2f=vp_readUV6(uniforms.vp_uv6_info,vpVertexIndex);
#endif
#ifdef VERTEXCOLOR
colorUpdated=vp_readColor(uniforms.vp_color_info,vpVertexIndex);
#endif
#ifdef MORPHTARGETS
let vp_basePosition: vec3f=positionUpdated;
#ifdef NORMAL
let vp_baseNormal: vec3f=normalUpdated;
#endif
#ifdef TANGENT
let vp_baseTangent: vec4f=tangentUpdated;
#endif
#ifdef UV1
let vp_baseUV: vec2f=uvUpdated;
#endif
#ifdef UV2
let vp_baseUV2: vec2f=uv2Updated;
#endif
#ifdef VERTEXCOLOR
let vp_baseColor: vec4f=colorUpdated;
#endif
#endif
#if NUM_BONE_INFLUENCERS>0
var vp_matricesIndices: vec4f=vp_readBoneIndices(uniforms.vp_matricesIndices_info,vpVertexIndex);var vp_matricesWeights: vec4f=vp_readBoneWeights(uniforms.vp_matricesWeights_info,vpVertexIndex);
#if NUM_BONE_INFLUENCERS>4
var vp_matricesIndicesExtra: vec4f=vp_readBoneIndicesExtra(uniforms.vp_matricesIndicesExtra_info,vpVertexIndex);var vp_matricesWeightsExtra: vec4f=vp_readBoneWeightsExtra(uniforms.vp_matricesWeightsExtra_info,vpVertexIndex);
#endif
#endif
#endif
`;if(!f.IncludesShadersStoreWGSL[y])f.IncludesShadersStoreWGSL[y]=J;var b={name:y,shader:J};var z="prePassVertex",K=`#ifdef PREPASS_DEPTH
vertexOutputs.vViewPos=(scene.view*worldPos).rgb;
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
vertexOutputs.vNormViewDepth=((scene.view*worldPos).z-uniforms.cameraInfo.x)/(uniforms.cameraInfo.y-uniforms.cameraInfo.x);
#endif
#ifdef PREPASS_LOCAL_POSITION
vertexOutputs.vPosition=positionUpdated.xyz;
#endif
#if (defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)) && defined(BONES_VELOCITY_ENABLED)
vertexOutputs.vCurrentPosition=scene.viewProjection*worldPos;
#if NUM_BONE_INFLUENCERS>0
var previousInfluence: mat4x4f;previousInfluence=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[0])]*vertexInputs.matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[1])]*vertexInputs.matricesWeights[1];
#endif 
#if NUM_BONE_INFLUENCERS>2
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[2])]*vertexInputs.matricesWeights[2];
#endif 
#if NUM_BONE_INFLUENCERS>3
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[3])]*vertexInputs.matricesWeights[3];
#endif
#if NUM_BONE_INFLUENCERS>4
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[0])]*vertexInputs.matricesWeightsExtra[0];
#endif 
#if NUM_BONE_INFLUENCERS>5
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[1])]*vertexInputs.matricesWeightsExtra[1];
#endif 
#if NUM_BONE_INFLUENCERS>6
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[2])]*vertexInputs.matricesWeightsExtra[2];
#endif 
#if NUM_BONE_INFLUENCERS>7
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[3])]*vertexInputs.matricesWeightsExtra[3];
#endif
vertexOutputs.vPreviousPosition=uniforms.previousViewProjection*finalPreviousWorld*previousInfluence* vec4f(positionUpdated,1.0);
#else
vertexOutputs.vPreviousPosition=uniforms.previousViewProjection*finalPreviousWorld* vec4f(positionUpdated,1.0);
#endif
#endif
`;if(!f.IncludesShadersStoreWGSL[z])f.IncludesShadersStoreWGSL[z]=K;var D={name:z,shader:K};var B="uvVariableDeclaration",N=`#ifdef MAINUV{X}
#if !defined(UV{X})
var uv{X}: vec2f=vec2f(0.,0.);
#elif defined(USE_VERTEX_PULLING)
var uv{X}: vec2f=uv{X}Updated;
#else
var uv{X}: vec2f=vertexInputs.uv{X};
#endif
vertexOutputs.vMainUV{X}=uv{X};
#endif
`;if(!f.IncludesShadersStoreWGSL[B])f.IncludesShadersStoreWGSL[B]=N;var E={name:B,shader:N};var C="samplerVertexImplementation",O=`#if defined(_DEFINENAME_) && _DEFINENAME_DIRECTUV==0
if (uniforms.v_INFONAME_==0.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(uvUpdated,1.0,0.0)).xy;}
#ifdef UV2
else if (uniforms.v_INFONAME_==1.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(uv2Updated,1.0,0.0)).xy;}
#endif
#ifdef UV3
else if (uniforms.v_INFONAME_==2.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv3,1.0,0.0)).xy;}
#endif
#ifdef UV4
else if (uniforms.v_INFONAME_==3.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv4,1.0,0.0)).xy;}
#endif
#ifdef UV5
else if (uniforms.v_INFONAME_==4.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv5,1.0,0.0)).xy;}
#endif
#ifdef UV6
else if (uniforms.v_INFONAME_==5.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv6,1.0,0.0)).xy;}
#endif
#endif
`;if(!f.IncludesShadersStoreWGSL[C])f.IncludesShadersStoreWGSL[C]=O;var R={name:C,shader:O};
export{T as yz,Y as zz,$ as Az,b as Bz,D as Cz,E as Dz,R as Ez};

//# debugId=16DDEFDD2FD600DA64756E2164756E21
//# sourceMappingURL=site-apcxpzt3.js.map
