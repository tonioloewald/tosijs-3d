import{tt}from"./site-4jsq7n1s.js";import{P,pt}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class Qp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",pt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function qp(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",Qp)}qp();
export{Qp,qp};

//# debugId=D01A489F0265557064756E2164756E21
//# sourceMappingURL=site-sawthxct.js.map
