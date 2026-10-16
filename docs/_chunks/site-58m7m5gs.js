import{Ye}from"./site-e0k6q2az.js";import{P,V,pt}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class tm extends Ye{constructor(s){super(s);this.body=this.registerDataInput("body",P),this.mass=this.registerDataOutput("mass",V),this.centerOfMass=this.registerDataOutput("centerOfMass",pt),this.inertia=this.registerDataOutput("inertia",pt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function im(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",tm)}im();
export{tm,im};

//# debugId=751FBE0EFAD6600364756E2164756E21
//# sourceMappingURL=site-58m7m5gs.js.map
