import{ts,_i}from"./site-bj6vxf7c.js";import{I,k}from"./site-2dj95bre.js";import{o}from"./site-b826ahhk.js";class vm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",k),this.targetMesh=this.registerDataInput("targetMesh",I,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",I)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ts(e.mesh,r))&&(e.mesh===r||ts(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function bm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",vm)}bm();
export{vm,bm};

//# debugId=6DDA4F1852B4909C64756E2164756E21
//# sourceMappingURL=site-hj2gz5rv.js.map
