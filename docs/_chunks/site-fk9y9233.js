import{Qe}from"./site-z8mqhr1b.js";import{R,ct}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Id extends Qe{constructor(t){super(t);this.body=this.registerDataInput("body",R),this.velocity=this.registerDataInput("velocity",ct)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function Pd(){if(r)return;r=!0,a("FlowGraphSetAngularVelocityBlock",Id)}Pd();
export{Id,Pd};

//# debugId=6A87C1BCDF1782BB64756E2164756E21
//# sourceMappingURL=site-fk9y9233.js.map
