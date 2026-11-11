import{H}from"./site-dk4rde76.js";import{K,Z}from"./site-r7783215.js";var o="KHR_materials_ior";class np{constructor(e){this.name=o,this.order=180,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,r,t){return H.LoadExtensionAsync(e,r,this.name,async(s,i)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,r,t)),n.push(this._loadIorPropertiesAsync(s,i,t)),await Promise.all(n).then(()=>{})})}_loadIorPropertiesAsync(e,r,t){let s=this._loader._getOrCreateMaterialAdapter(t),i=r.ior!==void 0?r.ior:np._DEFAULT_IOR;return s.specularIor=i,Promise.resolve()}}np._DEFAULT_IOR=1.5;var a=!1;function qy(){if(a)return;a=!0,Z(o),K(o,!0,(e)=>new np(e))}qy();
export{np,qy};

//# debugId=D062B90EE82EC0EA64756E2164756E21
//# sourceMappingURL=site-qwwq11fy.js.map
