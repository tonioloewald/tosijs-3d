import{ts,_i}from"./site-y503zpga.js";import{P,k}from"./site-davp9rnk.js";import{o}from"./site-rj733z8c.js";class n_ extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",k),this.targetMesh=this.registerDataInput("targetMesh",P,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",P)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&ts(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||ts(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function o_(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",n_)}o_();
export{n_,o_};

//# debugId=CCA3CEB2CEA8A1C164756E2164756E21
//# sourceMappingURL=site-y4xk79h8.js.map
