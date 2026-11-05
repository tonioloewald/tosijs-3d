import{it}from"./site-sxxg2v6h.js";import{V}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class bx extends it{constructor(t){super(t);this.count=this.registerDataOutput("count",V),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function vx(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",bx)}vx();
export{bx,vx};

//# debugId=0E46791785A61EA764756E2164756E21
//# sourceMappingURL=site-a522x8xr.js.map
