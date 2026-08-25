import{Wr as i}from"./site-gg0bpfht.js";import{bs as u}from"./site-anxkxj4p.js";import{ku as s,mu as h}from"./site-86tpqddf.js";import{sE as o}from"./site-yf4sr5jd.js";class p extends u{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",h),this.targetMesh=this.registerDataInput("targetMesh",s,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",s)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&i(e.mesh,r))&&(e.mesh===r||i(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var n=!1;function m(){if(n)return;n=!0,o("FlowGraphPointerOutEventBlock",p)}m();
export{p as An,m as Bn};

//# debugId=A97992C29BEAFE0964756E2164756E21
//# sourceMappingURL=site-8hvbxcen.js.map
