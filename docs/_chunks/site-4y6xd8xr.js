import{$e}from"./site-x0v5x8t1.js";import{w,V,mt}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class xm extends $e{constructor(s){super(s);this.body=this.registerDataInput("body",w),this.mass=this.registerDataOutput("mass",V),this.centerOfMass=this.registerDataOutput("centerOfMass",mt),this.inertia=this.registerDataOutput("inertia",mt)}_updateOutputs(s){let t=this.body.getValue(s);if(!t)return;let e=t.getMassProperties();if(e.mass!==void 0)this.mass.setValue(e.mass,s);if(e.centerOfMass)this.centerOfMass.setValue(e.centerOfMass,s);if(e.inertia)this.inertia.setValue(e.inertia,s)}getClassName(){return"FlowGraphGetPhysicsMassPropertiesBlock"}}var r=!1;function bm(){if(r)return;r=!0,o("FlowGraphGetPhysicsMassPropertiesBlock",xm)}bm();
export{xm,bm};

//# debugId=4BD2995367DA9EBA64756E2164756E21
//# sourceMappingURL=site-4y6xd8xr.js.map
