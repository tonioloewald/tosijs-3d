import{le as q,ne as v}from"./site-0fbs8yt1.js";import{Ef as z,Ff as B}from"./site-em39wqsn.js";var k="KHR_texture_basisu";class D{constructor(f){this.name=k,this._loader=f,this.enabled=f.isExtensionUsed(k)}dispose(){this._loader=null}_loadTextureAsync(f,h,O){return v.LoadExtensionAsync(f,h,this.name,async(P,Q)=>{let S=h.sampler==null?v.DefaultSampler:q.Get(`${f}/sampler`,this._loader.gltf.samplers,h.sampler),V=q.Get(`${P}/source`,this._loader.gltf.images,Q.source);return await this._loader._createTextureAsync(f,S,V,(W)=>{O(W)},h._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!h._textureInfo.nonColorData)})}}var w=!1;function J(){if(w)return;w=!0,B(k),z(k,!0,(f)=>new D(f))}J();
export{D as ma,J as na};

//# debugId=BFBBCD53DC03131464756E2164756E21
//# sourceMappingURL=site-rvvjb0t9.js.map
