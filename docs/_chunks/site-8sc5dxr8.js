import{Br,ci}from"./site-z8mqhr1b.js";import{R,B}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class kp extends ci{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",B),this.targetMesh=this.registerDataInput("targetMesh",R,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",R)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&Br(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||Br(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function Vp(){if(s)return;s=!0,a("FlowGraphPointerOverEventBlock",kp)}Vp();
export{kp,Vp};

//# debugId=AFA17871616EA50064756E2164756E21
//# sourceMappingURL=site-8sc5dxr8.js.map
