import{it}from"./site-j6ranrbs.js";import{w,V}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class nm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function om(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",nm)}om();
export{nm,om};

//# debugId=25B800F9DB0B5AE864756E2164756E21
//# sourceMappingURL=site-wa7eafvg.js.map
