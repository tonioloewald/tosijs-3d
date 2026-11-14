import{H}from"./site-esgkawtm.js";import{K,Z}from"./site-jfk529r4.js";var o="KHR_materials_ior";class op{constructor(e){this.name=o,this.order=180,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,r,t){return H.LoadExtensionAsync(e,r,this.name,async(s,i)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,r,t)),n.push(this._loadIorPropertiesAsync(s,i,t)),await Promise.all(n).then(()=>{})})}_loadIorPropertiesAsync(e,r,t){let s=this._loader._getOrCreateMaterialAdapter(t),i=r.ior!==void 0?r.ior:op._DEFAULT_IOR;return s.specularIor=i,Promise.resolve()}}op._DEFAULT_IOR=1.5;var a=!1;function tT(){if(a)return;a=!0,Z(o),K(o,!0,(e)=>new op(e))}tT();
export{op,tT};

//# debugId=DE3964B9FA78EB3664756E2164756E21
//# sourceMappingURL=site-ypah23g2.js.map
