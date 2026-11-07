import{$e}from"./site-ktydmw50.js";import{O,V,mt}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class um extends $e{constructor(s){super(s);this.body=this.registerDataInput("body",O),this.mass=this.registerDataOutput("mass",V),this.centerOfMass=this.registerDataOutput("centerOfMass",mt),this.inertia=this.registerDataOutput("inertia",mt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function hm(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",um)}hm();
export{um,hm};

//# debugId=844BDE98DE67B19964756E2164756E21
//# sourceMappingURL=site-8b2ncgq8.js.map
