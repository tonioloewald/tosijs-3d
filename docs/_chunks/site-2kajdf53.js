import{$e}from"./site-3t3g319r.js";import{w,V,mt}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class gm extends $e{constructor(s){super(s);this.body=this.registerDataInput("body",w),this.mass=this.registerDataOutput("mass",V),this.centerOfMass=this.registerDataOutput("centerOfMass",mt),this.inertia=this.registerDataOutput("inertia",mt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function _m(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",gm)}_m();
export{gm,_m};

//# debugId=E5A9351B97F704C364756E2164756E21
//# sourceMappingURL=site-2kajdf53.js.map
