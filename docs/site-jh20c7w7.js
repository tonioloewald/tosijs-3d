import{Ut as q}from"./site-2z5azex9.js";class y extends q{constructor(b,d){super(b);if(this._eventsSignalOutputs={},this.done=this._registerSignalOutput("done"),d)for(let j of d)this._eventsSignalOutputs[j]=this._registerSignalOutput(j+"Event")}_executeOnTick(b){}_startPendingTasks(b){if(b._getExecutionVariable(this,"_initialized",!1))this._cancelPendingTasks(b),this._resetAfterCanceled(b);this._preparePendingTasks(b),b._addPendingBlock(this),this.out._activateSignal(b),b._setExecutionVariable(this,"_initialized",!0)}_resetAfterCanceled(b){b._deleteExecutionVariable(this,"_initialized"),b._removePendingBlock(this)}}
export{y as Tt};

//# debugId=30990AFE8B2F681B64756E2164756E21
//# sourceMappingURL=site-jh20c7w7.js.map
