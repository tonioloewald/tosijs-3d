import{it}from"./site-v7dfb6ky.js";import{P,V}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class Qp extends it{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function qp(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",Qp)}qp();
export{Qp,qp};

//# debugId=DF8434A21F4FFCC664756E2164756E21
//# sourceMappingURL=site-q6p9hn8g.js.map
