import{gr}from"./site-x0v5x8t1.js";import{o}from"./site-4gwmbhmj.js";class Xg extends gr{constructor(e){super(e);this.config=e,this.executionSignals=[],this.setNumberOfOutputSignals(this.config.outputSignalCount)}_execute(e){for(let t=0;t<this.executionSignals.length;t++)this.executionSignals[t]._activateSignal(e)}setNumberOfOutputSignals(e=1){while(this.executionSignals.length>e){let t=this.executionSignals.pop();if(t)t.disconnectFromAll(),this._unregisterSignalOutput(t.name)}while(this.executionSignals.length<e)this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`))}getClassName(){return"FlowGraphSequenceBlock"}}var i=!1;function $g(){if(i)return;i=!0,o("FlowGraphSequenceBlock",Xg)}$g();
export{Xg,$g};

//# debugId=E0D85C681C88A4E764756E2164756E21
//# sourceMappingURL=site-b5c5h47g.js.map
