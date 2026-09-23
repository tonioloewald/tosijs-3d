import{xr as i}from"./site-rpgg5q6n.js";import{Ts as u}from"./site-ga6zz5bp.js";import{lt as s,nt as h}from"./site-rrva3mwb.js";import{hG as o}from"./site-qd0cy957.js";class p extends u{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",h),this.targetMesh=this.registerDataInput("targetMesh",s,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",s)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&i(e.mesh,r))&&(e.mesh===r||i(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var n=!1;function m(){if(n)return;n=!0,o("FlowGraphPointerOutEventBlock",p)}m();
export{p as fo,m as go};

//# debugId=3E50CB1FD638713A64756E2164756E21
//# sourceMappingURL=site-sx9h69bx.js.map
