import{Qe}from"./site-z8mqhr1b.js";import{R,ct}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Ad extends Qe{constructor(e){super(e);this.body=this.registerDataInput("body",R),this.velocity=this.registerDataInput("velocity",ct)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function Rd(){if(i)return;i=!0,a("FlowGraphSetLinearVelocityBlock",Ad)}Rd();
export{Ad,Rd};

//# debugId=A44DFAC254A86FD964756E2164756E21
//# sourceMappingURL=site-98ad86sb.js.map
