import{H}from"./site-qpqtr54r.js";import{K,Z}from"./site-nxqqjz2z.js";var o="KHR_materials_ior";class tp{constructor(e){this.name=o,this.order=180,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,r,t){return H.LoadExtensionAsync(e,r,this.name,async(s,i)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,r,t)),n.push(this._loadIorPropertiesAsync(s,i,t)),await Promise.all(n).then(()=>{})})}_loadIorPropertiesAsync(e,r,t){let s=this._loader._getOrCreateMaterialAdapter(t),i=r.ior!==void 0?r.ior:tp._DEFAULT_IOR;return s.specularIor=i,Promise.resolve()}}tp._DEFAULT_IOR=1.5;var a=!1;function Hy(){if(a)return;a=!0,Z(o),K(o,!0,(e)=>new tp(e))}Hy();
export{tp,Hy};

//# debugId=470B595E5F8F22BD64756E2164756E21
//# sourceMappingURL=site-4p3548rr.js.map
