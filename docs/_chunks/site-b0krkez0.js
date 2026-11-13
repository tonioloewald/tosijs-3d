import{ns,_i}from"./site-qyhmxwr1.js";import{w,V}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class Om extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",w,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",w)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&ns(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||ns(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function Pm(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",Om)}Pm();
export{Om,Pm};

//# debugId=372FD0A55D93619764756E2164756E21
//# sourceMappingURL=site-b0krkez0.js.map
