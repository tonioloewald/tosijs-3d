import{et as h}from"./site-gyw9fqwj.js";import{lt as o,nt as p,qt as t}from"./site-rrva3mwb.js";import{hG as a}from"./site-qd0cy957.js";class u extends h{constructor(s){super(s);this.body=this.registerDataInput("body",o),this.mass=this.registerDataOutput("mass",p),this.centerOfMass=this.registerDataOutput("centerOfMass",t),this.inertia=this.registerDataOutput("inertia",t)}_updateOutputs(s){let r=this.body.getValue(s);if(!r)return;let e=r.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var i=!1;function c(){if(i)return;i=!0,a("FlowGraphGetPhysicsMassPropertiesBlock",u)}c();
export{u as Tm,c as Um};

//# debugId=222F7475E4AF1DC264756E2164756E21
//# sourceMappingURL=site-qrh7k6e4.js.map
