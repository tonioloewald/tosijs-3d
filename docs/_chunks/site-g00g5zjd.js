import{Ys as n}from"./site-vc97e38v.js";import{hG as s}from"./site-qd0cy957.js";class o extends n{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function l(){if(i)return;i=!0,s("FlowGraphSequenceBlock",o)}l();
export{o as Qo,l as Ro};

//# debugId=109E228F7465AE3E64756E2164756E21
//# sourceMappingURL=site-g00g5zjd.js.map
