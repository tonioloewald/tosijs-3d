import{tt}from"./site-4r99kqsd.js";import{P,mt}from"./site-ec8w6gnd.js";import{o}from"./site-jv2cv0ev.js";class mm extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.force=this.registerDataInput("force",mt),this.location=this.registerDataInput("location",mt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function _m(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",mm)}_m();
export{mm,_m};

//# debugId=CC51630884684E7464756E2164756E21
//# sourceMappingURL=site-zc628shd.js.map
