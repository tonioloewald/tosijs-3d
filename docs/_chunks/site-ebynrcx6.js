import{tt}from"./site-8x68wnvm.js";import{P,V}from"./site-a1xnpyy6.js";import{o}from"./site-39snrr7g.js";class Qp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function qp(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",Qp)}qp();
export{Qp,qp};

//# debugId=2ADA0AA966F7789D64756E2164756E21
//# sourceMappingURL=site-ebynrcx6.js.map
