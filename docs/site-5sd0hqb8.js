import{_B as k}from"./site-7jxv124x.js";var q="iblCombineVoxelGridsPixelShader",v="precision highp float;precision highp sampler3D;varying vec2 vUV;uniform sampler3D voxelXaxisSampler;uniform sampler3D voxelYaxisSampler;uniform sampler3D voxelZaxisSampler;uniform float layer;void main(void) {vec3 coordZ=vec3(vUV.x,vUV.y,layer);float voxelZ=texture(voxelZaxisSampler,coordZ).r;vec3 coordX=vec3(1.0-layer,vUV.y,vUV.x);float voxelX=texture(voxelXaxisSampler,coordX).r;vec3 coordY=vec3(layer,vUV.x,vUV.y);float voxelY=texture(voxelYaxisSampler,coordY).r;float voxel=(voxelX>0.0 || voxelY>0.0 || voxelZ>0.0) ? 1.0 : 0.0;glFragColor=vec4(vec3(voxel),1.0);}";if(!k.ShadersStore[q])k.ShadersStore[q]=v;var y={name:q,shader:v};
export{y as wi};

//# debugId=5E597DA1C08D2F5B64756E2164756E21
//# sourceMappingURL=site-5sd0hqb8.js.map
