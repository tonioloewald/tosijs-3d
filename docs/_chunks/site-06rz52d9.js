import{$e}from"./site-2z9zdtr9.js";import{w,V,mt}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class hm extends $e{constructor(s){super(s);this.body=this.registerDataInput("body",w),this.mass=this.registerDataOutput("mass",V),this.centerOfMass=this.registerDataOutput("centerOfMass",mt),this.inertia=this.registerDataOutput("inertia",mt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function dm(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",hm)}dm();
export{hm,dm};

//# debugId=4483BB4A455EE3DF64756E2164756E21
//# sourceMappingURL=site-06rz52d9.js.map
