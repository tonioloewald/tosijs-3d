import{Ye}from"./site-yk445q08.js";import{I,k,pt}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class rm extends Ye{constructor(s){super(s);this.body=this.registerDataInput("body",I),this.mass=this.registerDataOutput("mass",k),this.centerOfMass=this.registerDataOutput("centerOfMass",pt),this.inertia=this.registerDataOutput("inertia",pt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function sm(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",rm)}sm();
export{rm,sm};

//# debugId=9ED73548F61F1D7164756E2164756E21
//# sourceMappingURL=site-trympajs.js.map
