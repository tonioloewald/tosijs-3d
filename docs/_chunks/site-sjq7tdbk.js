import{U}from"./site-xv6m73df.js";import{j,Y}from"./site-jzy5dg86.js";var r="KHR_materials_emissive_strength";class Ry{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return U.LoadExtensionAsync(e,t,this.name,async(i,n)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,n,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function Iy(){if(o)return;o=!0,Y(r),j(r,!0,(e)=>new Ry(e))}Iy();
export{Ry,Iy};

//# debugId=EF8E2F36718DE46F64756E2164756E21
//# sourceMappingURL=site-sjq7tdbk.js.map
