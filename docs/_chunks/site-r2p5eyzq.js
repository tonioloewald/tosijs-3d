import{Xt as n}from"./site-fss7f8pw.js";import{sE as s}from"./site-yf4sr5jd.js";class o extends n{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function l(){if(i)return;i=!0,s("FlowGraphSequenceBlock",o)}l();
export{o as gp,l as hp};

//# debugId=8BF5866E585C1DFF64756E2164756E21
//# sourceMappingURL=site-r2p5eyzq.js.map
