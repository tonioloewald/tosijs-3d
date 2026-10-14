import{tt}from"./site-y503zpga.js";import{P,pt}from"./site-davp9rnk.js";import{o}from"./site-rj733z8c.js";class Qp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",pt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function qp(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",Qp)}qp();
export{Qp,qp};

//# debugId=D01A489F0265557064756E2164756E21
//# sourceMappingURL=site-sr9t3f3z.js.map
