import{ns,_i}from"./site-3hzw4f8j.js";import{O,V}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class ag extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",O,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",O)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&ns(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||ns(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function lg(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",ag)}lg();
export{ag,lg};

//# debugId=79B6091F2FBC40CB64756E2164756E21
//# sourceMappingURL=site-ymd09zp4.js.map
