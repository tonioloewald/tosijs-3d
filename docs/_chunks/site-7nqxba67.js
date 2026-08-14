import{Wr as K}from"./site-cg7jrefc.js";import{bs as V}from"./site-mwjhmfjj.js";import{ku as J,mu as U}from"./site-v2rprchq.js";import{sE as Q}from"./site-c9kedmgh.js";class W extends V{constructor(q){super(q);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",U),this.targetMesh=this.registerDataInput("targetMesh",J,q?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",J)}_executeEvent(q,z){let H=this.targetMesh.getValue(q);this.meshUnderPointer.setValue(z.mesh,q);let Y=z.out&&K(z.out,H);if(this.pointerId.setValue(z.pointerId,q),!Y&&(z.mesh===H||K(z.mesh,H)))return this._execute(q),!this.config?.stopPropagation;return!0}_preparePendingTasks(q){}_cancelPendingTasks(q){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var L=!1;function X(){if(L)return;L=!0,Q("FlowGraphPointerOverEventBlock",W)}X();
export{W as Go,X as Ho};

//# debugId=984BE046F922D0D264756E2164756E21
//# sourceMappingURL=site-7nqxba67.js.map
