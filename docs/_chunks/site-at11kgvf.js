import{it}from"./site-scdwvr9t.js";import{O,mt}from"./site-cb9bs1rv.js";import{o}from"./site-qd2v2bpa.js";class Sm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.force=this.registerDataInput("force",mt),this.location=this.registerDataInput("location",mt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function ym(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",Sm)}ym();
export{Sm,ym};

//# debugId=2A26A1306AF66D5E64756E2164756E21
//# sourceMappingURL=site-at11kgvf.js.map
