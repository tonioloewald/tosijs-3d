import{le,H}from"./site-tceyfdvy.js";import{K,Z}from"./site-jfk529r4.js";var t="EXT_texture_avif";class BT{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(i,n)=>{let a=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${i}/source`,this._loader.gltf.images,n.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function FT(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new BT(e))}FT();
export{BT,FT};

//# debugId=D395DF68D6102F3C64756E2164756E21
//# sourceMappingURL=site-jrtpmzrk.js.map
