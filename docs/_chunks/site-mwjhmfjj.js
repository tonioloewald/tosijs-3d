import{Tt as v}from"./site-t4g3rna7.js";class D extends v{constructor(m){super(m);this.initPriority=0,this.type="NoTrigger",this._unregisterSignalInput("in")}deserialize(m){let q={...m};q.signalInputs=(m.signalInputs??[]).filter((C)=>C.name!=="in"),super.deserialize(q)}_execute(m){m._notifyExecuteNode(this),this.done._activateSignal(m),this.out._activateSignal(m)}_startPendingTasks(m){if(m._getExecutionVariable(this,"_initialized",!1))this._cancelPendingTasks(m),this._resetAfterCanceled(m);this._preparePendingTasks(m),m._addPendingBlock(this),m._setExecutionVariable(this,"_initialized",!0)}}
export{D as bs};

//# debugId=B3434F314CCF4E5864756E2164756E21
//# sourceMappingURL=site-mwjhmfjj.js.map
