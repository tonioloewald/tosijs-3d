import{tt}from"./site-4jsq7n1s.js";import{P,pt}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class gm extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.force=this.registerDataInput("force",pt),this.location=this.registerDataInput("location",pt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function xm(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",gm)}xm();
export{gm,xm};

//# debugId=AFFE0143BBF2817664756E2164756E21
//# sourceMappingURL=site-xrfzje7h.js.map
