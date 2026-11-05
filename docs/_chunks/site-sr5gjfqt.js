import{it}from"./site-sxxg2v6h.js";import{O,mt}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class Zp extends it{constructor(e){super(e);this.body=this.registerDataInput("body",O),this.velocity=this.registerDataInput("velocity",mt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function Kp(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",Zp)}Kp();
export{Zp,Kp};

//# debugId=349D4B80A8EF6FC064756E2164756E21
//# sourceMappingURL=site-sr5gjfqt.js.map
