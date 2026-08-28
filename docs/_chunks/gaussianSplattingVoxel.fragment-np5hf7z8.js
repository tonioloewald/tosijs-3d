import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var o="gaussianSplattingVoxelPixelShader",t=`var voxel_storage: texture_storage_3d<r8unorm,write>;varying vNormalizedPosition: vec3f;varying vNormalizedCenterPosition: vec3f;varying vAlpha: f32;varying vPatchPosition: vec2f;fn gsVoxelPrngCanonical1d(co: f32)->f32 {return fract(sin(co*91.3458)*47453.5453);}
fn gsVoxelPrngCanonical2d(co: vec2f)->f32 {return fract(sin(dot(co,vec2f(12.9898,78.233)))*43758.5453);}
fn gsVoxelPrngCanonical3d(co: vec3f)->f32 {return gsVoxelPrngCanonical2d(vec2f(co.x,co.y)+gsVoxelPrngCanonical1d(co.z));}
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {let normPos: vec3f=input.vNormalizedPosition;let stepSize: f32=1.0/f32(textureDimensions(voxel_storage).x);let diff: vec3f=abs(input.vNormalizedCenterPosition-normPos);let distToCenter: f32=max(max(diff.x,diff.y),diff.z);let gaussian: f32=exp(-dot(input.vPatchPosition,input.vPatchPosition));let shadowingOpacity: f32=clamp(
select(gaussian,1.0,distToCenter<stepSize)*input.vAlpha,
0.0,1.0
);if (shadowingOpacity<1.0 && shadowingOpacity<gsVoxelPrngCanonical3d(normPos/stepSize)) {discard;}
let size: vec3f=vec3f(textureDimensions(voxel_storage));textureStore(voxel_storage,
vec3<i32>(i32(normPos.x*size.x),i32(normPos.y*size.y),i32(normPos.z*size.z)),
vec4f(1.0,1.0,1.0,1.0));fragmentOutputs.color=vec4f(0.0,0.0,0.0,0.0);}
`;if(!e.ShadersStoreWGSL[o])e.ShadersStoreWGSL[o]=t;var i={name:o,shader:t};export{i as gaussianSplattingVoxelPixelShaderWGSL};

//# debugId=9F4ADF110FD7587564756E2164756E21
//# sourceMappingURL=gaussianSplattingVoxel.fragment-np5hf7z8.js.map
