import{du as h}from"./site-e325gqfj.js";import{ku as o,mu as p,pu as t}from"./site-86tpqddf.js";import{sE as a}from"./site-yf4sr5jd.js";class u extends h{constructor(s){super(s);this.body=this.registerDataInput("body",o),this.mass=this.registerDataOutput("mass",p),this.centerOfMass=this.registerDataOutput("centerOfMass",t),this.inertia=this.registerDataOutput("inertia",t)}_updateOutputs(s){let r=this.body.getValue(s);if(!r)return;let e=r.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var i=!1;function c(){if(i)return;i=!0,a("FlowGraphGetPhysicsMassPropertiesBlock",u)}c();
export{u as jn,c as kn};

//# debugId=5605C94729993B6C64756E2164756E21
//# sourceMappingURL=site-60bpqew3.js.map
