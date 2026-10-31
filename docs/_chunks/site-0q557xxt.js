import{it}from"./site-3hzw4f8j.js";import{V}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class _x extends it{constructor(t){super(t);this.count=this.registerDataOutput("count",V),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function xx(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",_x)}xx();
export{_x,xx};

//# debugId=04AA7413E9AB3F5B64756E2164756E21
//# sourceMappingURL=site-0q557xxt.js.map
