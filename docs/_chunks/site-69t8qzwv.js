import{H}from"./site-48801y64.js";import{J,K}from"./site-5d3gdg3n.js";var o="KHR_materials_ior";class lp{constructor(e){this.name=o,this.order=180,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,r,t){return H.LoadExtensionAsync(e,r,this.name,async(s,i)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,r,t)),n.push(this._loadIorPropertiesAsync(s,i,t)),await Promise.all(n).then(()=>{})})}_loadIorPropertiesAsync(e,r,t){let s=this._loader._getOrCreateMaterialAdapter(t),i=r.ior!==void 0?r.ior:lp._DEFAULT_IOR;return s.specularIor=i,Promise.resolve()}}lp._DEFAULT_IOR=1.5;var a=!1;function iT(){if(a)return;a=!0,K(o),J(o,!0,(e)=>new lp(e))}iT();
export{lp,iT};

//# debugId=1CF737B38233BC4B64756E2164756E21
//# sourceMappingURL=site-69t8qzwv.js.map
