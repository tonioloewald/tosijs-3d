import{ns,_i}from"./site-ktydmw50.js";import{O,V}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Em extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",O,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",O)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ns(e.mesh,r))&&(e.mesh===r||ns(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function Rm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",Em)}Rm();
export{Em,Rm};

//# debugId=A6087C346F57AACC64756E2164756E21
//# sourceMappingURL=site-cfr32rnf.js.map
