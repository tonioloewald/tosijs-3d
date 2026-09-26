import{Qi}from"./site-z8mqhr1b.js";import{a}from"./site-pey1240t.js";class hm extends Qi{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function fm(){if(i)return;i=!0,a("FlowGraphSequenceBlock",hm)}fm();
export{hm,fm};

//# debugId=ECDF7D4C3E0905C764756E2164756E21
//# sourceMappingURL=site-xvpafyc9.js.map
