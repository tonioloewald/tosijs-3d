import{tt}from"./site-y503zpga.js";import{P,pt}from"./site-davp9rnk.js";import{o}from"./site-rj733z8c.js";class gm extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.force=this.registerDataInput("force",pt),this.location=this.registerDataInput("location",pt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function xm(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",gm)}xm();
export{gm,xm};

//# debugId=AFFE0143BBF2817664756E2164756E21
//# sourceMappingURL=site-bv9swv56.js.map
