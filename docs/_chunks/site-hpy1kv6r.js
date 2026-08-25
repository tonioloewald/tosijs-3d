import{Ut as s}from"./site-ktyw28d4.js";import{ku as o,pu as l}from"./site-86tpqddf.js";import{sE as i}from"./site-yf4sr5jd.js";class a extends s{constructor(t){super(t);this.body=this.registerDataInput("body",o),this.velocity=this.registerDataInput("velocity",l)}_execute(t,p){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function c(){if(r)return;r=!0,i("FlowGraphSetAngularVelocityBlock",a)}c();
export{a as bn,c as cn};

//# debugId=AD4D2BC77E1A29E364756E2164756E21
//# sourceMappingURL=site-hpy1kv6r.js.map
