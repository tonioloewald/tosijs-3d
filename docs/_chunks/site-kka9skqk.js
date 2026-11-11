import{gr}from"./site-j6ranrbs.js";import{o}from"./site-3cf5tsfq.js";class Vg extends gr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function zg(){if(i)return;i=!0,o("FlowGraphSequenceBlock",Vg)}zg();
export{Vg,zg};

//# debugId=5E255695B67E5D1964756E2164756E21
//# sourceMappingURL=site-kka9skqk.js.map
