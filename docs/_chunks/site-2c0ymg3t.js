import{ss,_i}from"./site-v7dfb6ky.js";import{P,V}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class _m extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",P)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ss(e.mesh,r))&&(e.mesh===r||ss(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function xm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",_m)}xm();
export{_m,xm};

//# debugId=8D6DCB04735F9E9264756E2164756E21
//# sourceMappingURL=site-2c0ymg3t.js.map
