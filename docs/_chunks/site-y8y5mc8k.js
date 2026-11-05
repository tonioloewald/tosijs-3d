import{$e}from"./site-sxxg2v6h.js";import{O,V,mt}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class am extends $e{constructor(s){super(s);this.body=this.registerDataInput("body",O),this.mass=this.registerDataOutput("mass",V),this.centerOfMass=this.registerDataOutput("centerOfMass",mt),this.inertia=this.registerDataOutput("inertia",mt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function lm(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",am)}lm();
export{am,lm};

//# debugId=D35259E4CE289E4764756E2164756E21
//# sourceMappingURL=site-y8y5mc8k.js.map
