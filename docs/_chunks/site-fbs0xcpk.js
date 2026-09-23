import{xr as i}from"./site-rpgg5q6n.js";import{Ts as p}from"./site-ga6zz5bp.js";import{lt as s,nt as h}from"./site-rrva3mwb.js";import{hG as o}from"./site-qd0cy957.js";class u extends p{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",h),this.targetMesh=this.registerDataInput("targetMesh",s,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",s)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let m=t.out&&i(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!m&&(t.mesh===r||i(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var n=!1;function a(){if(n)return;n=!0,o("FlowGraphPointerOverEventBlock",u)}a();
export{u as do,a as eo};

//# debugId=FAAA4C662446770464756E2164756E21
//# sourceMappingURL=site-fbs0xcpk.js.map
