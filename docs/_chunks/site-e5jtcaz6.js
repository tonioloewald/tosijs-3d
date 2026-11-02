import{it}from"./site-tabsjb83.js";import{O,V}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class tm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function im(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",tm)}im();
export{tm,im};

//# debugId=398874DBBED8795E64756E2164756E21
//# sourceMappingURL=site-e5jtcaz6.js.map
