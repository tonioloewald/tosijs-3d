import{du as C}from"./site-pehed6st.js";import{ku as z,mu as A,pu as m}from"./site-v2rprchq.js";import{sE as v}from"./site-c9kedmgh.js";class D extends C{constructor(b){super(b);this.body=this.registerDataInput("body",z),this.mass=this.registerDataOutput("mass",A),this.centerOfMass=this.registerDataOutput("centerOfMass",m),this.inertia=this.registerDataOutput("inertia",m)}_updateOutputs(b){let q=this.body.getValue(b);if(!q)return;let j=q.getMassProperties();if(j.mass!==void 0)this.mass.setValue(j.mass,b);if(j.centerOfMass)this.centerOfMass.setValue(j.centerOfMass,b);if(j.inertia)this.inertia.setValue(j.inertia,b)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var u=!1;function E(){if(u)return;u=!0,v("FlowGraphGetPhysicsMassPropertiesBlock",D)}E();
export{D as jn,E as kn};

//# debugId=EFEC72312C09DD6F64756E2164756E21
//# sourceMappingURL=site-xraz5azz.js.map
