import{it}from"./site-v7dfb6ky.js";import{P,mt}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class $p extends it{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",mt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function jp(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",$p)}jp();
export{$p,jp};

//# debugId=7C47C5386458A1FF64756E2164756E21
//# sourceMappingURL=site-krq52e3p.js.map
