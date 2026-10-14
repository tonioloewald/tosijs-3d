import{ts,_i}from"./site-kqwawvd6.js";import{P,V}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class vm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",P)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ts(e.mesh,r))&&(e.mesh===r||ts(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function bm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",vm)}bm();
export{vm,bm};

//# debugId=C6A7F6AB3991A22164756E2164756E21
//# sourceMappingURL=site-6nd4hv9y.js.map
