import{ns,_i}from"./site-2z9zdtr9.js";import{w,V}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class fg extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",w,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",w)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&ns(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||ns(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function pg(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",fg)}pg();
export{fg,pg};

//# debugId=E9BEF53917D717C764756E2164756E21
//# sourceMappingURL=site-v37xx1aw.js.map
