import{it}from"./site-sxxg2v6h.js";import{O,mt}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class Qp extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.impulse=this.registerDataInput("impulse",mt),this.location=this.registerDataInput("location",mt)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),r=this.location.getValue(t);e.applyImpulse(s,r),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function qp(){if(i)return;i=!0,o("FlowGraphApplyImpulseBlock",Qp)}qp();
export{Qp,qp};

//# debugId=5F72740A97883E1064756E2164756E21
//# sourceMappingURL=site-nasc9wfs.js.map
