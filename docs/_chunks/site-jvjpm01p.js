import{tt}from"./site-kqwawvd6.js";import{P,V}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class Zp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function Kp(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",Zp)}Kp();
export{Zp,Kp};

//# debugId=7B6AEC5389517AC764756E2164756E21
//# sourceMappingURL=site-jvjpm01p.js.map
