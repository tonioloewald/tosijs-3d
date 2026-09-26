import{ae,U}from"./site-xv6m73df.js";import{j,Y}from"./site-jzy5dg86.js";var t="EXT_texture_webp";class wy{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return U.LoadExtensionAsync(e,r,this.name,async(n,i)=>{let a=r.sampler==null?U.DefaultSampler:ae.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=ae.Get(`${n}/source`,this._loader.gltf.images,i.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function Oy(){if(s)return;s=!0,Y(t),j(t,!0,(e)=>new wy(e))}Oy();
export{wy,Oy};

//# debugId=A4DBCF0AEA4802A064756E2164756E21
//# sourceMappingURL=site-0eemrwt9.js.map
