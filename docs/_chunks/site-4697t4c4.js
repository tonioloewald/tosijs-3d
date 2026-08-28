import{vr as i}from"./site-d8tyq8af.js";import{Rs as p}from"./site-7aw589yr.js";import{jt as s,lt as h}from"./site-bab0thfc.js";import{fG as o}from"./site-pcap36fe.js";class u extends p{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",h),this.targetMesh=this.registerDataInput("targetMesh",s,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",s)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let m=t.out&&i(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!m&&(t.mesh===r||i(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var n=!1;function a(){if(n)return;n=!0,o("FlowGraphPointerOverEventBlock",u)}a();
export{u as bo,a as co};

//# debugId=39AE43983A577DF764756E2164756E21
//# sourceMappingURL=site-4697t4c4.js.map
