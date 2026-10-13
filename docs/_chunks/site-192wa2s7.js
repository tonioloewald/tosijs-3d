import{tt}from"./site-2t6wdrsc.js";import{I,pt}from"./site-sy6g2f03.js";import{o}from"./site-pz63xeyn.js";class Qp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.velocity=this.registerDataInput("velocity",pt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function qp(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",Qp)}qp();
export{Qp,qp};

//# debugId=3ADC11D1656C2E3064756E2164756E21
//# sourceMappingURL=site-192wa2s7.js.map
