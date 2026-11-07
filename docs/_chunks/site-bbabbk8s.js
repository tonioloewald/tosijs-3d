import{ns,_i}from"./site-ktydmw50.js";import{O,V}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class dg extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",O,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",O)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&ns(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||ns(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function fg(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",dg)}fg();
export{dg,fg};

//# debugId=E3186F6C363CF9AE64756E2164756E21
//# sourceMappingURL=site-bbabbk8s.js.map
