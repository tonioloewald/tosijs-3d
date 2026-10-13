import{ts,_i}from"./site-4jsq7n1s.js";import{P,k}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class vm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",k),this.targetMesh=this.registerDataInput("targetMesh",P,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",P)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ts(e.mesh,r))&&(e.mesh===r||ts(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function bm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",vm)}bm();
export{vm,bm};

//# debugId=72A6C730428A864264756E2164756E21
//# sourceMappingURL=site-4dh1jafy.js.map
