import{tt}from"./site-5tw2831p.js";import{I,pt}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class fm extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.impulse=this.registerDataInput("impulse",pt),this.location=this.registerDataInput("location",pt)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),o=this.location.getValue(t);e.applyImpulse(s,o),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function dm(){if(i)return;i=!0,a("FlowGraphApplyImpulseBlock",fm)}dm();
export{fm,dm};

//# debugId=53E355575F4CA1E164756E2164756E21
//# sourceMappingURL=site-c895k8s3.js.map
