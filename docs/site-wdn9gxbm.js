import{Wr as K}from"./site-fk6vvnk0.js";import{bs as V}from"./site-1r46p0ab.js";import{ku as J,mu as U}from"./site-5mc4escc.js";import{sE as Q}from"./site-tvqrtn5a.js";class W extends V{constructor(q){super(q);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",U),this.targetMesh=this.registerDataInput("targetMesh",J,q?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",J)}_executeEvent(q,z){let H=this.targetMesh.getValue(q);if(this.meshOutOfPointer.setValue(z.mesh,q),this.pointerId.setValue(z.pointerId,q),!(z.over&&K(z.mesh,H))&&(z.mesh===H||K(z.mesh,H)))return this._execute(q),!this.config?.stopPropagation;return!0}_preparePendingTasks(q){}_cancelPendingTasks(q){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var L=!1;function X(){if(L)return;L=!0,Q("FlowGraphPointerOutEventBlock",W)}X();
export{W as An,X as Bn};

//# debugId=C382DB6C44BFC39964756E2164756E21
//# sourceMappingURL=site-wdn9gxbm.js.map
