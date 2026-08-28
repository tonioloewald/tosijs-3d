import{Ts as s}from"./site-nv8skz8z.js";class a extends s{constructor(i,e){super(i);if(this._eventsSignalOutputs={},this.done=this._registerSignalOutput("done"),e)for(let t of e)this._eventsSignalOutputs[t]=this._registerSignalOutput(t+"Event")}_executeOnTick(i){}_startPendingTasks(i){if(i._getExecutionVariable(this,"_initialized",!1))this._cancelPendingTasks(i),this._resetAfterCanceled(i);this._preparePendingTasks(i),i._addPendingBlock(this),this.out._activateSignal(i),i._setExecutionVariable(this,"_initialized",!0)}_resetAfterCanceled(i){i._deleteExecutionVariable(this,"_initialized"),i._removePendingBlock(this)}}
export{a as Ss};

//# debugId=6D22568A57226C0764756E2164756E21
//# sourceMappingURL=site-d04pwvja.js.map
