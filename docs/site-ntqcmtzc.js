import{du as C}from"./site-037v9pkv.js";import{ku as z,mu as A,pu as m}from"./site-5mc4escc.js";import{sE as v}from"./site-tvqrtn5a.js";class D extends C{constructor(b){super(b);this.body=this.registerDataInput("body",z),this.mass=this.registerDataOutput("mass",A),this.centerOfMass=this.registerDataOutput("centerOfMass",m),this.inertia=this.registerDataOutput("inertia",m)}_updateOutputs(b){let q=this.body.getValue(b);if(!q)return;let j=q.getMassProperties();if(j.mass!==void 0)this.mass.setValue(j.mass,b);if(j.centerOfMass)this.centerOfMass.setValue(j.centerOfMass,b);if(j.inertia)this.inertia.setValue(j.inertia,b)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var u=!1;function E(){if(u)return;u=!0,v("FlowGraphGetPhysicsMassPropertiesBlock",D)}E();
export{D as jn,E as kn};

//# debugId=22296EC43055446E64756E2164756E21
//# sourceMappingURL=site-ntqcmtzc.js.map
