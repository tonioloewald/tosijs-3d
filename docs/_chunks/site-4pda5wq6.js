import{mr}from"./site-v7dfb6ky.js";import{o}from"./site-eq7hsr33.js";class Pg extends mr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function Og(){if(i)return;i=!0,o("FlowGraphSequenceBlock",Pg)}Og();
export{Pg,Og};

//# debugId=285965E502EDEF2164756E2164756E21
//# sourceMappingURL=site-4pda5wq6.js.map
