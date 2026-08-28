import{Ts as a}from"./site-nv8skz8z.js";import{jt as s,ot as o}from"./site-bab0thfc.js";import{fG as i}from"./site-pcap36fe.js";class l extends a{constructor(t){super(t);this.body=this.registerDataInput("body",s),this.force=this.registerDataInput("force",o),this.location=this.registerDataInput("location",o)}_execute(t,n){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let p=this.force.getValue(t),h=this.location.getValue(t);r.applyForce(p,h),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function c(){if(e)return;e=!0,i("FlowGraphApplyForceBlock",l)}c();
export{l as fn,c as gn};

//# debugId=10A181E128C6DC6664756E2164756E21
//# sourceMappingURL=site-wjdr07s4.js.map
