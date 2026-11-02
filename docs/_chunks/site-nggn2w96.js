import{H}from"./site-pxvpztxw.js";import{K,Z}from"./site-7tkgwrht.js";var o="KHR_materials_ior";class tp{constructor(e){this.name=o,this.order=180,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,r,t){return H.LoadExtensionAsync(e,r,this.name,async(s,i)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,r,t)),n.push(this._loadIorPropertiesAsync(s,i,t)),await Promise.all(n).then(()=>{})})}_loadIorPropertiesAsync(e,r,t){let s=this._loader._getOrCreateMaterialAdapter(t),i=r.ior!==void 0?r.ior:tp._DEFAULT_IOR;return s.specularIor=i,Promise.resolve()}}tp._DEFAULT_IOR=1.5;var a=!1;function Wy(){if(a)return;a=!0,Z(o),K(o,!0,(e)=>new tp(e))}Wy();
export{tp,Wy};

//# debugId=CA369480E1F45C5B64756E2164756E21
//# sourceMappingURL=site-nggn2w96.js.map
