import{Vs as p}from"./site-gda1mzz6.js";import{lt as r,nt as s}from"./site-rrva3mwb.js";import{hG as i}from"./site-qd0cy957.js";class a extends p{constructor(t){super(t);this.body=this.registerDataInput("body",r),this.motionType=this.registerDataInput("motionType",s,2)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var o=!1;function h(){if(o)return;o=!0,i("FlowGraphSetPhysicsMotionTypeBlock",a)}h();
export{a as pn,h as qn};

//# debugId=7979BD92C2CE0D3864756E2164756E21
//# sourceMappingURL=site-xf2hyef9.js.map
