import{Xe}from"./site-3hzw4f8j.js";import{O,V,mt}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class nm extends Xe{constructor(s){super(s);this.body=this.registerDataInput("body",O),this.mass=this.registerDataOutput("mass",V),this.centerOfMass=this.registerDataOutput("centerOfMass",mt),this.inertia=this.registerDataOutput("inertia",mt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function om(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",nm)}om();
export{nm,om};

//# debugId=2B0850B4ABF1C0BB64756E2164756E21
//# sourceMappingURL=site-x3j8av7z.js.map
