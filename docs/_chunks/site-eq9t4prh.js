import{tt}from"./site-c6g1b76s.js";import{I,pt}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class Up extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.velocity=this.registerDataInput("velocity",pt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function Wp(){if(r)return;r=!0,a("FlowGraphSetAngularVelocityBlock",Up)}Wp();
export{Up,Wp};

//# debugId=DA82439065B9E56E64756E2164756E21
//# sourceMappingURL=site-eq9t4prh.js.map
