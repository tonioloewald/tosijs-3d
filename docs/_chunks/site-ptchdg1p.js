import{Pc as c}from"./site-6056gfrr.js";import{ie as l,je as p}from"./site-87nvg6e2.js";var o="KHR_materials_ior";class s{constructor(e){this.name=o,this.order=180,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,r,t){return c.LoadExtensionAsync(e,r,this.name,async(i,n)=>{let a=[];return a.push(this._loader.loadMaterialPropertiesAsync(e,r,t)),a.push(this._loadIorPropertiesAsync(i,n,t)),await Promise.all(a).then(()=>{})})}_loadIorPropertiesAsync(e,r,t){let i=this._loader._getOrCreateMaterialAdapter(t),n=r.ior!==void 0?r.ior:s._DEFAULT_IOR;return i.specularIor=n,Promise.resolve()}}s._DEFAULT_IOR=1.5;var d=!1;function _(){if(d)return;d=!0,p(o),l(o,!0,(e)=>new s(e))}_();
export{s as Xa,_ as Ya};

//# debugId=3D52FF5E27D3EDFB64756E2164756E21
//# sourceMappingURL=site-ptchdg1p.js.map
