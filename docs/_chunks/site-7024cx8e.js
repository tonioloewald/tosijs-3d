import{fr}from"./site-20s7pn47.js";import{o}from"./site-6g9cre7m.js";class M_ extends fr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function w_(){if(i)return;i=!0,o("FlowGraphSequenceBlock",M_)}w_();
export{M_,w_};

//# debugId=2D943E7ED129D3E764756E2164756E21
//# sourceMappingURL=site-7024cx8e.js.map
