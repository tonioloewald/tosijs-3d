import{tt}from"./site-n1qmzpg8.js";import{P,V}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class Qp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function qp(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",Qp)}qp();
export{Qp,qp};

//# debugId=2ADA0AA966F7789D64756E2164756E21
//# sourceMappingURL=site-977dgzks.js.map
