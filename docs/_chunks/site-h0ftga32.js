import{Ye}from"./site-c6g1b76s.js";import{I,k,pt}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class qp extends Ye{constructor(s){super(s);this.body=this.registerDataInput("body",I),this.mass=this.registerDataOutput("mass",k),this.centerOfMass=this.registerDataOutput("centerOfMass",pt),this.inertia=this.registerDataOutput("inertia",pt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function Zp(){if(r)return;r=!0,a("FlowGraphGetPhysicsMassPropertiesBlock",qp)}Zp();
export{qp,Zp};

//# debugId=16FAB08BDD7672DB64756E2164756E21
//# sourceMappingURL=site-h0ftga32.js.map
