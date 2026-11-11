import{ns,_i}from"./site-j6ranrbs.js";import{w,V}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class Rm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",w,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",w)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ns(e.mesh,r))&&(e.mesh===r||ns(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function Im(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",Rm)}Im();
export{Rm,Im};

//# debugId=B52988A08C02739564756E2164756E21
//# sourceMappingURL=site-mm98gh24.js.map
