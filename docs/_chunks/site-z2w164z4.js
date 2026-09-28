import{tt}from"./site-c6g1b76s.js";import{I,pt}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class um extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.force=this.registerDataInput("force",pt),this.location=this.registerDataInput("location",pt)}_execute(t,s){let o=this.body.getValue(t);if(!o){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let e=this.force.getValue(t),i=this.location.getValue(t);o.applyForce(e,i),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var r=!1;function hm(){if(r)return;r=!0,a("FlowGraphApplyForceBlock",um)}hm();
export{um,hm};

//# debugId=5A20281B26C141B364756E2164756E21
//# sourceMappingURL=site-z2w164z4.js.map
