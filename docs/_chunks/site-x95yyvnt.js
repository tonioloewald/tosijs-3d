import{tt}from"./site-5mxcr40t.js";import{P,mt}from"./site-xahfg9zj.js";import{o}from"./site-cpxwd5wy.js";class $p extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",mt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function jp(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",$p)}jp();
export{$p,jp};

//# debugId=817EAAD77480536464756E2164756E21
//# sourceMappingURL=site-x95yyvnt.js.map
