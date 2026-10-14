import{fr}from"./site-y503zpga.js";import{o}from"./site-rj733z8c.js";class w_ extends fr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function M_(){if(i)return;i=!0,o("FlowGraphSequenceBlock",w_)}M_();
export{w_,M_};

//# debugId=4CBF6AB3844A5B7F64756E2164756E21
//# sourceMappingURL=site-9a60vy90.js.map
