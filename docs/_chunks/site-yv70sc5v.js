import{mr}from"./site-tabsjb83.js";import{o}from"./site-3k900c4f.js";class Ng extends mr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function Bg(){if(i)return;i=!0,o("FlowGraphSequenceBlock",Ng)}Bg();
export{Ng,Bg};

//# debugId=2F4D9EF8F21EF6AD64756E2164756E21
//# sourceMappingURL=site-yv70sc5v.js.map
