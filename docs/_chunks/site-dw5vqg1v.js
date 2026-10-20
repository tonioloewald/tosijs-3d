import{tt}from"./site-4r99kqsd.js";import{P,mt}from"./site-ec8w6gnd.js";import{o}from"./site-jv2cv0ev.js";class $p extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",mt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function jp(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",$p)}jp();
export{$p,jp};

//# debugId=817EAAD77480536464756E2164756E21
//# sourceMappingURL=site-dw5vqg1v.js.map
