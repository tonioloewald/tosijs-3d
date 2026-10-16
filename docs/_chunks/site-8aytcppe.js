import{dr}from"./site-n1qmzpg8.js";import{o}from"./site-zg1n9j37.js";class P_ extends dr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function O_(){if(i)return;i=!0,o("FlowGraphSequenceBlock",P_)}O_();
export{P_,O_};

//# debugId=6A0A8067ED36225A64756E2164756E21
//# sourceMappingURL=site-8aytcppe.js.map
