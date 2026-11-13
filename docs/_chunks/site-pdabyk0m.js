import{it}from"./site-qyhmxwr1.js";import{V}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class Ix extends it{constructor(t){super(t);this.count=this.registerDataOutput("count",V),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function wx(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",Ix)}wx();
export{Ix,wx};

//# debugId=3A196E92384139B564756E2164756E21
//# sourceMappingURL=site-pdabyk0m.js.map
