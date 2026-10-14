import{Ye}from"./site-y503zpga.js";import{P,k,pt}from"./site-davp9rnk.js";import{o}from"./site-rj733z8c.js";class rm extends Ye{constructor(s){super(s);this.body=this.registerDataInput("body",P),this.mass=this.registerDataOutput("mass",k),this.centerOfMass=this.registerDataOutput("centerOfMass",pt),this.inertia=this.registerDataOutput("inertia",pt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function sm(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",rm)}sm();
export{rm,sm};

//# debugId=41AE361BEB2F39C864756E2164756E21
//# sourceMappingURL=site-wyprw9jp.js.map
