import{Vs as a}from"./site-gda1mzz6.js";import{lt as s,qt as o}from"./site-rrva3mwb.js";import{hG as i}from"./site-qd0cy957.js";class l extends a{constructor(t){super(t);this.body=this.registerDataInput("body",s),this.force=this.registerDataInput("force",o),this.location=this.registerDataInput("location",o)}_execute(t,n){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let p=this.force.getValue(t),h=this.location.getValue(t);r.applyForce(p,h),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function c(){if(e)return;e=!0,i("FlowGraphApplyForceBlock",l)}c();
export{l as hn,c as in};

//# debugId=8426044E608951E364756E2164756E21
//# sourceMappingURL=site-754a75vd.js.map
