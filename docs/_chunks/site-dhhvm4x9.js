import{ur}from"./site-5tw2831p.js";import{a}from"./site-2e9r9891.js";class E_ extends ur{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function A_(){if(i)return;i=!0,a("FlowGraphSequenceBlock",E_)}A_();
export{E_,A_};

//# debugId=C55027A4094B682E64756E2164756E21
//# sourceMappingURL=site-dhhvm4x9.js.map
