import{ns,_i}from"./site-tabsjb83.js";import{O,V}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class cg extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",O,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",O)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&ns(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||ns(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function ug(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",cg)}ug();
export{cg,ug};

//# debugId=07A6F0524D59CD3D64756E2164756E21
//# sourceMappingURL=site-0ke4azbp.js.map
