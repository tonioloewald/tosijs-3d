import{H}from"./site-qwzjxgka.js";import{q,Q}from"./site-538xen72.js";import{_}from"./site-3s8sd4v9.js";var e="KHR_texture_transform";class d0{constructor(o){this.name=e,this._loader=o,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}loadTextureInfoAsync(o,s,i){return H.LoadExtensionAsync(o,s,this.name,async(a,r)=>await this._loader.loadTextureInfoAsync(o,s,(t)=>{if(!(t instanceof _))throw Error(`${a}: Texture type not supported`);if(r.offset)t.uOffset=r.offset[0],t.vOffset=r.offset[1];if(t.uRotationCenter=0,t.vRotationCenter=0,r.rotation)t.wAng=-r.rotation;if(r.scale)t.uScale=r.scale[0],t.vScale=r.scale[1];if(r.texCoord!=null)t.coordinatesIndex=r.texCoord;i(t)}))}}var f=!1;function p0(){if(f)return;f=!0,Q(e),q(e,!0,(o)=>new d0(o))}p0();
export{d0,p0};

//# debugId=6E6EBF4E1C49647A64756E2164756E21
//# sourceMappingURL=site-w5t4093r.js.map
