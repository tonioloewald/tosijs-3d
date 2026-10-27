import{Ye}from"./site-v7dfb6ky.js";import{P,V,mt}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class tm extends Ye{constructor(s){super(s);this.body=this.registerDataInput("body",P),this.mass=this.registerDataOutput("mass",V),this.centerOfMass=this.registerDataOutput("centerOfMass",mt),this.inertia=this.registerDataOutput("inertia",mt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function im(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",tm)}im();
export{tm,im};

//# debugId=03D6AC3D67F68CB564756E2164756E21
//# sourceMappingURL=site-jmwrswx5.js.map
