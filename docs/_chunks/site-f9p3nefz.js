import{H}from"./site-c7qw5g53.js";import{K,Z}from"./site-y5djcndq.js";var o="KHR_materials_ior";class Qf{constructor(e){this.name=o,this.order=180,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,r,t){return H.LoadExtensionAsync(e,r,this.name,async(s,i)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,r,t)),n.push(this._loadIorPropertiesAsync(s,i,t)),await Promise.all(n).then(()=>{})})}_loadIorPropertiesAsync(e,r,t){let s=this._loader._getOrCreateMaterialAdapter(t),i=r.ior!==void 0?r.ior:Qf._DEFAULT_IOR;return s.specularIor=i,Promise.resolve()}}Qf._DEFAULT_IOR=1.5;var a=!1;function I0(){if(a)return;a=!0,Z(o),K(o,!0,(e)=>new Qf(e))}I0();
export{Qf,I0};

//# debugId=4D878ABE3358E39E64756E2164756E21
//# sourceMappingURL=site-f9p3nefz.js.map
