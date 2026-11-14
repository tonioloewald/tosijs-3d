import{it}from"./site-3t3g319r.js";import{w,V}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class um extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function hm(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",um)}hm();
export{um,hm};

//# debugId=4A417EFB06B25C2E64756E2164756E21
//# sourceMappingURL=site-56xcxxsz.js.map
