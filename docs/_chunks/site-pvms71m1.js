import{vr as i}from"./site-d8tyq8af.js";import{Rs as u}from"./site-7aw589yr.js";import{jt as s,lt as h}from"./site-bab0thfc.js";import{fG as o}from"./site-pcap36fe.js";class p extends u{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",h),this.targetMesh=this.registerDataInput("targetMesh",s,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",s)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&i(e.mesh,r))&&(e.mesh===r||i(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var n=!1;function m(){if(n)return;n=!0,o("FlowGraphPointerOutEventBlock",p)}m();
export{p as do,m as eo};

//# debugId=D8320B3E64DDDAF964756E2164756E21
//# sourceMappingURL=site-pvms71m1.js.map
