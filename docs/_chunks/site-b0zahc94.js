import{tt}from"./site-yk445q08.js";import{k}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class mx extends tt{constructor(t){super(t);this.count=this.registerDataOutput("count",k),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function _x(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",mx)}_x();
export{mx,_x};

//# debugId=34E2EEE6994D745164756E2164756E21
//# sourceMappingURL=site-b0zahc94.js.map
