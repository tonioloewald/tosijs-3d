import{Ye}from"./site-n1qmzpg8.js";import{P,V,pt}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class tm extends Ye{constructor(s){super(s);this.body=this.registerDataInput("body",P),this.mass=this.registerDataOutput("mass",V),this.centerOfMass=this.registerDataOutput("centerOfMass",pt),this.inertia=this.registerDataOutput("inertia",pt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function im(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",tm)}im();
export{tm,im};

//# debugId=751FBE0EFAD6600364756E2164756E21
//# sourceMappingURL=site-74skmwbd.js.map
