import{hr}from"./site-c6g1b76s.js";import{a}from"./site-3ge18yeb.js";class E_ extends hr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function A_(){if(i)return;i=!0,a("FlowGraphSequenceBlock",E_)}A_();
export{E_,A_};

//# debugId=890E151936D4DD4C64756E2164756E21
//# sourceMappingURL=site-keh8yjyj.js.map
