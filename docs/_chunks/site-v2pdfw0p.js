import{tt}from"./site-n1qmzpg8.js";import{P,pt}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class $p extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",pt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function jp(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",$p)}jp();
export{$p,jp};

//# debugId=F492396A8DC985A564756E2164756E21
//# sourceMappingURL=site-v2pdfw0p.js.map
