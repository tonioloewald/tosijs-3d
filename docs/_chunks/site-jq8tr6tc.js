import{Ts as l}from"./site-nv8skz8z.js";import{jt as r,ot as e}from"./site-bab0thfc.js";import{fG as o}from"./site-pcap36fe.js";class p extends l{constructor(t){super(t);this.body=this.registerDataInput("body",r),this.impulse=this.registerDataInput("impulse",e),this.location=this.registerDataInput("location",e)}_execute(t,h){let i=this.body.getValue(t);if(!i){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let u=this.impulse.getValue(t),c=this.location.getValue(t);i.applyImpulse(u,c),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var s=!1;function a(){if(s)return;s=!0,o("FlowGraphApplyImpulseBlock",p)}a();
export{p as hn,a as in};

//# debugId=DBE223A4BB2ED21A64756E2164756E21
//# sourceMappingURL=site-jq8tr6tc.js.map
