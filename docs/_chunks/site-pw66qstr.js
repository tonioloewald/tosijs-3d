import{Br,ci}from"./site-z8mqhr1b.js";import{R,B}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Gp extends ci{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",B),this.targetMesh=this.registerDataInput("targetMesh",R,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",R)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&Br(e.mesh,r))&&(e.mesh===r||Br(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function zp(){if(s)return;s=!0,a("FlowGraphPointerOutEventBlock",Gp)}zp();
export{Gp,zp};

//# debugId=FDA92D2E144A910A64756E2164756E21
//# sourceMappingURL=site-pw66qstr.js.map
