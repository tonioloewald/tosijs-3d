import{ne as Q}from"./site-0fbs8yt1.js";import{Ef as J,Ff as P}from"./site-em39wqsn.js";var v="KHR_materials_ior";class w{constructor(h){this.name=v,this.order=180,this._loader=h,this.enabled=this._loader.isExtensionUsed(v)}dispose(){this._loader=null}loadMaterialPropertiesAsync(h,k,q){return Q.LoadExtensionAsync(h,k,this.name,async(z,B)=>{let D=[];return D.push(this._loader.loadMaterialPropertiesAsync(h,k,q)),D.push(this._loadIorPropertiesAsync(z,B,q)),await Promise.all(D).then(()=>{})})}_loadIorPropertiesAsync(h,k,q){let z=this._loader._getOrCreateMaterialAdapter(q),B=k.ior!==void 0?k.ior:w._DEFAULT_IOR;return z.specularIor=B,Promise.resolve()}}w._DEFAULT_IOR=1.5;var I=!1;function S(){if(I)return;I=!0,P(v),J(v,!0,(h)=>new w(h))}S();
export{w as Ka,S as La};

//# debugId=4D49EE5C37DADB8864756E2164756E21
//# sourceMappingURL=site-9kdsxnyh.js.map
