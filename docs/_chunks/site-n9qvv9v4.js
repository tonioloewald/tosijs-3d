import{xD as k}from"./site-vb253sep.js";class v{static GetEffect(b){return b.getPipelineContext===void 0?b.effect:b}constructor(b,h=!0){if(this._wasPreviouslyReady=!1,this._forceRebindOnNextCall=!0,this._wasPreviouslyUsingInstances=null,this.effect=null,this.defines=null,this.drawContext=b.createDrawContext(),h)this.materialContext=b.createMaterialContext()}setEffect(b,h,q=!0){if(this.effect=b,h!==void 0)this.defines=h;if(q)this.drawContext?.reset()}dispose(b=!1){if(this.effect){let h=this.effect;if(b)h.dispose();else k.SetImmediate(()=>{h.getEngine().onEndFrameObservable.addOnce(()=>{h.dispose()})});this.effect=null}this.drawContext?.dispose()}}
export{v as VA};

//# debugId=0BF9409C114216CD64756E2164756E21
//# sourceMappingURL=site-n9qvv9v4.js.map
