import{tt}from"./site-4jsq7n1s.js";import{P,k}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class Zp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.motionType=this.registerDataInput("motionType",k,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function Kp(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",Zp)}Kp();
export{Zp,Kp};

//# debugId=4AA0DC4401A8438464756E2164756E21
//# sourceMappingURL=site-a9z692sw.js.map
