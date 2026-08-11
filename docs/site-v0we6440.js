import{Xt as A}from"./site-n4wzvw99.js";import{sE as z}from"./site-tvqrtn5a.js";class D extends A{constructor(b){super(b);this.config=b,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(b){for(let m=0;m<this.executionSignals.length;m++)this.executionSignals[m]._activateSignal(b)}setNumberOfOutputSignals(b=1){while(this.executionSignals.length>b){let m=this.executionSignals.pop();if(m)m.disconnectFromAll(),this._unregisterSignalOutput(m.name)}while(this.executionSignals.length<b)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var v=!1;function H(){if(v)return;v=!0,z("FlowGraphSequenceBlock",D)}H();
export{D as gp,H as hp};

//# debugId=F42B2C29CF5E500564756E2164756E21
//# sourceMappingURL=site-v0we6440.js.map
