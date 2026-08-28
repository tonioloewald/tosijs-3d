import{Ts as s}from"./site-nv8skz8z.js";import{jt as o,ot as l}from"./site-bab0thfc.js";import{fG as r}from"./site-pcap36fe.js";class a extends s{constructor(e){super(e);this.body=this.registerDataInput("body",o),this.velocity=this.registerDataInput("velocity",l)}_execute(e,p){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function c(){if(i)return;i=!0,r("FlowGraphSetLinearVelocityBlock",a)}c();
export{a as jn,c as kn};

//# debugId=AD94181C9CB63C8064756E2164756E21
//# sourceMappingURL=site-agqg496w.js.map
