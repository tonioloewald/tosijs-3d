import{U}from"./site-xv6m73df.js";import{j,Y}from"./site-jzy5dg86.js";var o="KHR_materials_ior";class Nf{constructor(e){this.name=o,this.order=180,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,r,t){return U.LoadExtensionAsync(e,r,this.name,async(s,i)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,r,t)),n.push(this._loadIorPropertiesAsync(s,i,t)),await Promise.all(n).then(()=>{})})}_loadIorPropertiesAsync(e,r,t){let s=this._loader._getOrCreateMaterialAdapter(t),i=r.ior!==void 0?r.ior:Nf._DEFAULT_IOR;return s.specularIor=i,Promise.resolve()}}Nf._DEFAULT_IOR=1.5;var a=!1;function JS(){if(a)return;a=!0,Y(o),j(o,!0,(e)=>new Nf(e))}JS();
export{Nf,JS};

//# debugId=25D0B2EECA0F3A6464756E2164756E21
//# sourceMappingURL=site-xr47rra9.js.map
