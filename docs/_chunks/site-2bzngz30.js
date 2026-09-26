import{ae,U}from"./site-xv6m73df.js";import{j,Y}from"./site-jzy5dg86.js";var t="EXT_texture_avif";class Py{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return U.LoadExtensionAsync(e,r,this.name,async(i,n)=>{let a=r.sampler==null?U.DefaultSampler:ae.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=ae.Get(`${i}/source`,this._loader.gltf.images,n.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function My(){if(s)return;s=!0,Y(t),j(t,!0,(e)=>new Py(e))}My();
export{Py,My};

//# debugId=6A1ED8C8E5960C8264756E2164756E21
//# sourceMappingURL=site-2bzngz30.js.map
