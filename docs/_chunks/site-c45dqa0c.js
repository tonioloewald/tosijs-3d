import{it}from"./site-3hzw4f8j.js";import{O,mt}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class bm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.force=this.registerDataInput("force",mt),this.location=this.registerDataInput("location",mt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function vm(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",bm)}vm();
export{bm,vm};

//# debugId=F76F8B8159D8E1B564756E2164756E21
//# sourceMappingURL=site-c45dqa0c.js.map
