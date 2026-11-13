import{gr}from"./site-qyhmxwr1.js";import{o}from"./site-ars0s908.js";class Hg extends gr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function Yg(){if(i)return;i=!0,o("FlowGraphSequenceBlock",Hg)}Yg();
export{Hg,Yg};

//# debugId=8B1C9A8A1D9068D664756E2164756E21
//# sourceMappingURL=site-7zse9dch.js.map
