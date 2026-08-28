import{Ws as n}from"./site-t0y6hvhw.js";import{fG as s}from"./site-pcap36fe.js";class o extends n{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function l(){if(i)return;i=!0,s("FlowGraphSequenceBlock",o)}l();
export{o as Oo,l as Po};

//# debugId=13B35C348EBE542364756E2164756E21
//# sourceMappingURL=site-af1qw8tf.js.map
