import{ct as h}from"./site-vtjqk0se.js";import{jt as o,lt as p,ot as t}from"./site-bab0thfc.js";import{fG as a}from"./site-pcap36fe.js";class u extends h{constructor(s){super(s);this.body=this.registerDataInput("body",o),this.mass=this.registerDataOutput("mass",p),this.centerOfMass=this.registerDataOutput("centerOfMass",t),this.inertia=this.registerDataOutput("inertia",t)}_updateOutputs(s){let r=this.body.getValue(s);if(!r)return;let e=r.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var i=!1;function c(){if(i)return;i=!0,a("FlowGraphGetPhysicsMassPropertiesBlock",u)}c();
export{u as Rm,c as Sm};

//# debugId=4197F930278BF8E564756E2164756E21
//# sourceMappingURL=site-beer53w0.js.map
