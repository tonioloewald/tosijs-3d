import{tt}from"./site-nkyb6jj0.js";import{P,V}from"./site-9g4b0mvr.js";import{o}from"./site-1z5kawy5.js";class Qp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function qp(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",Qp)}qp();
export{Qp,qp};

//# debugId=2ADA0AA966F7789D64756E2164756E21
//# sourceMappingURL=site-t91rwc0f.js.map
