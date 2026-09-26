import{tt}from"./site-5tw2831p.js";import{I,pt}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class Up extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.velocity=this.registerDataInput("velocity",pt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function Wp(){if(r)return;r=!0,a("FlowGraphSetAngularVelocityBlock",Up)}Wp();
export{Up,Wp};

//# debugId=DA82439065B9E56E64756E2164756E21
//# sourceMappingURL=site-np8dxkv4.js.map
