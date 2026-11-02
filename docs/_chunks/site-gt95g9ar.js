import{it}from"./site-scdwvr9t.js";import{O,mt}from"./site-cb9bs1rv.js";import{o}from"./site-qd2v2bpa.js";class Jp extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.velocity=this.registerDataInput("velocity",mt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function em(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",Jp)}em();
export{Jp,em};

//# debugId=ECC6907A70C9461564756E2164756E21
//# sourceMappingURL=site-gt95g9ar.js.map
