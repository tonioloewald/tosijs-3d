import{gr}from"./site-ktydmw50.js";import{o}from"./site-hcyxrnqg.js";class kg extends gr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function Vg(){if(i)return;i=!0,o("FlowGraphSequenceBlock",kg)}Vg();
export{kg,Vg};

//# debugId=8BC06E433B50194164756E2164756E21
//# sourceMappingURL=site-m0vtx9mc.js.map
