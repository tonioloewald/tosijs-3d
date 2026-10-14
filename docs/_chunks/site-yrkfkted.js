import{tt}from"./site-kqwawvd6.js";import{V}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class mx extends tt{constructor(t){super(t);this.count=this.registerDataOutput("count",V),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function _x(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",mx)}_x();
export{mx,_x};

//# debugId=25107F089F590EDB64756E2164756E21
//# sourceMappingURL=site-yrkfkted.js.map
