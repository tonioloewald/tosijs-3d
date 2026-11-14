import{ns,_i}from"./site-3t3g319r.js";import{w,V}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class Mm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",w,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",w)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ns(e.mesh,r))&&(e.mesh===r||ns(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function Dm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",Mm)}Dm();
export{Mm,Dm};

//# debugId=577770A6537FDE9164756E2164756E21
//# sourceMappingURL=site-pdpg6nkh.js.map
