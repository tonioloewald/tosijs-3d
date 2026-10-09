import{tt}from"./site-bj6vxf7c.js";import{I,pt}from"./site-2dj95bre.js";import{o}from"./site-b826ahhk.js";class gm extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.force=this.registerDataInput("force",pt),this.location=this.registerDataInput("location",pt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function xm(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",gm)}xm();
export{gm,xm};

//# debugId=A5B5908640246D8664756E2164756E21
//# sourceMappingURL=site-gxft9tmr.js.map
