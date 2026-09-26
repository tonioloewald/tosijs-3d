import{ze}from"./site-z8mqhr1b.js";import{R,B,ct}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Fd extends ze{constructor(s){super(s);this.body=this.registerDataInput("body",R),this.mass=this.registerDataOutput("mass",B),this.centerOfMass=this.registerDataOutput("centerOfMass",ct),this.inertia=this.registerDataOutput("inertia",ct)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function Bd(){if(r)return;r=!0,a("FlowGraphGetPhysicsMassPropertiesBlock",Fd)}Bd();
export{Fd,Bd};

//# debugId=B34413BCA64AF8DE64756E2164756E21
//# sourceMappingURL=site-qk9y6hz6.js.map
