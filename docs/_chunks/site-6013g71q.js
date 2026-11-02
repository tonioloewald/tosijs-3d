import{$e}from"./site-tabsjb83.js";import{O,V,mt}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class am extends $e{constructor(s){super(s);this.body=this.registerDataInput("body",O),this.mass=this.registerDataOutput("mass",V),this.centerOfMass=this.registerDataOutput("centerOfMass",mt),this.inertia=this.registerDataOutput("inertia",mt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function lm(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",am)}lm();
export{am,lm};

//# debugId=D35259E4CE289E4764756E2164756E21
//# sourceMappingURL=site-6013g71q.js.map
