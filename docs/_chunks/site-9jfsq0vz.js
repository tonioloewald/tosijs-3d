import{H}from"./site-qwzjxgka.js";import{q,Q}from"./site-538xen72.js";var o="KHR_materials_ior";class jd{constructor(e){this.name=o,this.order=180,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,r,t){return H.LoadExtensionAsync(e,r,this.name,async(s,i)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,r,t)),n.push(this._loadIorPropertiesAsync(s,i,t)),await Promise.all(n).then(()=>{})})}_loadIorPropertiesAsync(e,r,t){let s=this._loader._getOrCreateMaterialAdapter(t),i=r.ior!==void 0?r.ior:jd._DEFAULT_IOR;return s.specularIor=i,Promise.resolve()}}jd._DEFAULT_IOR=1.5;var a=!1;function T0(){if(a)return;a=!0,Q(o),q(o,!0,(e)=>new jd(e))}T0();
export{jd,T0};

//# debugId=C3B9B3B07D3BB8F064756E2164756E21
//# sourceMappingURL=site-9jfsq0vz.js.map
