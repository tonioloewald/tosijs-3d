import{tt}from"./site-20s7pn47.js";import{I,k}from"./site-xbnd7pgz.js";import{o}from"./site-6g9cre7m.js";class Zp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.motionType=this.registerDataInput("motionType",k,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function Kp(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",Zp)}Kp();
export{Zp,Kp};

//# debugId=F81EEE73FF3B32FA64756E2164756E21
//# sourceMappingURL=site-pqb6d97v.js.map
