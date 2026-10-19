import{pr}from"./site-rg764awy.js";import{o}from"./site-wv18jmj5.js";class P_ extends pr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function O_(){if(i)return;i=!0,o("FlowGraphSequenceBlock",P_)}O_();
export{P_,O_};

//# debugId=EB03B6F5C485B48464756E2164756E21
//# sourceMappingURL=site-zdx3hb1b.js.map
