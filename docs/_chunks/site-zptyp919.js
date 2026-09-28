import{tt}from"./site-c6g1b76s.js";import{I,pt}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class fm extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.impulse=this.registerDataInput("impulse",pt),this.location=this.registerDataInput("location",pt)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),o=this.location.getValue(t);e.applyImpulse(s,o),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function dm(){if(i)return;i=!0,a("FlowGraphApplyImpulseBlock",fm)}dm();
export{fm,dm};

//# debugId=53E355575F4CA1E164756E2164756E21
//# sourceMappingURL=site-zptyp919.js.map
