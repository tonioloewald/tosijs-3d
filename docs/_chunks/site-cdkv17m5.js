import{tt}from"./site-rhk48zyv.js";import{P,pt}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class $p extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",pt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function jp(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",$p)}jp();
export{$p,jp};

//# debugId=F492396A8DC985A564756E2164756E21
//# sourceMappingURL=site-cdkv17m5.js.map
