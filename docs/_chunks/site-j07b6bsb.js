import{U}from"./site-xv6m73df.js";import{j,Y}from"./site-jzy5dg86.js";var o="KHR_materials_dispersion";class Ey{constructor(e){this.name=o,this.order=174,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,i){return U.LoadExtensionAsync(e,s,this.name,async(t,r)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,s,i)),n.push(this._loadDispersionPropertiesAsync(t,s,i,r)),await Promise.all(n).then(()=>{})})}_loadDispersionPropertiesAsync(e,s,i,t){let r=this._loader._getOrCreateMaterialAdapter(i);if(r.transmissionWeight==0||!t.dispersion)return Promise.resolve();return r.transmissionDispersionAbbeNumber=20,r.transmissionDispersionScale=t.dispersion,Promise.resolve()}}var a=!1;function Ay(){if(a)return;a=!0,Y(o),j(o,!0,(e)=>new Ey(e))}Ay();
export{Ey,Ay};

//# debugId=FE53CFF035D2FC9264756E2164756E21
//# sourceMappingURL=site-j07b6bsb.js.map
