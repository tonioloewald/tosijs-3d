import{ns,_i}from"./site-3hzw4f8j.js";import{O,V}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Sm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",O,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",O)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ns(e.mesh,r))&&(e.mesh===r||ns(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function ym(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",Sm)}ym();
export{Sm,ym};

//# debugId=4BABC6E662F1AF6364756E2164756E21
//# sourceMappingURL=site-1690q274.js.map
