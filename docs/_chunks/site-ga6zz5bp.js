import{Us as s}from"./site-q466xrrb.js";class a extends s{constructor(i){super(i);this.initPriority=0,this.type="NoTrigger",this._unregisterSignalInput("in")}deserialize(i){let e={...i};e.signalInputs=(i.signalInputs??[]).filter((t)=>t.name!=="in"),super.deserialize(e)}_execute(i){i._notifyExecuteNode(this),this.done._activateSignal(i),this.out._activateSignal(i)}_startPendingTasks(i){if(i._getExecutionVariable(this,"_initialized",!1))this._cancelPendingTasks(i),this._resetAfterCanceled(i);this._preparePendingTasks(i),i._addPendingBlock(this),i._setExecutionVariable(this,"_initialized",!0)}}
export{a as Ts};

//# debugId=D02B00F83A09BDC864756E2164756E21
//# sourceMappingURL=site-ga6zz5bp.js.map
