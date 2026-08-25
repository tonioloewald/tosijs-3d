import{Ut as s}from"./site-ktyw28d4.js";import{ku as o,pu as l}from"./site-86tpqddf.js";import{sE as r}from"./site-yf4sr5jd.js";class a extends s{constructor(e){super(e);this.body=this.registerDataInput("body",o),this.velocity=this.registerDataInput("velocity",l)}_execute(e,p){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function c(){if(i)return;i=!0,r("FlowGraphSetLinearVelocityBlock",a)}c();
export{a as $m,c as an};

//# debugId=01B8AFECA3CF1A5E64756E2164756E21
//# sourceMappingURL=site-nwayaza8.js.map
