import{W}from"./site-a9rzktkb.js";import{Z,q}from"./site-2yemvwby.js";var o="KHR_materials_ior";class Zd{constructor(e){this.name=o,this.order=180,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,r,t){return W.LoadExtensionAsync(e,r,this.name,async(s,i)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,r,t)),n.push(this._loadIorPropertiesAsync(s,i,t)),await Promise.all(n).then(()=>{})})}_loadIorPropertiesAsync(e,r,t){let s=this._loader._getOrCreateMaterialAdapter(t),i=r.ior!==void 0?r.ior:Zd._DEFAULT_IOR;return s.specularIor=i,Promise.resolve()}}Zd._DEFAULT_IOR=1.5;var a=!1;function My(){if(a)return;a=!0,q(o),Z(o,!0,(e)=>new Zd(e))}My();
export{Zd,My};

//# debugId=4C9CA9E357356AB764756E2164756E21
//# sourceMappingURL=site-9b3eyr7v.js.map
