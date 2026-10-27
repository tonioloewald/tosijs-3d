import{ss,_i}from"./site-v7dfb6ky.js";import{P,V}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class rg extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",P)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&ss(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||ss(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function sg(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",rg)}sg();
export{rg,sg};

//# debugId=1D80B8520725425764756E2164756E21
//# sourceMappingURL=site-87d17mm8.js.map
